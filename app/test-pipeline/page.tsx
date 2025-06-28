"use client";
import React, { useState, useEffect, useRef } from 'react';
import { readExcelFile, validateUrls } from '../utils/excel';

function saveScrapeResults(batchId: string, type: 'old' | 'new', results: any[]) {
  if (!batchId) return;
  localStorage.setItem(`scrape_${batchId}_${type}`, JSON.stringify(results));
}
function loadScrapeResults(batchId: string, type: 'old' | 'new') {
  if (!batchId) return [];
  try {
    return JSON.parse(localStorage.getItem(`scrape_${batchId}_${type}`) || '[]');
  } catch {
    return [];
  }
}

export default function TestPipeline() {
  const [oldUrls, setOldUrls] = useState('https://example.com/old-1\nhttps://example.com/old-2');
  const [newUrls, setNewUrls] = useState('https://example.com/new-1\nhttps://example.com/new-2');
  const [log, setLog] = useState<string[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxRows, setMaxRows] = useState<number>(2);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [analysisOld, setAnalysisOld] = useState<any[]>([]);
  const [analysisNew, setAnalysisNew] = useState<any[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [oldUploadStatus, setOldUploadStatus] = useState<string>('');
  const [newUploadStatus, setNewUploadStatus] = useState<string>('');
  const [scrapeProgress, setScrapeProgress] = useState({ old: 0, new: 0 });
  const [scrapeTotal, setScrapeTotal] = useState({ old: 0, new: 0 });
  const [scrapeEta, setScrapeEta] = useState<number | null>(null);
  const [scraping, setScraping] = useState(false);
  const scrapeStartRef = useRef<number>(0);

  const oldUrlList = oldUrls.split('\n').map(u => u.trim()).filter(Boolean);
  const newUrlList = newUrls.split('\n').map(u => u.trim()).filter(Boolean);

  const appendLog = (msg: string) => setLog(l => [...l, msg]);

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'old' | 'new') {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (type === 'old') setOldUploadStatus('Lade...');
      if (type === 'new') setNewUploadStatus('Lade...');
      const urls = validateUrls(await readExcelFile(file));
      if (type === 'old') {
        setOldUrls(urls.join('\n'));
        setOldUploadStatus('Erfolgreich geladen!');
      } else {
        setNewUrls(urls.join('\n'));
        setNewUploadStatus('Erfolgreich geladen!');
      }
    } catch {
      if (type === 'old') setOldUploadStatus('Fehler beim Laden!');
      if (type === 'new') setNewUploadStatus('Fehler beim Laden!');
    }
    setTimeout(() => {
      setOldUploadStatus('');
      setNewUploadStatus('');
    }, 2000);
  }

  async function runPipeline() {
    setLog([]);
    setRedirects([]);
    setAnalysis([]);
    setAnalysisOld([]);
    setAnalysisNew([]);
    setShowAnalysis(false);
    setScrapeProgress({ old: 0, new: 0 });
    setScrapeTotal({ old: oldUrlList.length, new: newUrlList.length });
    setScrapeEta(null);
    setScraping(true);
    scrapeStartRef.current = Date.now();
    setLoading(true);
    try {
      appendLog('1. Batch anlegen...');
      const batchRes = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: 'Test-Batch ' + new Date().toISOString(),
          oldUrls: oldUrlList,
          newUrls: newUrlList,
        })
      });
      const batchData = await batchRes.json();
      appendLog('Batch: ' + JSON.stringify(batchData));
      if (!batchData.batchId) throw new Error('Batch creation failed');
      const batchId = batchData.batchId;

      // Scraping-Queue für alt & neu
      async function scrapeQueue(urls: string[], type: 'old' | 'new', concurrency = 2) {
        let results = loadScrapeResults(batchId, type);
        let done = results.length;
        setScrapeProgress(p => ({ ...p, [type]: done }));
        setScrapeTotal(t => ({ ...t, [type]: urls.length }));
        const queue = urls.map((url, i) => ({ url, i }));
        let idx = done;
        let running = 0;
        let etaInterval: any = null;
        function updateEta() {
          const elapsed = (Date.now() - scrapeStartRef.current) / 1000;
          const left = urls.length - done;
          if (done > 0 && left > 0) {
            const avg = elapsed / done;
            setScrapeEta(Math.round(avg * left));
          } else {
            setScrapeEta(null);
          }
        }
        etaInterval = setInterval(updateEta, 1000);
        return new Promise<any[]>(resolve => {
          async function next() {
            if (done >= urls.length) {
              clearInterval(etaInterval);
              resolve(results);
              return;
            }
            while (running < concurrency && idx < urls.length) {
              const { url, i } = queue[idx++];
              running++;
              (async () => {
                const res = await fetch('/api/scrape', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url })
                });
                const data = await res.json();
                results[i] = data;
                saveScrapeResults(batchId, type, results);
                done++;
                setScrapeProgress(p => ({ ...p, [type]: done }));
                setAnalysisOld(type === 'old' ? [...results] : a => a);
                setAnalysisNew(type === 'new' ? [...results] : a => a);
                updateEta();
                running--;
                setTimeout(next, 1200); // 1.2s Pause
              })();
            }
          }
          next();
        });
      }

      appendLog('2. Scraping...');
      // Scrape alt & neu parallel (jeweils mit concurrency=2)
      const [oldResults, newResults] = await Promise.all([
        scrapeQueue(oldUrlList, 'old', 2),
        scrapeQueue(newUrlList, 'new', 2),
      ]);
      setAnalysisOld(oldResults);
      setAnalysisNew(newResults);
      setScraping(false);
      setShowAnalysis(true);
      appendLog('Scrape abgeschlossen.');

      appendLog('3. Matching...');
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const matchData = await matchRes.json();
      appendLog('Match: ' + JSON.stringify(matchData));
      if (!matchData.success) throw new Error('Matching failed');

      appendLog('4. Redirects abfragen...');
      const redirectsRes = await fetch(`/api/redirects?batchId=${batchId}`);
      const redirectsData = await redirectsRes.json();
      setRedirects(redirectsData.data || []);
      appendLog('Redirects: ' + JSON.stringify(redirectsData.data || []));
    } catch (e: any) {
      appendLog('Fehler: ' + e.message);
    } finally {
      setLoading(false);
      setScraping(false);
      setScrapeEta(null);
    }
  }

  return (
    <div style={{ width: '100vw', minHeight: '100vh', background: '#fff', padding: 0, margin: 0, boxSizing: 'border-box' }}>
      <h2 style={{ fontSize: 32, fontWeight: 800, margin: '32px 0 24px 0', textAlign: 'center', letterSpacing: '-1px' }}>Backend-Pipeline Test</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, width: '100vw' }}>
        <div style={{ flex: 1, minWidth: 0, padding: 0 }}>
          <label style={{ fontWeight: 600, marginLeft: 24 }}>Alte URLs (eine pro Zeile):</label>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ margin: '8px 0 8px 24px' }} onChange={e => handleExcelUpload(e, 'old')} />
          {oldUploadStatus && <span style={{ color: oldUploadStatus.includes('Fehler') ? '#ef4444' : '#10b981', marginLeft: 12 }}>{oldUploadStatus}</span>}
          <textarea rows={12} style={{ width: '100%', fontFamily: 'monospace', fontSize: 18, border: 'none', borderBottom: '2px solid #6366f1', borderRadius: 0, padding: 16, marginBottom: 8, background: '#f3f4f6', boxSizing: 'border-box', resize: 'vertical', minHeight: 180, maxHeight: 400, overflowY: 'auto' }} value={oldUrls} onChange={e => setOldUrls(e.target.value)} />
          <div style={{ color: '#6366f1', fontWeight: 500, marginBottom: 8, marginLeft: 24 }}>{oldUrlList.length} URLs importiert</div>
          <div style={{ background: '#f3f4f6', padding: 8, maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 16, width: '100%', borderRadius: 0, borderLeft: '4px solid #6366f1', boxSizing: 'border-box' }}>
            {oldUrlList.map((url, i) => <div key={i} style={{ whiteSpace: 'pre', overflowX: 'auto', fontSize: 16 }}>{url}</div>)}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: 0 }}>
          <label style={{ fontWeight: 600, marginLeft: 24 }}>Neue URLs (eine pro Zeile):</label>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ margin: '8px 0 8px 24px' }} onChange={e => handleExcelUpload(e, 'new')} />
          {newUploadStatus && <span style={{ color: newUploadStatus.includes('Fehler') ? '#ef4444' : '#10b981', marginLeft: 12 }}>{newUploadStatus}</span>}
          <textarea rows={12} style={{ width: '100%', fontFamily: 'monospace', fontSize: 18, border: 'none', borderBottom: '2px solid #ec4899', borderRadius: 0, padding: 16, marginBottom: 8, background: '#f3f4f6', boxSizing: 'border-box', resize: 'vertical', minHeight: 180, maxHeight: 400, overflowY: 'auto' }} value={newUrls} onChange={e => setNewUrls(e.target.value)} />
          <div style={{ color: '#ec4899', fontWeight: 500, marginBottom: 8, marginLeft: 24 }}>{newUrlList.length} URLs importiert</div>
          <div style={{ background: '#f3f4f6', padding: 8, maxHeight: 180, overflowY: 'auto', fontFamily: 'monospace', fontSize: 16, width: '100%', borderRadius: 0, borderLeft: '4px solid #ec4899', boxSizing: 'border-box' }}>
            {newUrlList.map((url, i) => <div key={i} style={{ whiteSpace: 'pre', overflowX: 'auto', fontSize: 16 }}>{url}</div>)}
          </div>
        </div>
      </div>
      <div style={{ margin: '32px 0 24px 0', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>Analysiere die ersten</label>
        <input type="number" min={1} max={oldUrlList.length} value={maxRows} onChange={e => setMaxRows(Number(e.target.value))} style={{ width: 80, fontSize: 18, borderRadius: 6, padding: 6, marginRight: 8, border: '1.5px solid #6366f1' }} />
        <span style={{ color: '#6b7280', fontSize: 18 }}>Seiten</span>
      </div>
      <div style={{ width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
        <button onClick={runPipeline} disabled={loading || scraping} style={{ padding: '18px 60px', fontSize: 22, borderRadius: 0, background: 'linear-gradient(90deg,#6366f1,#ec4899)', color: '#fff', border: 'none', fontWeight: 700, letterSpacing: 1, cursor: loading || scraping ? 'not-allowed' : 'pointer', boxShadow: '0 2px 16px #0001' }}>
          {loading || scraping ? 'Bitte warten...' : 'Pipeline testen'}
        </button>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 16, background: '#f3f4f6', borderRadius: 0, padding: 18, marginBottom: 24, minHeight: 80, maxHeight: 220, overflowY: 'auto', width: '100vw', boxSizing: 'border-box' }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {showAnalysis && (
        <div style={{ marginBottom: 32, width: '100vw', display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', textAlign: 'center', color: '#6366f1' }}>Analysierte alte URLs (max. {maxRows})</h3>
            <div style={{ background: '#f9fafb', borderRadius: 0, padding: 18, maxHeight: 340, overflowY: 'auto', fontFamily: 'monospace', fontSize: 16, width: '100%', boxSizing: 'border-box' }}>
              {analysisOld.length === 0 ? <div style={{ color: '#ef4444' }}>Keine alten URLs analysiert.</div> : analysisOld.map((u, i) => (
                <div key={u.id || i} style={{ borderBottom: '1px solid #e5e7eb', padding: 10 }}>
                  <div><b>URL:</b> {u.url}</div>
                  <div><b>Status:</b> {u.status_code}</div>
                  <div><b>Titel:</b> {u.title}</div>
                  <div><b>Meta:</b> {u.meta_description}</div>
                  <div><b>H1:</b> {u.h1_heading}</div>
                  <div><b>Main:</b> <span style={{ color: '#64748b' }}>{u.main_content?.slice(0, 200) || ''}{u.main_content && u.main_content.length > 200 ? '…' : ''}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 320 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', textAlign: 'center', color: '#ec4899' }}>Analysierte neue URLs (max. {maxRows})</h3>
            <div style={{ background: '#f9fafb', borderRadius: 0, padding: 18, maxHeight: 340, overflowY: 'auto', fontFamily: 'monospace', fontSize: 16, width: '100%', boxSizing: 'border-box' }}>
              {analysisNew.length === 0 ? <div style={{ color: '#ef4444' }}>Keine neuen URLs analysiert.</div> : analysisNew.map((u, i) => (
                <div key={u.id || i} style={{ borderBottom: '1px solid #e5e7eb', padding: 10 }}>
                  <div><b>URL:</b> {u.url}</div>
                  <div><b>Status:</b> {u.status_code}</div>
                  <div><b>Titel:</b> {u.title}</div>
                  <div><b>Meta:</b> {u.meta_description}</div>
                  <div><b>H1:</b> {u.h1_heading}</div>
                  <div><b>Main:</b> <span style={{ color: '#64748b' }}>{u.main_content?.slice(0, 200) || ''}{u.main_content && u.main_content.length > 200 ? '…' : ''}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div style={{ width: '100vw' }}>
        <b style={{ marginLeft: 24 }}>Gefundene Redirects:</b>
        <pre style={{ background: '#111827', color: '#a7f3d0', borderRadius: 0, padding: 16, fontSize: 16, minHeight: 40, maxHeight: 220, overflowY: 'auto', width: '100vw', boxSizing: 'border-box' }}>{JSON.stringify(redirects, null, 2)}</pre>
      </div>
      {(scraping || scrapeProgress.old > 0 || scrapeProgress.new > 0) && (
        <div style={{ width: '100vw', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 480, maxWidth: '90vw', background: '#f3f4f6', borderRadius: 8, overflow: 'hidden', marginBottom: 8, border: '1.5px solid #6366f1' }}>
            <div style={{ height: 18, background: '#e0e7ff', width: `${Math.round(((scrapeProgress.old + scrapeProgress.new) / (scrapeTotal.old + scrapeTotal.new || 1)) * 100)}%`, transition: 'width 0.3s', borderRadius: 8 }} />
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#6366f1', marginBottom: 2 }}>
            Scraping: {scrapeProgress.old + scrapeProgress.new} / {scrapeTotal.old + scrapeTotal.new} Seiten{scrapeEta !== null ? ` (ca. ${scrapeEta}s)` : ''}
          </div>
        </div>
      )}
    </div>
  );
} 
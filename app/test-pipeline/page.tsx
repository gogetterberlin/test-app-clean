"use client";
import React, { useState } from 'react';

export default function TestPipeline() {
  const [oldUrls, setOldUrls] = useState('https://example.com/old-1\nhttps://example.com/old-2');
  const [newUrls, setNewUrls] = useState('https://example.com/new-1\nhttps://example.com/new-2');
  const [log, setLog] = useState<string[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [maxRows, setMaxRows] = useState<number>(2);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const oldUrlList = oldUrls.split('\n').map(u => u.trim()).filter(Boolean);
  const newUrlList = newUrls.split('\n').map(u => u.trim()).filter(Boolean);

  const appendLog = (msg: string) => setLog(l => [...l, msg]);

  async function runPipeline() {
    setLog([]);
    setRedirects([]);
    setAnalysis([]);
    setShowAnalysis(false);
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

      appendLog('2. Scraping...');
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, maxRows })
      });
      const scrapeData = await scrapeRes.json();
      appendLog('Scrape: ' + JSON.stringify(scrapeData));
      if (!scrapeData.success) throw new Error('Scraping failed');

      appendLog('3. Matching...');
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId })
      });
      const matchData = await matchRes.json();
      appendLog('Match: ' + JSON.stringify(matchData));
      if (!matchData.success) throw new Error('Matching failed');

      appendLog('4. Analysierte URLs abfragen...');
      // Hole die gescrapten/analysierten URLs (maxRows, Reihenfolge wie Import)
      const urlsRes = await fetch(`/api/urls?batchId=${batchId}&type=new`);
      const urlsData = await urlsRes.json();
      setAnalysis((urlsData.data || []).slice(0, maxRows));
      setShowAnalysis(true);

      appendLog('5. Redirects abfragen...');
      const redirectsRes = await fetch(`/api/redirects?batchId=${batchId}`);
      const redirectsData = await redirectsRes.json();
      setRedirects(redirectsData.data || []);
      appendLog('Redirects: ' + JSON.stringify(redirectsData.data || []));
    } catch (e: any) {
      appendLog('Fehler: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px #0001' }}>
      <h2>Backend-Pipeline Test</h2>
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: 600 }}>Alte URLs (eine pro Zeile):</label>
          <textarea rows={8} style={{ width: '90%', fontFamily: 'monospace', fontSize: 16, borderRadius: 8, padding: 8, marginBottom: 8, maxHeight: 200, overflowY: 'auto', resize: 'vertical' }} value={oldUrls} onChange={e => setOldUrls(e.target.value)} />
          <div style={{ color: '#6366f1', fontWeight: 500, marginBottom: 8 }}>{oldUrlList.length} URLs importiert</div>
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 8, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 15, width: '90%' }}>
            {oldUrlList.map((url, i) => <div key={i} style={{ whiteSpace: 'pre', overflowX: 'auto' }}>{url}</div>)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: 600 }}>Neue URLs (eine pro Zeile):</label>
          <textarea rows={8} style={{ width: '90%', fontFamily: 'monospace', fontSize: 16, borderRadius: 8, padding: 8, marginBottom: 8, maxHeight: 200, overflowY: 'auto', resize: 'vertical' }} value={newUrls} onChange={e => setNewUrls(e.target.value)} />
          <div style={{ color: '#ec4899', fontWeight: 500, marginBottom: 8 }}>{newUrlList.length} URLs importiert</div>
          <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 8, maxHeight: 120, overflowY: 'auto', fontFamily: 'monospace', fontSize: 15, width: '90%' }}>
            {newUrlList.map((url, i) => <div key={i} style={{ whiteSpace: 'pre', overflowX: 'auto' }}>{url}</div>)}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>Analysiere die ersten</label>
        <input type="number" min={1} max={oldUrlList.length} value={maxRows} onChange={e => setMaxRows(Number(e.target.value))} style={{ width: 60, fontSize: 16, borderRadius: 6, padding: 4, marginRight: 8 }} />
        <span style={{ color: '#6b7280' }}>Seiten</span>
      </div>
      <button onClick={runPipeline} disabled={loading} style={{ padding: '14px 40px', fontSize: 20, borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', marginBottom: 32, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Bitte warten...' : 'Pipeline testen'}
      </button>
      <div style={{ fontFamily: 'monospace', fontSize: 15, background: '#f3f4f6', borderRadius: 8, padding: 14, marginBottom: 24, minHeight: 80, maxHeight: 200, overflowY: 'auto' }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      {showAnalysis && (
        <div style={{ marginBottom: 32 }}>
          <h3>Screen 2: Analysierte neue URLs (max. {maxRows})</h3>
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, maxHeight: 300, overflowY: 'auto', fontFamily: 'monospace', fontSize: 15 }}>
            {analysis.length === 0 ? <div style={{ color: '#ef4444' }}>Keine neuen URLs analysiert.</div> : analysis.map((u, i) => (
              <div key={u.id || i} style={{ borderBottom: '1px solid #e5e7eb', padding: 8 }}>
                <div><b>URL:</b> {u.url}</div>
                <div><b>Status:</b> {u.status_code}</div>
                <div><b>Titel:</b> {u.title}</div>
                <div><b>Meta:</b> {u.meta_description}</div>
                <div><b>H1:</b> {u.h1_heading}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <b>Gefundene Redirects:</b>
        <pre style={{ background: '#111827', color: '#a7f3d0', borderRadius: 8, padding: 12, fontSize: 14, minHeight: 40, maxHeight: 200, overflowY: 'auto' }}>{JSON.stringify(redirects, null, 2)}</pre>
      </div>
    </div>
  );
} 
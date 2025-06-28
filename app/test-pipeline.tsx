import React, { useState } from 'react';

export default function TestPipeline() {
  const [oldUrls, setOldUrls] = useState('https://example.com/old-1\nhttps://example.com/old-2');
  const [newUrls, setNewUrls] = useState('https://example.com/new-1\nhttps://example.com/new-2');
  const [log, setLog] = useState<string[]>([]);
  const [redirects, setRedirects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const appendLog = (msg: string) => setLog(l => [...l, msg]);

  async function runPipeline() {
    setLog([]);
    setRedirects([]);
    setLoading(true);
    try {
      appendLog('1. Batch anlegen...');
      const batchRes = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: 'Test-Batch ' + new Date().toISOString(),
          oldUrls: oldUrls.split('\n').map(u => u.trim()).filter(Boolean),
          newUrls: newUrls.split('\n').map(u => u.trim()).filter(Boolean),
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
        body: JSON.stringify({ batchId })
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

      appendLog('4. Redirects abfragen...');
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
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 12, boxShadow: '0 2px 16px #0001' }}>
      <h2>Backend-Pipeline Test</h2>
      <label style={{ fontWeight: 600 }}>Alte URLs (eine pro Zeile):</label>
      <textarea rows={4} style={{ width: '100%', marginBottom: 16 }} value={oldUrls} onChange={e => setOldUrls(e.target.value)} />
      <label style={{ fontWeight: 600 }}>Neue URLs (eine pro Zeile):</label>
      <textarea rows={4} style={{ width: '100%', marginBottom: 16 }} value={newUrls} onChange={e => setNewUrls(e.target.value)} />
      <button onClick={runPipeline} disabled={loading} style={{ padding: '12px 32px', fontSize: 18, borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', marginBottom: 24, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Bitte warten...' : 'Pipeline testen'}
      </button>
      <div style={{ fontFamily: 'monospace', fontSize: 14, background: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 16, minHeight: 80 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <div>
        <b>Gefundene Redirects:</b>
        <pre style={{ background: '#111827', color: '#a7f3d0', borderRadius: 8, padding: 12, fontSize: 13, minHeight: 40 }}>{JSON.stringify(redirects, null, 2)}</pre>
      </div>
    </div>
  );
} 
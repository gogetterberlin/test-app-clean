// Testskript für die Backend-Pipeline (Batch -> Scrape -> Match)
// Ausführen mit: node test-backend-pipeline.js
// Voraussetzung: npm install node-fetch@2

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api'; // ggf. anpassen

// Beispiel-URLs (kannst du anpassen)
const oldUrls = [
  'https://example.com/old-1',
  'https://example.com/old-2'
];
const newUrls = [
  'https://example.com/new-1',
  'https://example.com/new-2'
];

async function createBatch() {
  const res = await fetch(`${BASE_URL}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      batchName: 'Test-Batch ' + new Date().toISOString(),
      oldUrls,
      newUrls
    })
  });
  const data = await res.json();
  console.log('Batch:', data);
  if (!data.batchId) throw new Error('Batch creation failed');
  return data.batchId;
}

async function scrapeBatch(batchId) {
  const res = await fetch(`${BASE_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId })
  });
  const data = await res.json();
  console.log('Scrape:', data);
  if (!data.success) throw new Error('Scraping failed');
}

async function matchBatch(batchId) {
  const res = await fetch(`${BASE_URL}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batchId })
  });
  const data = await res.json();
  console.log('Match:', data);
  if (!data.success) throw new Error('Matching failed');
}

async function main() {
  try {
    console.log('--- Starte Backend-Pipeline-Test ---');
    const batchId = await createBatch();
    await scrapeBatch(batchId);
    await matchBatch(batchId);
    console.log('--- Test abgeschlossen! Prüfe die Datenbank (redirects) und die Server-Logs. ---');
  } catch (e) {
    console.error('Fehler im Test:', e);
  }
}

main(); 
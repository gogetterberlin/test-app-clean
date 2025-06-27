'use client';
import React, { useState } from 'react';
import { Stepper } from '../components/Stepper';
import { FileUpload } from '../components/FileUpload';
import { AnalysisStep } from '../components/AnalysisStep';
import { ResultDashboard } from '../components/ResultDashboard';
import { readExcelFile, validateUrls } from '../utils/excel';

export default function DashboardPage() {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [step, setStep] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [oldPreview, setOldPreview] = useState<string[]>([]);
  const [newPreview, setNewPreview] = useState<string[]>([]);
  const [maxRows, setMaxRows] = useState<number>(50);

  // Preview URLs after file upload
  const handleOldFile = async (file: File) => {
    setOldFile(file);
    const urls = validateUrls(await readExcelFile(file));
    setOldPreview(urls.slice(0, 10));
  };
  const handleNewFile = async (file: File) => {
    setNewFile(file);
    const urls = validateUrls(await readExcelFile(file));
    setNewPreview(urls.slice(0, 10));
  };

  const handleNext = async () => {
    if (!oldFile || !newFile) return;
    setLoading(true);
    setError(null);
    setScrapingError(null);
    setMatchingError(null);
    try {
      // Excel-Dateien parsen
      const oldUrls = validateUrls(await readExcelFile(oldFile));
      const newUrls = validateUrls(await readExcelFile(newFile));
      if (!oldUrls.length || !newUrls.length) {
        setError('Beide Excel-Dateien müssen gültige URLs enthalten.');
        setLoading(false);
        return;
      }
      // Batch anlegen via API
      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName: 'Batch ' + new Date().toISOString(), oldUrls, newUrls }),
      });
      const data = await res.json();
      if (!res.ok || !data.batchId) {
        setError(data.error || 'Fehler beim Anlegen des Batches.');
        setLoading(false);
        return;
      }
      setBatchId(data.batchId);
      // Scraping automatisch starten
      setScraping(true);
      setLoading(false);
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: data.batchId, maxRows }),
      });
      const scrapeData = await scrapeRes.json();
      setScraping(false);
      if (!scrapeRes.ok) {
        setScrapingError(scrapeData.error || 'Fehler beim Extrahieren der neuen URLs.');
        return;
      }
      // Matching starten
      setMatching(true);
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: data.batchId }),
      });
      const matchData = await matchRes.json();
      setMatching(false);
      if (!matchRes.ok) {
        setMatchingError(matchData.error || 'Fehler beim Matching.');
        return;
      }
      setStep(1);
    } catch (e: any) {
      setError('Fehler beim Verarbeiten der Dateien oder beim Anlegen des Batches.');
      setScraping(false);
      setMatching(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryScraping = async () => {
    if (!batchId) return;
    setScraping(true);
    setScrapingError(null);
    try {
      const scrapeRes = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, maxRows }),
      });
      const scrapeData = await scrapeRes.json();
      setScraping(false);
      if (!scrapeRes.ok) {
        setScrapingError(scrapeData.error || 'Fehler beim Extrahieren der neuen URLs.');
        return;
      }
      // Matching starten
      setMatching(true);
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      const matchData = await matchRes.json();
      setMatching(false);
      if (!matchRes.ok) {
        setMatchingError(matchData.error || 'Fehler beim Matching.');
        return;
      }
      setStep(1);
    } catch (e: any) {
      setScraping(false);
      setScrapingError('Fehler beim Extrahieren der neuen URLs.');
      setMatching(false);
    }
  };

  return (
    <div className="w-full px-0 md:px-0">
      <Stepper currentStep={step} />
      {step === 0 && (
        <>
          <div className="flex flex-col items-center justify-center min-h-[60vh] w-full bg-gradient-to-br from-indigo-50 via-white to-pink-50 py-12">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border border-gray-100 transition-all duration-300 hover:shadow-2xl">
                <FileUpload label="Alte URLs (Excel/CSV)" onFileAccepted={handleOldFile} />
                <div className="mt-6 w-full">
                  <div className="font-semibold text-gray-700 mb-2 text-center">Vorschau: Alte URLs</div>
                  <ul className="bg-indigo-50 rounded-xl shadow-inner p-4 border border-indigo-100 text-xs max-h-40 overflow-auto">
                    {oldPreview.length === 0 ? <li className="text-gray-400 italic">Keine Datei geladen</li> : oldPreview.map((url, i) => <li key={i} className="truncate text-indigo-700 font-mono">{url}</li>)}
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border border-gray-100 transition-all duration-300 hover:shadow-2xl">
                <FileUpload label="Neue URLs (Excel/CSV)" onFileAccepted={handleNewFile} />
                <div className="mt-6 w-full">
                  <div className="font-semibold text-gray-700 mb-2 text-center">Vorschau: Neue URLs</div>
                  <ul className="bg-pink-50 rounded-xl shadow-inner p-4 border border-pink-100 text-xs max-h-40 overflow-auto">
                    {newPreview.length === 0 ? <li className="text-gray-400 italic">Keine Datei geladen</li> : newPreview.map((url, i) => <li key={i} className="truncate text-pink-700 font-mono">{url}</li>)}
                  </ul>
                </div>
              </div>
            </div>
            {/* Zeilenlimit-Eingabe */}
            <div className="mt-10 flex items-center gap-4 w-full max-w-2xl justify-center">
              <label className="text-base font-medium text-gray-700">Analysiere die ersten</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={maxRows}
                onChange={e => setMaxRows(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-base shadow-sm transition"
              />
              <span className="text-base text-gray-500">Zeilen</span>
            </div>
            {/* Fehler & Aktionen */}
            <div className="mt-10 flex flex-col items-center w-full max-w-2xl gap-2">
              {error && <div className="text-red-600 text-base mb-2 bg-red-50 rounded-xl px-4 py-2 shadow">{error}</div>}
              {scrapingError && (
                <div className="text-red-600 text-base mb-2 bg-red-50 rounded-xl px-4 py-2 shadow flex items-center gap-2">
                  {scrapingError}
                  <button
                    className="ml-4 px-4 py-2 rounded-xl bg-indigo-100 text-indigo-600 text-sm font-semibold hover:bg-indigo-200 border border-indigo-200 transition"
                    onClick={handleRetryScraping}
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}
              {matchingError && <div className="text-red-600 text-base mb-2 bg-red-50 rounded-xl px-4 py-2 shadow">{matchingError}</div>}
              <button
                className="mt-4 px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xl font-bold shadow-xl hover:scale-105 hover:shadow-2xl transition disabled:opacity-40 disabled:scale-100"
                disabled={!oldFile || !newFile || loading || scraping || matching}
                onClick={handleNext}
              >
                {loading ? 'Batch wird angelegt…'
                  : scraping ? 'Daten werden extrahiert…'
                  : matching ? 'Matching läuft…'
                  : 'Generate Redirect Mappings'}
              </button>
            </div>
          </div>
        </>
      )}
      {step === 1 && batchId && (
        <AnalysisStep batchId={batchId} onDone={() => setStep(2)} />
      )}
      {step === 2 && (
        <ResultDashboard />
      )}
    </div>
  );
} 
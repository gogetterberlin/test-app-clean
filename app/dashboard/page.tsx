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
        body: JSON.stringify({ batchId: data.batchId }),
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
        body: JSON.stringify({ batchId }),
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
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-2 md:px-8">
            <FileUpload label="Alte URLs (Excel/CSV)" onFileAccepted={setOldFile} />
            <FileUpload label="Neue URLs (Excel/CSV)" onFileAccepted={setNewFile} />
          </div>
          <div className="mt-10 flex flex-col items-end w-full px-2 md:px-8 gap-2">
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            {scrapingError && (
              <div className="text-red-600 text-sm mb-2">
                {scrapingError}
                <button
                  className="ml-4 px-3 py-1 rounded bg-indigo-100 text-indigo-600 text-xs font-semibold hover:bg-indigo-200 border border-indigo-200"
                  onClick={handleRetryScraping}
                >
                  Erneut versuchen
                </button>
              </div>
            )}
            {matchingError && <div className="text-red-600 text-sm mb-2">{matchingError}</div>}
            <button
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow disabled:opacity-40 transition"
              disabled={!oldFile || !newFile || loading || scraping || matching}
              onClick={handleNext}
            >
              {loading ? 'Batch wird angelegt…'
                : scraping ? 'Daten werden extrahiert…'
                : matching ? 'Matching läuft…'
                : 'Weiter zur Analyse'}
            </button>
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
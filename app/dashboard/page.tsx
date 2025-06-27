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
  const [matching, setMatching] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);

  const handleNext = async () => {
    if (!oldFile || !newFile) return;
    setLoading(true);
    setError(null);
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
      setMatching(true);
      setMatchingError(null);
      const matchRes = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: data.batchId }),
      });
      const matchData = await matchRes.json();
      if (!matchRes.ok) {
        setMatchingError(matchData.error || 'Fehler beim Matching.');
        setLoading(false);
        setMatching(false);
        return;
      }
      setMatching(false);
      setStep(1);
    } catch (e: any) {
      setError('Fehler beim Verarbeiten der Dateien oder beim Anlegen des Batches.');
    } finally {
      setLoading(false);
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
            {matchingError && <div className="text-red-600 text-sm mb-2">{matchingError}</div>}
            <button
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow disabled:opacity-40 transition"
              disabled={!oldFile || !newFile || loading || matching}
              onClick={handleNext}
            >
              {loading ? 'Batch wird angelegt…' : matching ? 'Matching läuft…' : 'Weiter zur Analyse'}
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
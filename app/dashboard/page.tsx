'use client';
import React, { useState } from 'react';
import { Stepper } from '../components/Stepper';
import { FileUpload } from '../components/FileUpload';
import { AnalysisStep } from '../components/AnalysisStep';
import { ResultDashboard } from '../components/ResultDashboard';

export default function DashboardPage() {
  const [oldFile, setOldFile] = useState<File | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [step, setStep] = useState(0);

  const handleNext = () => {
    setStep(1);
  };

  return (
    <div>
      <Stepper currentStep={step} />
      {step === 0 && (
        <>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
            <FileUpload label="Alte URLs (Excel/CSV)" onFileAccepted={setOldFile} />
            <FileUpload label="Neue URLs (Excel/CSV)" onFileAccepted={setNewFile} />
          </div>
          <div className="mt-10 flex justify-end">
            <button
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow disabled:opacity-40 transition"
              disabled={!oldFile || !newFile}
              onClick={handleNext}
            >
              Weiter zur Analyse
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <AnalysisStep onDone={() => setStep(2)} />
      )}
      {step === 2 && (
        <ResultDashboard />
      )}
    </div>
  );
} 
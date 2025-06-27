"use client";
import React, { useRef, useState } from "react";
import { ArrowUpTrayIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  label: string;
  onFileAccepted: (file: File) => void;
  acceptedTypes?: string;
}

export function FileUpload({ label, onFileAccepted, acceptedTypes = '.xlsx,.xls,.csv' }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleFile = (file: File) => {
    if (!file) return;
    if (!acceptedTypes.split(',').some(type => file.name.endsWith(type.trim()))) {
      setError('Nur Excel- oder CSV-Dateien erlaubt');
      setStatus('error');
      return;
    }
    setFile(file);
    setStatus('loading');
    setError(null);
    setTimeout(() => {
      setStatus('success');
      onFileAccepted(file);
    }, 800); // Simuliertes Laden
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    handleFile(selectedFile!);
  };

  const removeFile = () => {
    setFile(null);
    setStatus('idle');
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 w-full min-h-[160px] transition-all duration-300 cursor-pointer bg-white hover:shadow-lg ${
        status === 'error' ? 'border-red-400 bg-red-50' : status === 'success' ? 'border-green-400 bg-green-50' : 'border-gray-200'
      }`}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {!file && (
        <>
          <ArrowUpTrayIcon className="w-10 h-10 text-indigo-400 mb-2 animate-bounce" />
          <span className="font-medium text-gray-700 mb-1">{label}</span>
          <span className="text-xs text-gray-400">Excel oder CSV per Klick oder Drag&Drop</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        className="hidden"
        onChange={handleChange}
      />
      {file && (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <span className="truncate max-w-[160px] text-sm font-medium text-gray-700">{file.name}</span>
            <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeFile(); }}
              className="ml-2 p-1 rounded hover:bg-gray-100 transition"
              aria-label="Datei entfernen"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {status === 'loading' && <span className="flex items-center gap-1 text-xs text-indigo-500 animate-pulse"><ArrowUpTrayIcon className="w-4 h-4" /> Hochladen...</span>}
          {status === 'success' && <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircleIcon className="w-4 h-4" /> Erfolgreich hochgeladen</span>}
          {status === 'error' && <span className="flex items-center gap-1 text-xs text-red-600"><ExclamationCircleIcon className="w-4 h-4" /> {error}</span>}
        </div>
      )}
    </div>
  );
}

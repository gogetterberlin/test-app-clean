"use client";
import React, { useRef, useState } from "react";
import { readExcelFile, validateUrls } from "../utils/excel";
import FilePreview from "./FilePreview";

type FileUploadProps = {
  label: string;
  onFileLoaded: (urls: string[]) => void;
};

export default function FileUpload({ label, onFileLoaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    try {
      const urls = await readExcelFile(file);
      const validUrls = validateUrls(urls);
      setPreview(validUrls.slice(0, 5));
      onFileLoaded(validUrls);
      setError(null);
    } catch (e) {
      setError("Invalid file or format.");
    }
  };

  return (
    <div className="border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-xl p-6 flex flex-col items-center bg-slate-50 dark:bg-slate-800 shadow-md transition-all duration-150">
      <label className="mb-2 font-semibold text-indigo-700 dark:text-indigo-300">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
        }}
      />
      <button
        className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow transition-all duration-150 mt-2"
        onClick={() => inputRef.current?.click()}
      >
        Datei auswählen
      </button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <FilePreview urls={preview} />
    </div>
  );
}

"use client";
import Image from "next/image";
import styles from "./page.module.css";
import FileUpload from "./components/FileUpload";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase/client";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { readExcelFile, validateUrls } from "./utils/excel";

const TABS = [
  { key: "upload", label: "Upload & Start" },
  { key: "analyse", label: "Analyse" },
  { key: "result", label: "Ergebnis" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("upload");
  const [oldUrls, setOldUrls] = useState<string[]>([]);
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [maxRows, setMaxRows] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapingDone, setScrapingDone] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchingDone, setMatchingDone] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [resultTab, setResultTab] = useState("mapping");
  const [redirects, setRedirects] = useState<any[]>([]);
  const [oldUrlDetails, setOldUrlDetails] = useState<any[]>([]);
  const [newUrlDetails, setNewUrlDetails] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  // Drag&Drop States
  const [dragActiveOld, setDragActiveOld] = useState(false);
  const [dragActiveNew, setDragActiveNew] = useState(false);
  const oldInputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const handleStartBatch = async () => {
    setFeedback(null);
    setScraping(false);
    setScrapingDone(false);
    setScrapingError(null);
    setMatching(false);
    setMatchingDone(false);
    setMatchingError(null);
    if (!batchName.trim()) {
      setFeedback("Bitte einen Batch-Namen eingeben.");
      return;
    }
    if (!oldUrls.length || !newUrls.length) {
      setFeedback("Bitte beide Excel-Dateien hochladen.");
      return;
    }
    setLoading(true);
    try {
      setActiveTab("analyse");
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName, oldUrls, newUrls }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Batch "${batchName}" wurde gespeichert! (ID: ${data.batchId})`);
        setLastBatchId(data.batchId);
        // Scraping automatisch starten
        setScraping(true);
        const scrapeRes = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: data.batchId, maxRows }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok) {
          setScrapingDone(true);
          setFeedback(f => f + "\nScraping abgeschlossen!");
          // Matching automatisch starten
          setMatching(true);
          const matchRes = await fetch("/api/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ batchId: data.batchId }),
          });
          const matchData = await matchRes.json();
          if (matchRes.ok) {
            setMatchingDone(true);
            setFeedback(f => f + "\nMatching abgeschlossen!");
            setActiveTab("result");
          } else {
            setMatchingError(matchData.error || "Fehler beim Matching.");
          }
          setMatching(false);
        } else {
          setScrapingError(scrapeData.error || "Fehler beim Scraping.");
        }
        setScraping(false);
      } else {
        setFeedback(data.error || "Fehler beim Speichern des Batches.");
      }
    } catch (e) {
      setFeedback("Netzwerk- oder Serverfehler beim Speichern des Batches.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!lastBatchId || activeTab !== "result") return;
      setLoadingResults(true);
      // Redirects + Details holen
      const { data: redirectsData } = await supabase
        .from("redirects")
        .select("id, old_url_id, new_url_id, confidence_score, match_reasoning, match_type, old_url:old_url_id(*), new_url:new_url_id(*)")
        .eq("batch_id", lastBatchId);
      setRedirects(redirectsData || []);
      // Alte URLs
      const { data: oldUrlsData } = await supabase
        .from("urls")
        .select("*")
        .eq("batch_id", lastBatchId)
        .eq("type", "old");
      setOldUrlDetails(oldUrlsData || []);
      // Neue URLs
      const { data: newUrlsData } = await supabase
        .from("urls")
        .select("*")
        .eq("batch_id", lastBatchId)
        .eq("type", "new");
      setNewUrlDetails(newUrlsData || []);
      setLoadingResults(false);
    };
    fetchResults();
  }, [lastBatchId, activeTab]);

  // Drag&Drop Handler für alte URLs
  const handleFileOld = async (file: File) => {
    try {
      const urls = await readExcelFile(file);
      const validUrls = validateUrls(urls);
      setOldUrls(validUrls);
    } catch (e) {
      // Fehlerbehandlung optional
    }
  };

  // Drag&Drop Handler für neue URLs
  const handleFileNew = async (file: File) => {
    try {
      const urls = await readExcelFile(file);
      const validUrls = validateUrls(urls);
      setNewUrls(validUrls);
    } catch (e) {
      // Fehlerbehandlung optional
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-white flex flex-col">
      {/* Hero Header */}
      <header className="py-12 text-center bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 text-white shadow-lg">
        <div className="flex flex-col items-center justify-center gap-4">
          <CloudArrowUpIcon className="w-16 h-16 text-white/80 drop-shadow-lg" />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">SEO Redirect Generator</h1>
          <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto text-white/90">Upload your old and new URL lists to generate optimal 301 redirects for your SEO relaunch</p>
        </div>
      </header>
      {/* Stepper */}
      <div className="flex justify-center mt-8 mb-12">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 ${activeTab === "upload" ? "bg-indigo-500 text-white border-indigo-400 shadow-lg" : "bg-white text-indigo-500 border-slate-200"}`}>1</div>
            <span className="mt-2 text-sm font-medium text-slate-700">Upload</span>
          </div>
          <div className="w-12 h-1 bg-gradient-to-r from-indigo-400 to-blue-400 rounded" />
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 ${activeTab === "analyse" ? "bg-indigo-500 text-white border-indigo-400 shadow-lg" : "bg-white text-indigo-500 border-slate-200"}`}>2</div>
            <span className="mt-2 text-sm font-medium text-slate-700">Analyse</span>
          </div>
          <div className="w-12 h-1 bg-gradient-to-r from-indigo-400 to-blue-400 rounded" />
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-4 ${activeTab === "result" ? "bg-indigo-500 text-white border-indigo-400 shadow-lg" : "bg-white text-indigo-500 border-slate-200"}`}>3</div>
            <span className="mt-2 text-sm font-medium text-slate-700">Ergebnis</span>
          </div>
        </div>
      </div>
      {/* Upload Step */}
      {activeTab === "upload" && (
        <section className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white/90 shadow-2xl rounded-3xl p-10 w-full max-w-3xl border border-slate-100 flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 text-center">Upload URL-Listen</h2>
            <div className="flex flex-col md:flex-row gap-8 w-full justify-center">
              {/* Alte URLs Drag&Drop */}
              <div
                className={`flex-1 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${dragActiveOld ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-indigo-50"}`}
                onDragOver={e => { e.preventDefault(); setDragActiveOld(true); }}
                onDragLeave={e => { e.preventDefault(); setDragActiveOld(false); }}
                onDrop={e => {
                  e.preventDefault(); setDragActiveOld(false);
                  if (e.dataTransfer.files?.[0]) handleFileOld(e.dataTransfer.files[0]);
                }}
                onClick={() => oldInputRef.current?.click()}
              >
                <CloudArrowUpIcon className="w-10 h-10 text-indigo-400 mb-2" />
                <span className="font-semibold text-slate-700 mb-1">Old URLs (Current Site)</span>
                <span className="text-xs text-slate-500 mb-2">Drag & drop Excel file or click to select</span>
                <input
                  ref={oldInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileOld(e.target.files[0]); }}
                />
                <span className="mt-2 text-green-600 font-medium text-sm">{oldUrls.length > 0 ? `${oldUrls.length} URLs loaded` : "No file selected"}</span>
              </div>
              {/* Neue URLs Drag&Drop */}
              <div
                className={`flex-1 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${dragActiveNew ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-indigo-50"}`}
                onDragOver={e => { e.preventDefault(); setDragActiveNew(true); }}
                onDragLeave={e => { e.preventDefault(); setDragActiveNew(false); }}
                onDrop={e => {
                  e.preventDefault(); setDragActiveNew(false);
                  if (e.dataTransfer.files?.[0]) handleFileNew(e.dataTransfer.files[0]);
                }}
                onClick={() => newInputRef.current?.click()}
              >
                <CloudArrowUpIcon className="w-10 h-10 text-indigo-400 mb-2" />
                <span className="font-semibold text-slate-700 mb-1">New URLs (Target Site)</span>
                <span className="text-xs text-slate-500 mb-2">Drag & drop Excel file or click to select</span>
                <input
                  ref={newInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFileNew(e.target.files[0]); }}
                />
                <span className="mt-2 text-green-600 font-medium text-sm">{newUrls.length > 0 ? `${newUrls.length} URLs loaded` : "No file selected"}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center mt-4">
              <input
                type="text"
                className="border border-slate-300 rounded px-4 py-2 w-80 max-w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 text-slate-900"
                placeholder="Batch-Name (e.g. Relaunch 2025)"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
              />
              <input
                type="number"
                min={1}
                max={1000}
                className="border border-slate-300 rounded px-4 py-2 w-48 max-w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 text-slate-900"
                placeholder="Max. Zeilen (z.B. 10)"
                value={maxRows}
                onChange={e => setMaxRows(Number(e.target.value))}
              />
            </div>
            <button
              className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              disabled={!oldUrls.length || !newUrls.length || !batchName.trim() || loading}
              onClick={handleStartBatch}
            >
              {loading ? "Speichern..." : "Generate Redirect Mappings"}
            </button>
          </div>
        </section>
      )}
      {activeTab === "analyse" && (
        <section className="w-full min-h-[60vh] flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-white py-12 px-0">
          <div className="w-full flex flex-col items-center">
            <h2 className="text-3xl font-extrabold mb-8 text-indigo-700 tracking-tight">Analyse & Fortschritt</h2>
            {/* Progressbar & Stats */}
            <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-center justify-center mb-8">
              <div className="flex-1 flex flex-col items-center">
                <div className="w-full bg-slate-200 rounded-full h-4 mb-2">
                  <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-4 rounded-full transition-all duration-500" style={{ width: `${scrapingDone ? 100 : scraping ? 60 : 0}%` }} />
                </div>
                <div className="flex justify-between w-full text-xs text-slate-500">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <svg className={`w-6 h-6 animate-spin text-indigo-500 ${scraping ? '' : 'hidden'}`} fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                  <span className="font-semibold text-indigo-700">{scraping ? "OpenAI analysiert URLs..." : scrapingDone ? "Analyse abgeschlossen!" : "Warte auf Analyse..."}</span>
                </div>
                <div className="text-slate-500 text-sm">{scraping ? "Die thematische Zuordnung läuft. Bitte warten..." : scrapingDone ? "Alle URLs wurden analysiert." : ""}</div>
              </div>
            </div>
            {/* Aktuell analysierte URL */}
            {scraping && (
              <div className="w-full max-w-2xl bg-white/80 rounded-xl shadow p-6 mb-8 border border-indigo-100 flex flex-col items-center">
                <span className="text-xs text-slate-500 mb-2">Aktuell analysierte URL:</span>
                <span className="font-mono text-indigo-700 text-sm break-all">{feedback?.split("\n").slice(-1)[0]}</span>
              </div>
            )}
            {/* Stats */}
            <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 mt-4">
              <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-indigo-600">{oldUrls.length}</span>
                <span className="text-xs text-slate-500">Alte URLs</span>
              </div>
              <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-blue-600">{newUrls.length}</span>
                <span className="text-xs text-slate-500">Neue URLs</span>
              </div>
              <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-green-600">{scrapingDone ? oldUrls.length : scraping ? Math.floor(oldUrls.length * 0.6) : 0}</span>
                <span className="text-xs text-slate-500">Analysiert</span>
              </div>
              <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
                <span className="text-2xl font-bold text-slate-600">{scrapingDone ? 0 : scraping ? oldUrls.length - Math.floor(oldUrls.length * 0.6) : oldUrls.length}</span>
                <span className="text-xs text-slate-500">Offen</span>
              </div>
            </div>
          </div>
        </section>
      )}
      {activeTab === "result" && (
        <section className="py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Ergebnis & Redirect-Mapping</h2>
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-6 justify-center">
              <button onClick={() => setResultTab("mapping")}
                className={`px-4 py-2 rounded-t font-medium transition-colors duration-150 ${resultTab === "mapping" ? "bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>Redirect-Mapping</button>
              <button onClick={() => setResultTab("old")}
                className={`px-4 py-2 rounded-t font-medium transition-colors duration-150 ${resultTab === "old" ? "bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>Details alte URLs</button>
              <button onClick={() => setResultTab("new")}
                className={`px-4 py-2 rounded-t font-medium transition-colors duration-150 ${resultTab === "new" ? "bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>Details neue URLs</button>
              <button onClick={() => setResultTab("download")}
                className={`px-4 py-2 rounded-t font-medium transition-colors duration-150 ${resultTab === "download" ? "bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>Download</button>
            </div>
            {loadingResults && <div className="text-indigo-500">Lade Ergebnisse...</div>}
            {!loadingResults && resultTab === "mapping" && (
              <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-slate-900">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-2">Alte URL</th>
                      <th className="px-4 py-2">Neue URL</th>
                      <th className="px-4 py-2">Typ</th>
                      <th className="px-4 py-2">Confidence</th>
                      <th className="px-4 py-2">Reasoning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redirects.length === 0 && (
                      <tr><td colSpan={5} className="text-slate-400 text-center py-8">Noch keine Redirects gefunden.</td></tr>
                    )}
                    {redirects.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td className="px-4 py-2 break-all text-blue-700 dark:text-blue-300">{r.old_url?.url}</td>
                        <td className="px-4 py-2 break-all text-green-700 dark:text-green-300">{r.new_url?.url}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-1 rounded text-xs font-semibold ${r.match_type === "ai" ? "bg-indigo-100 text-indigo-700" : r.match_type === "exact" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{r.match_type}</span></td>
                        <td className="px-4 py-2">{r.confidence_score ? r.confidence_score.toFixed(2) : "-"}</td>
                        <td className="px-4 py-2 max-w-xs truncate" title={r.match_reasoning}>{r.match_reasoning || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingResults && resultTab === "old" && (
              <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-slate-900">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-2">Alte URL</th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">Meta</th>
                      <th className="px-4 py-2">H1</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oldUrlDetails.length === 0 && (
                      <tr><td colSpan={5} className="text-slate-400 text-center py-8">Keine Daten.</td></tr>
                    )}
                    {oldUrlDetails.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td className="px-4 py-2 break-all">{u.url}</td>
                        <td className="px-4 py-2">{u.title || "-"}</td>
                        <td className="px-4 py-2">{u.meta_description || "-"}</td>
                        <td className="px-4 py-2">{u.h1_heading || "-"}</td>
                        <td className="px-4 py-2">{u.status_code || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingResults && resultTab === "new" && (
              <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-slate-900">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                      <th className="px-4 py-2">Neue URL</th>
                      <th className="px-4 py-2">Title</th>
                      <th className="px-4 py-2">Meta</th>
                      <th className="px-4 py-2">H1</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newUrlDetails.length === 0 && (
                      <tr><td colSpan={5} className="text-slate-400 text-center py-8">Keine Daten.</td></tr>
                    )}
                    {newUrlDetails.map(u => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <td className="px-4 py-2 break-all">{u.url}</td>
                        <td className="px-4 py-2">{u.title || "-"}</td>
                        <td className="px-4 py-2">{u.meta_description || "-"}</td>
                        <td className="px-4 py-2">{u.h1_heading || "-"}</td>
                        <td className="px-4 py-2">{u.status_code || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loadingResults && resultTab === "download" && (
              <div className="flex flex-col items-center py-12">
                <button className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  Download als CSV (coming soon)
                </button>
                <div className="text-slate-400 mt-4">Export-Funktion folgt ...</div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

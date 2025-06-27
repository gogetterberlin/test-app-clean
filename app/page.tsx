"use client";
import Image from "next/image";
import styles from "./page.module.css";
import FileUpload from "./components/FileUpload";
import { useState, useEffect } from "react";
import { supabase } from "./supabase/client";

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

  return (
    <div className={styles.page}>
      <nav className="flex gap-2 mb-8 border-b border-slate-200 dark:border-slate-700">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-medium rounded-t transition-colors duration-150 ${activeTab === tab.key ? "bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}
            onClick={() => setActiveTab(tab.key)}
            disabled={tab.key === "analyse" && !lastBatchId}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === "upload" && (
        <section className="py-8 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-8 w-full max-w-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-3xl font-extrabold mb-6 text-indigo-700 dark:text-indigo-400 text-center tracking-tight">SEO Redirect Generator</h2>
            <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-center">
              <input
                type="text"
                className="border border-slate-300 dark:border-slate-700 rounded px-4 py-2 w-80 max-w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Batch-Name (z.B. Projekt X Redirects)"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
              />
              <input
                type="number"
                min={1}
                max={1000}
                className="border border-slate-300 dark:border-slate-700 rounded px-4 py-2 w-48 max-w-full focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Max. Zeilen (z.B. 10)"
                value={maxRows}
                onChange={e => setMaxRows(Number(e.target.value))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <FileUpload label="Alte URLs (Excel)" onFileLoaded={setOldUrls} />
              <FileUpload label="Neue URLs (Excel)" onFileLoaded={setNewUrls} />
            </div>
            <div className="mt-4 flex justify-center">
              <button
                className="bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg font-semibold text-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!oldUrls.length || !newUrls.length || !batchName.trim() || loading}
                onClick={handleStartBatch}
              >
                {loading ? "Speichern..." : "Batch starten"}
              </button>
            </div>
          </div>
        </section>
      )}
      {activeTab === "analyse" && (
        <section className="py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Analyse & Fortschritt</h2>
          <div className="max-w-xl mx-auto">
            {feedback && <div className="mb-4 text-blue-700 whitespace-pre-line text-left">{feedback}</div>}
            {scrapingError && <div className="mb-2 text-red-600">{scrapingError}</div>}
            {scraping && <div className="mb-2 text-indigo-600">Scraping läuft...</div>}
            {scrapingDone && <div className="mb-2 text-green-700">Scraping abgeschlossen!</div>}
            {matchingError && <div className="mb-2 text-red-600">{matchingError}</div>}
            {matching && <div className="mb-2 text-indigo-600">Matching läuft...</div>}
            {matchingDone && <div className="mb-2 text-green-700">Matching abgeschlossen!</div>}
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

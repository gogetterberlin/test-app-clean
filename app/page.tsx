"use client";
import Image from "next/image";
import styles from "./page.module.css";
import FileUpload from "./components/FileUpload";
import { useState } from "react";

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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapingDone, setScrapingDone] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchingDone, setMatchingDone] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

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
          body: JSON.stringify({ batchId: data.batchId }),
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
        <section className="py-8 text-center">
          <h2 className="text-2xl font-bold mb-4">SEO Redirect Generator</h2>
          <div className="mb-6">
            <input
              type="text"
              className="border rounded px-4 py-2 w-80 max-w-full"
              placeholder="Batch-Name (z.B. Projekt X Redirects)"
              value={batchName}
              onChange={e => setBatchName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <FileUpload label="Alte URLs (Excel)" onFileLoaded={setOldUrls} />
            <FileUpload label="Neue URLs (Excel)" onFileLoaded={setNewUrls} />
          </div>
          <div className="mt-8">
            <button
              className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
              disabled={!oldUrls.length || !newUrls.length || !batchName.trim() || loading}
              onClick={handleStartBatch}
            >
              {loading ? "Speichern..." : "Batch starten"}
            </button>
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
          <div className="max-w-3xl mx-auto">
            {/* Hier folgt die Ergebnis-Tabelle und Download-Button (wird im nächsten Schritt umgesetzt) */}
            <div className="text-slate-500">Ergebnis-Ansicht folgt ...</div>
          </div>
        </section>
      )}
    </div>
  );
}

"use client";
import Image from "next/image";
import styles from "./page.module.css";
import FileUpload from "./components/FileUpload";
import { useState } from "react";

export default function Home() {
  const [oldUrls, setOldUrls] = useState<string[]>([]);
  const [newUrls, setNewUrls] = useState<string[]>([]);
  const [batchName, setBatchName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapingDone, setScrapingDone] = useState(false);
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  const handleStartBatch = async () => {
    setFeedback(null);
    setScraping(false);
    setScrapingDone(false);
    setScrapingError(null);
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
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchName, oldUrls, newUrls }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Batch "${batchName}" wurde gespeichert! (ID: ${data.batchId})`);
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
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol>
          <li>
            Get started by editing <code>app/page.tsx</code>.
          </li>
          <li>Save and see your changes instantly.</li>
        </ol>
      </main>
      <section className="py-12 text-center">
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
            disabled={!oldUrls.length || !newUrls.length || !batchName.trim() || loading || scraping}
            onClick={handleStartBatch}
          >
            {loading ? "Speichern..." : scraping ? "Scraping läuft..." : "Batch starten"}
          </button>
        </div>
        {feedback && <div className="mt-4 text-blue-700 whitespace-pre-line">{feedback}</div>}
        {scrapingError && <div className="mt-2 text-red-600">{scrapingError}</div>}
        {scrapingDone && <div className="mt-2 text-green-700">Scraping abgeschlossen!</div>}
      </section>
      <footer className={styles.footer}>
        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}

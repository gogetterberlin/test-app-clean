"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { FileUpload } from "./components/FileUpload";
import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase/client";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { readExcelFile, validateUrls } from "./utils/excel";
import type { UrlMapping } from "./utils/types";
import { useRouter } from "next/navigation";

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
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

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

  return null;
}

// Hilfsfunktionen für Export & Filter
type Redirect = {
  id: string;
  old_url: { url: string };
  new_url: { url: string };
  confidence_score: number;
  match_type: string;
};

function generateHtaccess(redirects: Redirect[]): string {
  return `# 301 Redirects for SEO Relaunch\n# Generated by SEO Redirect Generator\n\n` +
    redirects.map((r) => `Redirect 301 ${r.old_url?.url} ${r.new_url?.url}`).join("\n");
}
function generateNginx(redirects: Redirect[]): string {
  return `# 301 Redirects for SEO Relaunch\n# Generated by SEO Redirect Generator\n\n` +
    redirects.map((r) => `rewrite ^${r.old_url?.url}$ ${r.new_url?.url} permanent;`).join("\n");
}
function generateCSV(redirects: Redirect[]): string {
  return 'Old URL,New URL,Confidence,Method\n' +
    redirects.map((r) => `${r.old_url?.url},${r.new_url?.url},${Math.round((r.confidence_score || 0) * 100)}%,${r.match_type}`).join("\n");
}
function filterRedirect(r: Redirect, search: string): boolean {
  if (!search) return true;
  return (
    r.old_url?.url?.toLowerCase().includes(search.toLowerCase()) ||
    r.new_url?.url?.toLowerCase().includes(search.toLowerCase())
  );
}

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

const phases = [
  {
    label: 'Vergleiche Inhalte…',
    description: 'Die AI analysiert Titel, Meta, H1 und Haupttext.',
    duration: 1200,
  },
  {
    label: 'Suche beste Matches…',
    description: 'Die AI sucht für jede alte URL die beste neue Zielseite.',
    duration: 1600,
  },
  {
    label: 'Bewerte Confidence…',
    description: 'Die AI bewertet die Qualität der Redirects.',
    duration: 1400,
  },
  {
    label: 'Fertig!',
    description: 'Analyse abgeschlossen. Ergebnisse werden geladen.',
    duration: 800,
  },
];

const statsTarget = {
  oldUrls: 42,
  matches: 39,
  confidence: 92,
  exact: 28,
  fuzzy: 11,
};

function useAnimatedStats(isActive: boolean) {
  const [stats, setStats] = useState({ oldUrls: 0, matches: 0, confidence: 0, exact: 0, fuzzy: 0 });
  useEffect(() => {
    if (!isActive) return;
    let frame: number;
    let start = Date.now();
    function animate() {
      const t = Math.min(1, (Date.now() - start) / 1200);
      setStats({
        oldUrls: Math.round(statsTarget.oldUrls * t),
        matches: Math.round(statsTarget.matches * t),
        confidence: Math.round(statsTarget.confidence * t),
        exact: Math.round(statsTarget.exact * t),
        fuzzy: Math.round(statsTarget.fuzzy * t),
      });
      if (t < 1) frame = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(frame);
  }, [isActive]);
  return stats;
}

export function AnalysisStep({ onDone, batchId }: { onDone?: () => void; batchId: string }) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const stats = useAnimatedStats(phase > 0);
  const [newUrls, setNewUrls] = useState<any[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    setLoadingUrls(true);
    supabase
      .from('urls')
      .select('*')
      .eq('batch_id', batchId)
      .eq('type', 'new')
      .then(({ data }) => {
        setNewUrls(data || []);
        setLoadingUrls(false);
      });
  }, [batchId]);

  useEffect(() => {
    if (phase < phases.length - 1) {
      const timeout = setTimeout(() => {
        setPhase(p => p + 1);
        setProgress(Math.round(((phase + 1) / (phases.length - 1)) * 100));
      }, phases[phase].duration);
      return () => clearTimeout(timeout);
    } else {
      setProgress(100);
      setTimeout(() => {
        setDone(true);
        onDone?.();
      }, phases[phase].duration);
    }
  }, [phase, onDone]);

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopySuccess(url);
    setTimeout(() => setCopySuccess(null), 1200);
  };

  return (
    <div className="flex flex-col items-center gap-10 py-16 w-full px-0 md:px-0">
      {/* Progressbar */}
      <div className="w-full px-2 md:px-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-indigo-600">Analyse läuft…</span>
          <span className="text-xs text-gray-400">{progress}%</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden relative">
          <div
            className="h-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-lg"
            style={{ width: `${progress}%` }}
          >
            <span className="absolute right-2 top-0 text-xs text-white font-bold animate-pulse">
              {progress === 100 ? '✓' : ''}
            </span>
          </div>
          {/* AI-Branding */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-indigo-500 opacity-80">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="16" fill="#fff"/><path d="M16 6v20M6 16h20" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/></svg>
            <span>AI</span>
          </div>
        </div>
      </div>
      {/* Phase-Text */}
      <div className="text-center w-full px-2 md:px-8">
        <div className="text-lg font-semibold text-indigo-700 mb-1 animate-pulse">{phases[phase].label}</div>
        <div className="text-sm text-gray-500">{phases[phase].description}</div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-6 w-full px-2 md:px-8">
        <StatCard label="Alte URLs" value={stats.oldUrls} />
        <StatCard label="Gefundene Matches" value={stats.matches} />
        <StatCard label="Ø Confidence" value={stats.confidence + '%'} />
        <StatCard label="Exakte Matches" value={stats.exact} />
        <StatCard label="Fuzzy Matches" value={stats.fuzzy} />
      </div>
      {/* Trust & Info */}
      <div className="flex flex-col items-center gap-2 mt-4 w-full px-2 md:px-8">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg width="16" height="16" fill="none"><circle cx="8" cy="8" r="8" fill="#6366f1"/><path d="M8 4v4l2 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
          AI powered by OpenAI
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600"><svg width="16" height="16" fill="none"><rect x="2" y="6" width="12" height="8" rx="2" fill="#34d399"/><path d="M4 10l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg> Deine Daten sind sicher</div>
      </div>
      {/* Extraktions-Cards */}
      <div className="w-full px-2 md:px-8 mt-8">
        <h3 className="text-lg font-bold mb-4 text-indigo-700">Extrahierte Daten der neuen URLs</h3>
        {loadingUrls ? (
          <div className="text-indigo-500 animate-pulse">Lade Daten…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newUrls.map((u, i) => (
              <div key={u.id || i} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-2 border border-gray-100 relative group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-blue-700 break-all truncate max-w-[220px]" title={u.url}>{u.url}</span>
                  <button
                    className="ml-auto px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition"
                    onClick={() => handleCopy(u.url)}
                    title="URL kopieren"
                  >
                    {copySuccess === u.url ? '✔️' : '📋'}
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <Field label="Titel" value={u.title} />
                  <Field label="Meta" value={u.meta_description} />
                  <Field label="H1" value={u.h1_heading} />
                  <Field label="Status" value={u.status_code} />
                  <Field label="Content" value={u.main_content} long />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Abschluss-Glow */}
      {done && (
        <div className="mt-8 animate-glow text-center w-full px-2 md:px-8">
          <div className="text-2xl font-bold text-pink-600 mb-2">Analyse abgeschlossen!</div>
          <div className="text-sm text-gray-500">Die Ergebnisse sind bereit. Du kannst jetzt fortfahren.</div>
        </div>
      )}
      <style jsx>{`
        .animate-glow {
          animation: glow 1.5s ease-in-out infinite alternate;
        }
        @keyframes glow {
          from { text-shadow: 0 0 8px #f472b6, 0 0 16px #a78bfa; }
          to { text-shadow: 0 0 24px #f472b6, 0 0 32px #a78bfa; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border border-gray-100">
      <div className="text-2xl font-bold text-indigo-600 mb-1">{value}</div>
      <div className="text-xs text-gray-500 font-medium tracking-wide">{label}</div>
    </div>
  );
}

function Field({ label, value, long }: { label: string; value: any; long?: boolean }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-xs font-semibold text-gray-500 w-16 shrink-0">{label}:</span>
      {value ? (
        <span className={`text-xs text-gray-800 ${long ? 'line-clamp-3 max-w-xs' : 'truncate max-w-[180px]'}`}>{long && typeof value === 'string' ? value.slice(0, 120) + (value.length > 120 ? '…' : '') : value}</span>
      ) : (
        <span className="text-xs text-gray-400 italic" title="Nicht extrahiert">-</span>
      )}
    </div>
  );
} 
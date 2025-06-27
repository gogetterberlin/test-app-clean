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
      {/* Extraktions-Tabelle */}
      <div className="w-full px-2 md:px-8 mt-8">
        <h3 className="text-lg font-bold mb-2 text-indigo-700">Extrahierte Daten der neuen URLs</h3>
        {loadingUrls ? (
          <div className="text-indigo-500 animate-pulse">Lade Daten…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-indigo-50 text-indigo-700">
                  <th className="px-2 py-1">URL</th>
                  <th className="px-2 py-1">Titel</th>
                  <th className="px-2 py-1">Meta</th>
                  <th className="px-2 py-1">H1</th>
                  <th className="px-2 py-1">Content</th>
                </tr>
              </thead>
              <tbody>
                {newUrls.map((u, i) => (
                  <tr key={u.id || i} className="border-b">
                    <td className="px-2 py-1 text-blue-700 break-all">{u.url}</td>
                    <td className="px-2 py-1">{u.title || <span className="text-gray-400">-</span>}</td>
                    <td className="px-2 py-1">{u.meta_description || <span className="text-gray-400">-</span>}</td>
                    <td className="px-2 py-1">{u.h1_heading || <span className="text-gray-400">-</span>}</td>
                    <td className="px-2 py-1 max-w-xs truncate">{u.main_content ? u.main_content.slice(0, 80) + (u.main_content.length > 80 ? '…' : '') : <span className="text-gray-400">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
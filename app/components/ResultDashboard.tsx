import React, { useState, useEffect } from 'react';

const stats = {
  total: 42,
  exact: 28,
  fuzzy: 11,
  manual: 3,
  confidence: 92,
};

const exports = {
  htaccess: `Redirect 301 /alte-url-1 /neue-url-1\nRedirect 301 /alte-url-2 /neue-url-2`,
  nginx: `rewrite ^/alte-url-1$ /neue-url-1 permanent;\nrewrite ^/alte-url-2$ /neue-url-2 permanent;`,
  csv: `old_url,new_url,confidence\n/alte-url-1,/neue-url-1,98\n/alte-url-2,/neue-url-2,95`,
};

type ExportTabKey = 'htaccess' | 'nginx' | 'csv';

type MappingType = 'All' | 'Exact' | 'Fuzzy' | 'Manual';

const mappings = [
  {
    old: '/alte-url-1',
    new: '/neue-url-1',
    type: 'Exact',
    confidence: 98,
    ai: true,
  },
  {
    old: '/alte-url-2',
    new: '/neue-url-2',
    type: 'Fuzzy',
    confidence: 95,
    ai: true,
  },
  {
    old: '/alte-url-3',
    new: '/neue-url-3',
    type: 'Manual',
    confidence: 80,
    ai: false,
  },
  {
    old: '/alte-url-4',
    new: '/neue-url-4',
    type: 'Exact',
    confidence: 99,
    ai: true,
  },
  {
    old: '/alte-url-5',
    new: '/neue-url-5',
    type: 'Fuzzy',
    confidence: 88,
    ai: true,
  },
  {
    old: '/alte-url-6',
    new: '/neue-url-6',
    type: 'Manual',
    confidence: 75,
    ai: false,
  },
];

const exportTabs = [
  { key: 'htaccess', label: '.htaccess' },
  { key: 'nginx', label: 'Nginx' },
  { key: 'csv', label: 'CSV/Excel' },
];

const mappingTypes: MappingType[] = ['All', 'Exact', 'Fuzzy', 'Manual'];

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    let startTime: number | null = null;
    function animate(ts: number) {
      if (!startTime) startTime = ts;
      const progress = Math.min(1, (ts - startTime) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
    return () => setValue(target);
  }, [target, duration]);
  return value;
}

export function ResultDashboard() {
  const [activeTab, setActiveTab] = useState<ExportTabKey>('htaccess');
  const [copySuccess, setCopySuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MappingType>('All');
  const [page, setPage] = useState(1);
  const perPage = 5;

  const filteredMappings = mappings.filter(m =>
    (typeFilter === 'All' || m.type === typeFilter) &&
    (m.old.includes(search) || m.new.includes(search))
  );
  const totalPages = Math.ceil(filteredMappings.length / perPage);
  const pagedMappings = filteredMappings.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [typeFilter, search]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 1200);
  };

  // CountUp-Animationen für Stats
  const total = useCountUp(stats.total);
  const exact = useCountUp(stats.exact);
  const fuzzy = useCountUp(stats.fuzzy);
  const manual = useCountUp(stats.manual);
  const confidence = useCountUp(stats.confidence);

  return (
    <div className="flex flex-col gap-12 py-12 w-full px-0 md:px-0">
      {/* Stats-Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 w-full px-2 md:px-8">
        <StatCard label="Total" value={total} />
        <StatCard label="Exact" value={exact} badge="Exact" icon={<span title="Exakte Matches">✅</span>} />
        <StatCard label="Fuzzy" value={fuzzy} badge="Fuzzy" icon={<span title="Fuzzy Matches">✨</span>} />
        <StatCard label="Manual" value={manual} badge="Manual" icon={<span title="Manuell zugeordnet">🖐️</span>} />
        <StatCard label="Ø Confidence" value={confidence + '%'} confidence={confidence} tooltip="Durchschnittlicher AI-Confidence-Score" />
      </div>
      {/* Export-Tabs */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 w-full px-2 md:px-8">
        <div className="flex gap-4 mb-4 items-end">
          {exportTabs.map(tab => (
            <button
              key={tab.key}
              className={`px-4 py-2 rounded-t font-medium transition-all duration-150 border-b-2 ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-400 hover:text-indigo-500'
              }`}
              onClick={() => setActiveTab(tab.key as ExportTabKey)}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              className={`px-3 py-1 rounded flex items-center gap-1 bg-indigo-100 text-indigo-600 text-xs font-semibold hover:bg-indigo-200 transition ${copySuccess ? 'animate-pulse' : ''}`}
              onClick={() => handleCopy(exports[activeTab])}
              title="In Zwischenablage kopieren"
            >
              {copySuccess ? <span>✔️</span> : <span>📋</span>} Copy
            </button>
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(exports[activeTab])}`}
              download={`redirects.${activeTab === 'csv' ? 'csv' : 'txt'}`}
              className="px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs font-semibold hover:bg-gray-200 transition"
              title="Datei herunterladen"
            >
              ⬇️ Download
            </a>
          </div>
        </div>
        <div className="text-xs text-gray-400 mb-2">Exportiere deine Redirects für verschiedene Systeme.</div>
        <pre className="bg-gray-50 rounded p-4 text-xs font-mono overflow-x-auto border border-gray-100 transition-all duration-150">
          {exports[activeTab]}
        </pre>
        {copySuccess && <div className="mt-2 text-green-600 text-xs animate-pulse">In Zwischenablage kopiert!</div>}
      </div>
      {/* Mapping-Tabelle */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100 w-full px-2 md:px-8">
        <div className="flex flex-wrap items-center mb-4 gap-4">
          <input
            type="text"
            placeholder="Suche alte oder neue URL…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 rounded border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-sm w-full md:w-72 transition"
          />
          <div className="flex gap-2 flex-wrap">
            {mappingTypes.map(type => (
              <button
                key={type}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  typeFilter === type
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
                onClick={() => setTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 ml-auto">{filteredMappings.length} Ergebnisse</span>
        </div>
        <div className="overflow-x-auto max-h-[340px]">
          <table className="min-w-full text-sm sticky-header">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-gray-500 border-b">
                <th className="py-2 px-3 text-left">Alte URL</th>
                <th className="py-2 px-3 text-left">Neue URL</th>
                <th className="py-2 px-3 text-left">Typ</th>
                <th className="py-2 px-3 text-left">Confidence</th>
                <th className="py-2 px-3 text-left">AI</th>
                <th className="py-2 px-3 text-left"></th>
              </tr>
            </thead>
            <tbody>
              {pagedMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🔍</span>
                      <span>Keine Ergebnisse gefunden</span>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedMappings.map((m, i) => (
                  <tr key={i} className="border-b hover:bg-gradient-to-r hover:from-indigo-50 hover:to-pink-50 transition group">
                    <td className="py-2 px-3 font-mono text-indigo-700">{m.old}</td>
                    <td className="py-2 px-3 font-mono text-pink-600">{m.new}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium
                        ${m.type === 'Exact' ? 'bg-emerald-100 text-emerald-700' :
                          m.type === 'Fuzzy' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-500'}
                      `} title={m.type === 'Exact' ? 'Exaktes Match' : m.type === 'Fuzzy' ? 'Fuzzy Match' : 'Manuell zugeordnet'}>
                        {m.type === 'Exact' ? '✅' : m.type === 'Fuzzy' ? '✨' : '🖐️'} {m.type}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded" title={`AI-Confidence: ${m.confidence}%`}>
                          <div
                            className={`h-2 rounded ${m.confidence > 90 ? 'bg-emerald-400' : m.confidence > 80 ? 'bg-yellow-400' : 'bg-gray-400'}`}
                            style={{ width: `${m.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{m.confidence}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      {m.ai ? (
                        <span className="inline-flex items-center gap-1 text-indigo-500 text-xs font-semibold" title="AI generiert"><svg width="16" height="16" fill="none"><circle cx="8" cy="8" r="8" fill="#6366f1"/><path d="M8 4v4l2 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>AI</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-semibold" title="Manuell zugeordnet"><svg width="16" height="16" fill="none"><circle cx="8" cy="8" r="8" fill="#e5e7eb"/><path d="M8 4v4l2 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>Manuell</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        className={`px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition flex items-center gap-1 ${copySuccess ? 'animate-pulse' : ''} opacity-0 group-hover:opacity-100`}
                        onClick={() => handleCopy(`${m.old} -> ${m.new}`)}
                        title="Redirect kopieren"
                      >
                        {copySuccess ? <span>✔️</span> : <span>📋</span>}
                        Copy
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border transition-all duration-150 ${
                  page === i + 1
                    ? 'bg-indigo-500 text-white border-indigo-500 shadow'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Footer Branding */}
      <footer className="mt-8 text-center text-xs text-gray-400 flex flex-col items-center gap-1 w-full px-2 md:px-8">
        <span>Powered by <span className="font-semibold text-indigo-500">OpenAI</span> & modern SaaS-UX</span>
        <a href="#" className="underline hover:text-indigo-600">Datenschutz</a>
      </footer>
      <style jsx>{`
        .sticky-header thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .sticky-header th {
          background: white;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, badge, confidence, icon, tooltip }: { label: string; value: string | number; badge?: string; confidence?: number; icon?: React.ReactNode; tooltip?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center border border-gray-100 relative transition hover:shadow-lg hover:-translate-y-1 group">
      <div className="text-2xl font-bold text-indigo-600 mb-1 flex items-center gap-1">{icon}{value}</div>
      <div className="text-xs text-gray-500 font-medium tracking-wide">{label}</div>
      {badge && (
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold
          ${badge === 'Exact' ? 'bg-emerald-100 text-emerald-700' : badge === 'Fuzzy' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>{badge}</span>
      )}
      {confidence !== undefined && (
        <div className="w-20 h-2 bg-gray-200 rounded mt-2" title={tooltip}>
          <div className="h-2 rounded bg-gradient-to-r from-emerald-400 via-yellow-400 to-pink-400" style={{ width: `${confidence}%` }} />
        </div>
      )}
    </div>
  );
} 
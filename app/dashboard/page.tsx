import { supabase } from '../supabase/client';
import { LucideCheckCircle, LucideLoader2 } from 'lucide-react';

export default async function DashboardPage() {
  // Batches aus Supabase laden
  const { data: batches } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-8">
      <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">SEO Redirect Batches</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {batches?.map((batch: any) => (
          <div key={batch.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">{batch.name}</span>
              <span className="ml-auto">
                {/* Status-Badge (Platzhalter) */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <LucideCheckCircle className="w-4 h-4" /> Fertig
                </span>
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{new Date(batch.created_at).toLocaleString()}</div>
            <button className="mt-2 px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition">Details ansehen</button>
          </div>
        ))}
        {(!batches || batches.length === 0) && (
          <div className="col-span-full text-center text-slate-500 dark:text-slate-400 py-16">
            <LucideLoader2 className="mx-auto animate-spin mb-4 w-8 h-8" />
            Noch keine Batches vorhanden.
          </div>
        )}
      </div>
    </div>
  );
} 
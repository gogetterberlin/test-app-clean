import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEO 301 Redirect Tool',
  description: 'Modernes SaaS-Tool für Website-Relaunches',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100 text-gray-900">
        <header className="w-full py-8 px-4 md:px-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="text-2xl font-extrabold tracking-tight">SEO 301 Redirect Tool</div>
            <div className="text-xs opacity-80">Powered by OpenAI</div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 md:px-12 py-12">
          {/* Stepper Platzhalter */}
          <div className="mb-12">
            {/* <Stepper /> */}
          </div>
          {children}
        </main>
      </body>
    </html>
  );
}

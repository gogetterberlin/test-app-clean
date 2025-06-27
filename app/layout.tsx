import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-50 min-h-screen text-gray-900">
        <header className="p-4 bg-white shadow">
          <h1 className="text-xl font-bold">SEO Redirect Generator</h1>
        </header>
        <main className="max-w-4xl mx-auto p-4">{children}</main>
        <footer className="p-4 text-center text-xs text-gray-400">© {new Date().getFullYear()} SEO Redirect Generator</footer>
      </body>
    </html>
  );
}

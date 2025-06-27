import FileUpload from "./components/FileUpload";
import { useState } from "react";

export default function Home() {
  const [oldUrls, setOldUrls] = useState<string[]>([]);
  const [newUrls, setNewUrls] = useState<string[]>([]);

  return (
    <section className="py-12 text-center">
      <h2 className="text-2xl font-bold mb-4">SEO Redirect Generator</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        <FileUpload label="Alte URLs (Excel)" onFileLoaded={setOldUrls} />
        <FileUpload label="Neue URLs (Excel)" onFileLoaded={setNewUrls} />
      </div>
      <div className="mt-8">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
          disabled={!oldUrls.length || !newUrls.length}
        >
          Upload & Weiter
        </button>
      </div>
    </section>
  );
}

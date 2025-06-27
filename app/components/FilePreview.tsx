type FilePreviewProps = { urls: string[] };

export default function FilePreview({ urls }: FilePreviewProps) {
  if (!urls.length) return null;
  return (
    <div className="mt-2 text-left">
      <div className="font-semibold mb-1 text-sm text-gray-700">Vorschau (erste 5 URLs):</div>
      <ul className="bg-gray-100 rounded p-2 text-xs">
        {urls.slice(0, 5).map((url, i) => (
          <li key={i} className="truncate">{url}</li>
        ))}
      </ul>
    </div>
  );
}

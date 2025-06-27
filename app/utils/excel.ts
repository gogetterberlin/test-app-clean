import * as XLSX from 'xlsx';

export async function readExcelFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const urls = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        .flat()
        .filter((url: string) => typeof url === 'string' && url.startsWith('http'));
      resolve(urls);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function validateUrls(urls: string[]): string[] {
  return urls.filter(url => /^https?:\/\/.+\..+/.test(url));
}

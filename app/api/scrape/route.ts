import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../supabase/client';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

function extractMetaDescription(document: Document): string | null {
  // Suche nach verschiedenen Varianten
  const metaTags = Array.from(document.getElementsByTagName('meta'));
  for (const tag of metaTags) {
    const name = tag.getAttribute('name')?.toLowerCase();
    const property = tag.getAttribute('property')?.toLowerCase();
    if (name === 'description' || property === 'og:description') {
      const content = tag.getAttribute('content');
      if (content) return content;
    }
  }
  return null;
}

function extractH1Heading(document: Document): string | null {
  const h1 = document.querySelector('h1');
  return h1 ? h1.textContent?.trim() || null : null;
}

async function fetchTitleStatusContentAndMeta(url: string): Promise<{ title: string | null, status: number, main_content: string | null, meta_description: string | null, h1_heading: string | null }> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const status = res.status;
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    const metaDescription = extractMetaDescription(dom.window.document);
    const h1Heading = extractH1Heading(dom.window.document);
    // Debug-Log (optional):
    console.log(`[Scrape] ${url} | Meta: ${metaDescription} | H1: ${h1Heading}`);
    return {
      title: article?.title || null,
      status,
      main_content: article?.textContent || null,
      meta_description: metaDescription,
      h1_heading: h1Heading,
    };
  } catch {
    return { title: null, status: 0, main_content: null, meta_description: null, h1_heading: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { batchId } = await req.json();
    if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });

    // Alle neuen URLs für diesen Batch holen
    const { data: urls, error } = await supabase
      .from('urls')
      .select('id, url')
      .eq('batch_id', batchId)
      .eq('type', 'new');
    if (error) throw error;

    // Für jede URL: Status, Title, Main Content, Meta Description und H1 holen
    for (const row of urls) {
      const { title, status, main_content, meta_description, h1_heading } = await fetchTitleStatusContentAndMeta(row.url);
      await supabase.from('urls').update({ title, status_code: status, main_content, meta_description, h1_heading }).eq('id', row.id);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
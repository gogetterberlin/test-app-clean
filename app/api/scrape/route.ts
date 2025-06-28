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
  // Fallback: Erstes Meta-Tag mit Content
  for (const tag of metaTags) {
    const content = tag.getAttribute('content');
    if (content) return content;
  }
  return null;
}

function extractH1Heading(document: Document): string | null {
  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent) return h1.textContent.trim();
  // Fallback: Erstes Element mit großer Schrift
  const candidates = Array.from(document.querySelectorAll('[style*="font-size"]'));
  for (const el of candidates) {
    if ((el as HTMLElement).innerText && (el as HTMLElement).innerText.length > 10) {
      return (el as HTMLElement).innerText.trim();
    }
  }
  return null;
}

function extractTitle(document: Document): string | null {
  // Readability-Title ist oft besser, aber fallback auf <title>
  const title = document.querySelector('title');
  return title?.textContent?.trim() || null;
}

function extractMainContent(document: Document): string | null {
  // Readability versuchen
  try {
    const reader = new Readability(document);
    const article = reader.parse();
    if (article?.textContent && article.textContent.length > 80) return article.textContent;
  } catch {}
  // Fallback: Haupt-Content-Container
  const main = document.querySelector('main');
  if (main && main.textContent && main.textContent.length > 80) return main.textContent.trim();
  // Fallback: Längster <p>-Block
  let longest = '';
  document.querySelectorAll('p').forEach(p => {
    if (p.textContent && p.textContent.length > longest.length) longest = p.textContent;
  });
  if (longest.length > 40) return longest.trim();
  // Fallback: Body-Text
  const body = document.body?.textContent;
  if (body && body.length > 40) return body.trim();
  return null;
}

async function fetchTitleStatusContentAndMeta(url: string): Promise<{ title: string | null, status: number, main_content: string | null, meta_description: string | null, h1_heading: string | null }> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const status = res.status;
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    // Readability + Fallbacks
    let title = null;
    let main_content = null;
    try {
      const reader = new Readability(doc);
      const article = reader.parse();
      title = article?.title || null;
      main_content = article?.textContent || null;
    } catch {}
    // Fallbacks falls leer
    if (!title) title = extractTitle(doc);
    if (!main_content || main_content.length < 40) main_content = extractMainContent(doc);
    const metaDescription = extractMetaDescription(doc);
    const h1Heading = extractH1Heading(doc);
    // Debug-Log
    console.log(`[Scrape] ${url} | Title: ${title} | Meta: ${metaDescription} | H1: ${h1Heading} | Main: ${main_content?.slice(0, 60)}`);
    return {
      title,
      status,
      main_content,
      meta_description: metaDescription,
      h1_heading: h1Heading,
    };
  } catch (e) {
    console.error('[Scrape Error]', url, e);
    return { title: null, status: 0, main_content: null, meta_description: null, h1_heading: null };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { batchId, maxRows } = await req.json();
    if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });

    // Beide Typen holen
    const { data: oldUrls, error: oldError } = await supabase
      .from('urls')
      .select('id, url')
      .eq('batch_id', batchId)
      .eq('type', 'old');
    if (oldError) throw oldError;
    const { data: newUrls, error: newError } = await supabase
      .from('urls')
      .select('id, url')
      .eq('batch_id', batchId)
      .eq('type', 'new');
    if (newError) throw newError;

    // Nur die ersten maxRows URLs pro Typ verarbeiten (wenn gesetzt)
    const limitedOld = maxRows ? oldUrls.slice(0, maxRows) : oldUrls;
    const limitedNew = maxRows ? newUrls.slice(0, maxRows) : newUrls;

    // Scrape alt
    for (const row of limitedOld) {
      const { title, status, main_content, meta_description, h1_heading } = await fetchTitleStatusContentAndMeta(row.url);
      await supabase.from('urls').update({ title, status_code: status, main_content, meta_description, h1_heading }).eq('id', row.id);
    }
    // Scrape neu
    for (const row of limitedNew) {
      const { title, status, main_content, meta_description, h1_heading } = await fetchTitleStatusContentAndMeta(row.url);
      await supabase.from('urls').update({ title, status_code: status, main_content, meta_description, h1_heading }).eq('id', row.id);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
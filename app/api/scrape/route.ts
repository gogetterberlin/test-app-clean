import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../supabase/client';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

async function fetchTitleStatusAndContent(url: string): Promise<{ title: string | null, status: number, main_content: string | null }> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const status = res.status;
    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return {
      title: article?.title || null,
      status,
      main_content: article?.textContent || null,
    };
  } catch {
    return { title: null, status: 0, main_content: null };
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

    // Für jede URL: Status, Title und Main Content holen
    for (const row of urls) {
      const { title, status, main_content } = await fetchTitleStatusAndContent(row.url);
      await supabase.from('urls').update({ title, status_code: status, main_content }).eq('id', row.id);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
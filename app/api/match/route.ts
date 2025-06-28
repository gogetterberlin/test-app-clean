import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../supabase/client';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 256,
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function buildPrompt(oldUrl: any, newUrls: any[]): string {
  return `Du bist ein SEO-Experte. Finde für die folgende alte URL die beste neue URL als 301-Redirect-Ziel. Berücksichtige Titel, Haupttext, Meta Description und H1. Gib nur die beste neue URL als Antwort zurück.\n\nAlte URL:\nURL: ${oldUrl.url}\nTitel: ${oldUrl.title}\nMeta: ${oldUrl.meta_description}\nH1: ${oldUrl.h1_heading}\nText: ${oldUrl.main_content}\n\nNeue URLs:\n${newUrls.map((n, i) => `(${i+1}) URL: ${n.url}\nTitel: ${n.title}\nMeta: ${n.meta_description}\nH1: ${n.h1_heading}\nText: ${n.main_content}`).join('\n---\n')}\n\nAntwort: Gib nur die URL der besten neuen Seite zurück.`;
}

export async function POST(req: NextRequest) {
  try {
    const { batchId } = await req.json();
    if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 });

    // Alte URLs holen
    const { data: oldUrls, error: oldError } = await supabase
      .from('urls')
      .select('*')
      .eq('batch_id', batchId)
      .eq('type', 'old')
      .order('order', { ascending: true });
    if (oldError) throw oldError;

    // Neue URLs holen (ALLE, nicht nur gescrapte)
    const { data: newUrls, error: newError } = await supabase
      .from('urls')
      .select('*')
      .eq('batch_id', batchId)
      .eq('type', 'new')
      .order('order', { ascending: true });
    if (newError) throw newError;

    // Debug: Ausgabe der echten Scrape-Ergebnisse
    console.log('--- MATCHING DEBUG ---');
    console.log('BatchId:', batchId);
    console.log('Alte URLs:', JSON.stringify(oldUrls, null, 2));
    console.log('Neue URLs:', JSON.stringify(newUrls, null, 2));

    // Für jede alte URL: Matching durchführen
    for (const oldUrl of oldUrls) {
      const prompt = buildPrompt(oldUrl, newUrls);
      console.log('Prompt:', prompt);
      const bestNewUrl = await callOpenAI(prompt);
      console.log('AI Antwort:', bestNewUrl);
      const match = newUrls.find(n => bestNewUrl.includes(n.url));
      if (match) {
        const { error: insertError } = await supabase.from('redirects').insert({
          batch_id: batchId,
          old_url_id: oldUrl.id,
          new_url_id: match.id,
          confidence_score: 1.0,
          match_type: 'ai',
        });
        if (insertError) {
          console.error('Fehler beim Insert:', insertError, 'Für:', oldUrl.url, '->', match.url);
        } else {
          console.log('Redirect gespeichert:', oldUrl.url, '->', match.url);
        }
      } else {
        console.warn('Kein Match gefunden für:', oldUrl.url, '| AI Antwort:', bestNewUrl);
      }
    }

    console.log('--- MATCHING ENDE ---');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Fehler im Matching:', e);
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
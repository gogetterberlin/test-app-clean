import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { batchName, oldUrls, newUrls } = await req.json();
    if (!batchName || !Array.isArray(oldUrls) || !Array.isArray(newUrls)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // 1. Batch anlegen
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert([{ name: batchName }])
      .select()
      .single();
    if (batchError) throw batchError;

    // 2. URLs speichern
    const urlRows = [
      ...oldUrls.map((url: string) => ({ batch_id: batch.id, url, type: 'old' })),
      ...newUrls.map((url: string) => ({ batch_id: batch.id, url, type: 'new' })),
    ];
    const { error: urlError } = await supabase.from('urls').insert(urlRows);
    if (urlError) throw urlError;

    return NextResponse.json({ success: true, batchId: batch.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
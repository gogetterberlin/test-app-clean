import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('redirects')
    .select('id, old_url:old_url_id(url), new_url:new_url_id(url), confidence_score, match_type')
    .eq('batch_id', batchId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Array/Objekt-Relationen normalisieren
  const normalized = (data || []).map((r: any) => ({
    ...r,
    old_url: Array.isArray(r.old_url) ? r.old_url[0] : r.old_url,
    new_url: Array.isArray(r.new_url) ? r.new_url[0] : r.new_url,
  }));
  return NextResponse.json({ data: normalized });
} 
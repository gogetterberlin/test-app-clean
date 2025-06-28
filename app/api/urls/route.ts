import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('batchId');
  const type = searchParams.get('type'); // 'old' | 'new' | undefined
  if (!batchId) {
    return NextResponse.json({ error: 'batchId required' }, { status: 400 });
  }
  let query = supabase.from('urls').select('*').eq('batch_id', batchId);
  if (type) query = query.eq('type', type);
  query = query.order('order', { ascending: true });
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
} 
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabase/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batch_id = searchParams.get('batch_id');
    if (!batch_id) {
      return NextResponse.json({ error: 'batch_id ist erforderlich' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('scraped_pages')
      .select('*')
      .eq('batch_id', batch_id)
      .order('site_type', { ascending: true })
      .order('url', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { batch_id, url, site_type, meta_title, meta_description, content_text, scraped_at, scraping_status } = body;
    if (!batch_id || !url) {
      return NextResponse.json({ error: 'batch_id und url sind erforderlich' }, { status: 400 });
    }
    const { error } = await supabase.from('scraped_pages').upsert([
      { batch_id, url, site_type, meta_title, meta_description, content_text, scraped_at, scraping_status }
    ], { onConflict: 'batch_id,url' });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
} 
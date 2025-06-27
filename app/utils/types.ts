export type ScrapedPage = {
  id: string;
  url: string;
  site_type: 'old' | 'new';
  meta_title: string | null;
  meta_description: string | null;
  content_text: string | null;
  scraped_at: string;
  scraping_status: string;
};

export type UrlMapping = {
  id: string;
  old_url: string;
  new_url: string;
  confidence_score: number;
  match_reasoning: string;
  match_type: 'exact' | 'ai' | 'manual';
  created_at: string;
};

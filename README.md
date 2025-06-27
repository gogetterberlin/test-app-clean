# SEO Redirect Generator

Ein Next.js 14 App-Router Projekt für intelligente 301-Redirect-Mappings mit Excel-Upload, Supabase, OpenAI, Web Scraping und Dashboard.

## Features
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Supabase Integration
- OpenAI API Integration
- Excel File Processing (xlsx)
- Web Scraping Pipeline (Playwright, extruct, goose3)
- 3-Step Dashboard: Upload → Batch-Konfiguration → Ergebnisse
- Export als .htaccess, Nginx, CSV

## Setup
1. `.env.local` anlegen (siehe `.env.example`)
2. `npm install`
3. `npm run dev`

## Deployment
- Empfohlen: Vercel
- Supabase & OpenAI Keys im Vercel-Dashboard hinterlegen

## Supabase Tabellen
- `scraped_pages`
- `url_mappings`

## Lizenz
MIT

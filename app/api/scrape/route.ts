import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

interface ScrapeBody {
  industry?: string;
  location?: string;
  advancedQuery?: string;
  maxResults?: number;
}

interface DuckDuckGoResult {
  title: string;
  url: string;
  snippet: string;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX =
  /(?<!\d)(?:\+\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d{3}[ -]?\d{2,4}[ -]?\d{2,4}(?!\d)/g;

function buildQuery({ industry, location, advancedQuery }: ScrapeBody) {
  const queryParts = [
    industry?.trim(),
    location?.trim(),
    advancedQuery?.trim()
  ].filter(Boolean);
  return queryParts.join(' ');
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').replace(/[^\x20-\x7E]+/g, '').trim();
}

function resolveDuckDuckGoUrl(href: string) {
  if (!href) {
    return '';
  }

  if (href.startsWith('http')) {
    return href;
  }

  const uddgMatch = href.match(/uddg=([^&]+)/);
  if (uddgMatch?.[1]) {
    try {
      return decodeURIComponent(uddgMatch[1]);
    } catch {
      return '';
    }
  }

  return '';
}

async function fetchWithTimeout(url: string, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html'
      },
      signal: controller.signal,
      cache: 'no-store'
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

async function getDuckDuckGoResults(
  query: string,
  maxResults: number
): Promise<DuckDuckGoResult[]> {
  const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(
    query
  )}&ia=web`;

  const response = await fetchWithTimeout(searchUrl);

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const results: DuckDuckGoResult[] = [];

  $('#links .result').each((_, element) => {
    const title = normalizeText($(element).find('.result__a').text());
    const snippet = normalizeText($(element).find('.result__snippet').text());
    const href = $(element).find('.result__a').attr('href');
    const url = resolveDuckDuckGoUrl(href ?? '');

    if (title && snippet && url) {
      results.push({
        title,
        snippet,
        url: url.startsWith('http') ? url : `https://${url}`
      });
    }
  });

  return results.slice(0, maxResults);
}

async function enrichLead(url: string) {
  try {
    const response = await fetchWithTimeout(url, 12000);
    if (!response.ok) {
      return { emails: [], phones: [] };
    }
    const html = await response.text();
    const emails = Array.from(new Set(html.match(EMAIL_REGEX) || [])).slice(
      0,
      5
    );
    const phones = Array.from(new Set(html.match(PHONE_REGEX) || [])).slice(
      0,
      5
    );
    return {
      emails,
      phones
    };
  } catch {
    return { emails: [], phones: [] };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScrapeBody;
    const query = buildQuery(body);
    const maxResults = Math.min(Math.max(body.maxResults ?? 5, 3), 20);

    if (query.length < 3) {
      return NextResponse.json(
        { error: 'Industry and location are required to build a query.' },
        { status: 400 }
      );
    }

    const searchResults = await getDuckDuckGoResults(query, maxResults);

    const enriched = await Promise.all(
      searchResults.map(async (result) => {
        const { emails, phones } = await enrichLead(result.url);
        let host = result.url;
        try {
          host = new URL(result.url).hostname.replace(/^www\./, '');
        } catch {
          host = result.url;
        }

        return {
          ...result,
          emails,
          phones,
          source: host
        };
      })
    );

    return NextResponse.json({
      leads: enriched,
      meta: {
        query,
        executedAt: new Date().toISOString(),
        processedSources: searchResults.length
      }
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

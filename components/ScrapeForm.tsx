"use client";

import { ReactNode, useMemo, useState } from 'react';
import { LeadResultCard } from './LeadResultCard';

interface Lead {
  title: string;
  url: string;
  snippet: string;
  emails: string[];
  phones: string[];
  source: string;
}

interface ScrapePayload {
  industry: string;
  location: string;
  advancedQuery?: string;
  maxResults: number;
}

interface ScrapeResponse {
  leads: Lead[];
  meta: {
    query: string;
    executedAt: string;
    processedSources: number;
  };
}

const MAX_RESULTS_OPTIONS = [5, 10, 15];

function sanitize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

const initialState: ScrapeResponse = {
  leads: [],
  meta: {
    query: '',
    executedAt: '',
    processedSources: 0
  }
};

export function ScrapeForm() {
  const [formState, setFormState] = useState<ScrapePayload>({
    industry: '',
    location: '',
    advancedQuery: '',
    maxResults: MAX_RESULTS_OPTIONS[0]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<ScrapeResponse>(initialState);

  const handleChange = (field: keyof ScrapePayload) => (value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: field === 'maxResults' ? Number(value) : value
    }));
  };

  const isSubmitDisabled = useMemo(() => {
    return (
      isLoading ||
      sanitize(formState.industry).length < 2 ||
      sanitize(formState.location).length < 2
    );
  }, [formState.industry, formState.location, isLoading]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          industry: sanitize(formState.industry),
          location: sanitize(formState.location),
          advancedQuery: sanitize(formState.advancedQuery ?? ''),
          maxResults: formState.maxResults
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error ?? 'Unable to complete scrape');
      }

      const result: ScrapeResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMeta = (): ReactNode => {
    if (!data.meta.query) {
      return null;
    }

    return (
      <div className="tips">
        <strong>Results ready</strong>
        <span>
          Query <code>{data.meta.query}</code> processed at{' '}
          {new Date(data.meta.executedAt).toLocaleTimeString()} using{' '}
          {data.meta.processedSources} open sources.
        </span>
      </div>
    );
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        <label>
          Industry focus
          <input
            placeholder="e.g. renewable energy, SaaS, craft coffee"
            value={formState.industry}
            onChange={(event) => handleChange('industry')(event.target.value)}
          />
        </label>
        <label>
          Geography or niche
          <input
            placeholder="e.g. Austin, remote-friendly, B2B"
            value={formState.location}
            onChange={(event) => handleChange('location')(event.target.value)}
          />
        </label>
        <label>
          Advanced prompt (optional)
          <textarea
            placeholder="Add filters such as target revenue, hiring status, company size, etc."
            value={formState.advancedQuery}
            onChange={(event) =>
              handleChange('advancedQuery')(event.target.value)
            }
          />
        </label>
        <label>
          Sources to analyze
          <select
            value={formState.maxResults}
            onChange={(event) => handleChange('maxResults')(event.target.value)}
          >
            {MAX_RESULTS_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} sources
              </option>
            ))}
          </select>
        </label>
        <button className="cta-button" type="submit" disabled={isSubmitDisabled}>
          {isLoading ? 'Scanning open web…' : 'Generate lead list'}
        </button>
        {error && (
          <p role="alert" className="empty-state">
            {error}
          </p>
        )}
      </form>
      {renderMeta()}
      <section className="lead-results">
        {data.leads.length === 0 && !error && !isLoading && (
          <p className="empty-state">
            Provide an industry and geography to assemble a targeted lead list
            using zero-cost public web signals.
          </p>
        )}
        {data.leads.map((lead) => (
          <LeadResultCard key={lead.url} lead={lead} />
        ))}
      </section>
    </>
  );
}

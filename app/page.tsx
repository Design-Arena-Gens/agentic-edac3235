import { ScrapeForm } from '@/components/ScrapeForm';

export default function Home() {
  return (
    <main>
      <section>
        <h1>Open Lead Scout</h1>
        <p>
          Build curated lists of potential customers in any industry using only
          open web intelligence. No paid APIs, no scraping services—just smart
          prompts, public sources, and automated enrichment.
        </p>
      </section>
      <ScrapeForm />
    </main>
  );
}

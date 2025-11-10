interface LeadResultCardProps {
  lead: {
    title: string;
    url: string;
    snippet: string;
    emails: string[];
    phones: string[];
    source: string;
  };
}

export function LeadResultCard({ lead }: LeadResultCardProps) {
  return (
    <article className="lead-card">
      <header>
        <h3>
          <a href={lead.url} target="_blank" rel="noreferrer">
            {lead.title}
          </a>
        </h3>
        <span className="source">{lead.source}</span>
      </header>
      <p>{lead.snippet}</p>
      <div className="contact-group">
        {lead.emails.length > 0 && (
          <section>
            <strong>Emails</strong>
            <ul>
              {lead.emails.map((email) => (
                <li key={email}>
                  <a href={`mailto:${email}`}>{email}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
        {lead.phones.length > 0 && (
          <section>
            <strong>Phones</strong>
            <ul>
              {lead.phones.map((phone) => (
                <li key={phone}>
                  <a href={`tel:${phone}`}>{phone}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}

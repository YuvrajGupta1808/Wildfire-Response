'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f1ea', color: '#1c1917' }}>
        <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>SafeSignal hit a server error</h1>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#57534e' }}>
            {error.message || 'The app could not render. Try reloading or clearing the .next cache.'}
          </p>
          {error.digest ? (
            <p style={{ marginTop: '0.75rem', fontFamily: 'monospace', fontSize: '11px', color: '#a8a29e' }}>
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: '1.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#d94f21',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

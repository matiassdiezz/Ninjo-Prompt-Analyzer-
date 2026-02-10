'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0d1117',
          color: '#e6edf3',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Algo salio mal
            </h2>
            <p style={{ fontSize: '14px', color: '#8b949e', marginBottom: '24px' }}>
              Ocurrio un error critico. Intenta recargar la pagina.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#00d4aa',
                color: '#0a0e14',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

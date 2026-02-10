'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="text-center max-w-md">
        <div
          className="mx-auto mb-4 h-14 w-14 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--error-subtle)' }}
        >
          <AlertCircle className="h-7 w-7" style={{ color: 'var(--error)' }} />
        </div>
        <h2
          className="text-lg font-semibold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          Algo salio mal
        </h2>
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          Ocurrio un error inesperado. Intenta recargar la pagina.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'var(--accent-primary)',
            color: '#0a0e14',
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
      </div>
    </div>
  );
}

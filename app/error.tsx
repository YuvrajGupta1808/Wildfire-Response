'use client';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#f4f1ea] px-6 py-16 text-center text-stone-900">
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-sm leading-6 text-stone-600">
        {error.message || 'An unexpected error occurred while rendering this page.'}
      </p>
      {error.digest ? (
        <p className="font-mono text-[11px] text-stone-400">Reference: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-[#d94f21] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#bd431b]"
      >
        Try again
      </button>
    </div>
  );
}

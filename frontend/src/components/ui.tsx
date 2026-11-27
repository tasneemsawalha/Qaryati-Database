import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ReviewStatus } from '../api/types';
import { ApiError } from '../api/client';

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return status === 'VERIFIED' ? (
    <span className="badge badge-verified" title="تمت مراجعته من مدقق">
      ✓ موثّق
    </span>
  ) : (
    <span className="badge badge-draft" title="لم تتم مراجعته بعد">
      مسودة
    </span>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError || error instanceof Error ? error.message : String(error);
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div className="alert" role="alert">
      {message}
      {requestId && <small className="muted"> (رقم الطلب: {requestId})</small>}
    </div>
  );
}

export function Loading() {
  return <div className="loading">جارٍ التحميل…</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="الصفحات">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        السابق
      </button>
      <span>
        صفحة {page} من {totalPages}
      </span>
      <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        التالي
      </button>
    </nav>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

/** Runs an async action, tracking busy state and errors for a button. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

/** Renders a source string; a trailing URL becomes a short link to the reference. */
export function SourceText({ text }: { text: string }) {
  const match = /^(.*?)\s*(?:—|-)?\s*(https?:\/\/\S+)(.*)$/s.exec(text);
  if (!match) return <>{text}</>;
  const [, label, url, rest] = match;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw url */
  }
  return (
    <>
      {label || host}{' '}
      <a href={url} target="_blank" rel="noreferrer" className="source-link" title={url}>
        {host} ↗
      </a>
      {rest}
    </>
  );
}

export function Source({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="source">
      المصدر: {typeof children === 'string' ? <SourceText text={children} /> : children}
    </p>
  );
}

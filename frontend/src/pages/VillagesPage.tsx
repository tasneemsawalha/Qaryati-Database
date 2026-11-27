import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { villages, type VillageQuery } from '../api/endpoints';
import type { Page, Village } from '../api/types';
import { Empty, ErrorBox, Loading, Pagination, StatusBadge } from '../components/ui';
import { GOVERNORATES } from '../labels';

export default function VillagesPage() {
  const [params, setParams] = useSearchParams();
  const query: VillageQuery = {
    page: Number(params.get('page') ?? 1),
    limit: 12,
    search: params.get('search') ?? undefined,
    governorate: params.get('governorate') ?? undefined,
    sortBy: (params.get('sortBy') as VillageQuery['sortBy']) ?? 'arabicName',
    order: (params.get('order') as VillageQuery['order']) ?? 'asc',
  };
  const [result, setResult] = useState<Page<Village> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState(query.search ?? '');
  const key = params.toString();

  useEffect(() => {
    let alive = true;
    setError(null);
    villages
      .list(query)
      .then((r) => alive && setResult(r))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [key]);

  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  }

  return (
    <>
      <section className="hero">
        <h1>قرى فلسطين، كما يرويها أهلها والمصادر</h1>
        <p>
          ابحثي عن قرية بالاسم العربي أو الإنجليزي أو بأي اسم قديم أو بديل، وتصفّحي تاريخها
          وسكانها ومعالمها — كل معلومة مع مصدرها.
        </p>
        <form
          className="searchbar"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: search.trim() || undefined });
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="مثلاً: بيتا، Burqa، عين…"
            aria-label="بحث"
          />
          <button type="submit">بحث</button>
        </form>
      </section>

      <div className="filters">
        <select
          value={query.governorate ?? ''}
          onChange={(e) => update({ governorate: e.target.value || undefined })}
          aria-label="المحافظة"
        >
          <option value="">كل المحافظات</option>
          {GOVERNORATES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <select
          value={`${query.sortBy}:${query.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split(':');
            update({ sortBy, order });
          }}
          aria-label="الترتيب"
        >
          <option value="arabicName:asc">الاسم العربي (أ ← ي)</option>
          <option value="arabicName:desc">الاسم العربي (ي ← أ)</option>
          <option value="englishName:asc">English name (A → Z)</option>
          <option value="createdAt:desc">الأحدث إضافة</option>
        </select>
        {result && <span className="muted">{result.meta.total} قرية</span>}
      </div>

      <ErrorBox error={error} />
      {!result && !error && <Loading />}
      {result && result.data.length === 0 && <Empty>لا توجد قرى مطابقة.</Empty>}
      <div className="grid">
        {result?.data.map((v) => (
          <Link key={v.id} to={`/villages/${v.id}`} className="card village-card">
            <div className="card-head">
              <h3>{v.arabicName}</h3>
              <StatusBadge status={v.status} />
            </div>
            {v.englishName && <p className="latin">{v.englishName}</p>}
            <p className="muted">
              محافظة {v.governorate}
              {v.localCouncil && ` · ${v.localCouncil}`}
            </p>
            {v.aliases.length > 0 && (
              <p className="aliases">
                يُعرف أيضاً: {v.aliases.map((a) => a.value).join('، ')}
              </p>
            )}
          </Link>
        ))}
      </div>
      {result && (
        <Pagination
          page={result.meta.page}
          totalPages={result.meta.totalPages}
          onChange={(p) => update({ page: String(p) })}
        />
      )}
    </>
  );
}

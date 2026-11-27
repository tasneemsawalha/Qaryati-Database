import { useEffect, useState } from 'react';
import { villages } from '../api/endpoints';
import { Empty, ErrorBox, Loading } from '../components/ui';

export default function StatsPage() {
  const [rows, setRows] = useState<{ governorate: string; count: number }[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    villages.stats().then(setRows).catch(setError);
  }, []);
  const max = Math.max(1, ...(rows ?? []).map((r) => r.count));
  const total = (rows ?? []).reduce((s, r) => s + r.count, 0);
  return (
    <section>
      <h1>عدد القرى حسب المحافظة</h1>
      <p className="muted">
        هذه الصفحة تستخدم استعلام SQL مباشر في الباك إند (GROUP BY) — المجموع: {total}
      </p>
      <ErrorBox error={error} />
      {!rows && !error && <Loading />}
      {rows?.length === 0 && <Empty>لا توجد بيانات بعد.</Empty>}
      <div className="bars">
        {rows?.map((r) => (
          <div key={r.governorate} className="bar-row">
            <span className="bar-label">{r.governorate}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${(r.count / max) * 100}%` }} />
            </span>
            <span className="bar-value">{r.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

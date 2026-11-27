import { useCallback, useEffect, useState } from 'react';
import { population } from '../api/endpoints';
import type { Page, PopulationRecord } from '../api/types';
import { useAuth } from '../auth';
import { fmtNumber } from '../labels';
import { Empty, ErrorBox, Field, Loading, StatusBadge, useAction } from './ui';

interface Draft {
  year: string;
  population: string;
  source: string;
  notes: string;
}
const blank: Draft = { year: '', population: '', source: '', notes: '' };

export default function PopulationSection({ villageId }: { villageId: number }) {
  const { can } = useAuth();
  const [page, setPage] = useState<Page<PopulationRecord> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<PopulationRecord | 'new' | null>(null);
  const action = useAction();

  const load = useCallback(() => {
    population.list(villageId).then(setPage).catch(setLoadError);
  }, [villageId]);
  useEffect(load, [load]);

  if (loadError) return <ErrorBox error={loadError} />;
  if (!page) return <Loading />;

  // Several sources may report different figures for the same year; show them side by side.
  const years = new Map<number, number>();
  for (const r of page.data) years.set(r.year, (years.get(r.year) ?? 0) + 1);
  const max = Math.max(1, ...page.data.map((r) => r.population));

  return (
    <section className="card">
      <div className="section-head">
        <h2>السجل السكاني</h2>
        {can('EDITOR', 'ADMIN') && editing === null && (
          <button onClick={() => setEditing('new')}>+ إضافة سجل</button>
        )}
      </div>
      <p className="muted">
        كل رقم مرتبط بسنة ومصدر. إذا اختلفت المصادر لنفس السنة تُحفظ كل الأرقام ولا يُستبدل
        أحدها بالآخر.
      </p>
      {editing && (
        <PopulationForm
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(body) =>
            action.run(async () => {
              if (editing === 'new') await population.create(villageId, body);
              else
                await population.update(villageId, editing.id, {
                  ...body,
                  version: editing.version,
                });
              setEditing(null);
              load();
            })
          }
          busy={action.busy}
        />
      )}
      <ErrorBox error={action.error} />
      {page.data.length === 0 ? (
        <Empty>لا توجد سجلات سكانية بعد.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>السنة</th>
              <th>عدد السكان</th>
              <th>المصدر</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {page.data.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.year}
                  {(years.get(r.year) ?? 0) > 1 && (
                    <span className="badge badge-warn" title="أكثر من مصدر لنفس السنة">
                      مصادر متعددة
                    </span>
                  )}
                </td>
                <td>
                  <div className="mini-bar">
                    <span style={{ width: `${(r.population / max) * 100}%` }} />
                  </div>
                  {fmtNumber(r.population)}
                </td>
                <td>
                  {r.source}
                  {r.notes && <small className="muted d-block">{r.notes}</small>}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td className="row-actions">
                  {can('EDITOR', 'ADMIN') && (
                    <button className="link" onClick={() => setEditing(r)}>
                      تعديل
                    </button>
                  )}
                  {can('VERIFIER', 'ADMIN') && r.status === 'DRAFT' && (
                    <button
                      className="link"
                      onClick={() =>
                        action.run(async () => {
                          await population.verify(villageId, r.id, r.version);
                          load();
                        })
                      }
                    >
                      توثيق
                    </button>
                  )}
                  {can('ADMIN') && (
                    <button
                      className="link danger"
                      onClick={() =>
                        confirm('حذف هذا السجل؟') &&
                        action.run(async () => {
                          await population.remove(villageId, r.id, r.version);
                          load();
                        })
                      }
                    >
                      حذف
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PopulationForm({
  initial,
  onSave,
  onCancel,
  busy,
}: {
  initial?: PopulationRecord;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [d, setD] = useState<Draft>(
    initial
      ? {
          year: String(initial.year),
          population: String(initial.population),
          source: initial.source,
          notes: initial.notes ?? '',
        }
      : blank,
  );
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setD({ ...d, [k]: e.target.value });
  return (
    <form
      className="form inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          year: Number(d.year),
          population: Number(d.population),
          source: d.source.trim(),
          notes: d.notes.trim() || (initial ? null : undefined),
        });
      }}
    >
      <div className="row">
        <Field label="السنة">
          <input
            type="number"
            required
            min={1}
            max={new Date().getFullYear()}
            value={d.year}
            onChange={set('year')}
          />
        </Field>
        <Field label="عدد السكان">
          <input type="number" required min={0} value={d.population} onChange={set('population')} />
        </Field>
      </div>
      <Field label="المصدر" hint="إلزامي: مثلاً الجهاز المركزي للإحصاء الفلسطيني، تعداد 2017">
        <input required value={d.source} onChange={set('source')} />
      </Field>
      <Field label="ملاحظات">
        <input value={d.notes} onChange={set('notes')} />
      </Field>
      <div className="form-actions">
        <button className="primary" disabled={busy}>
          حفظ
        </button>
        <button type="button" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </form>
  );
}

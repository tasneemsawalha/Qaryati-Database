import { useCallback, useEffect, useState } from 'react';
import { entries } from '../api/endpoints';
import type { EntryKind, KnowledgeEntry, Page } from '../api/types';
import { useAuth } from '../auth';
import { KIND_LABEL, KIND_SINGULAR } from '../labels';
import { Empty, ErrorBox, Field, Loading, Source, StatusBadge, useAction } from './ui';

const CATEGORY_HINT: Record<EntryKind, string> = {
  EVENT: 'مثلاً: سياسي، اجتماعي',
  LANDMARK: 'مثلاً: عين ماء، مقام، موقع أثري، مطل',
  HERITAGE: 'مثلاً: حرفة، طعام، ممارسة زراعية',
  ECONOMY: 'مثلاً: زيتون، حبوب، صناعة',
  FACILITY: 'مثلاً: مدرسة، عيادة، مكتبة، ملعب',
};

export default function EntriesSection({
  villageId,
  kind,
}: {
  villageId: number;
  kind: EntryKind;
}) {
  const { can } = useAuth();
  const [page, setPage] = useState<Page<KnowledgeEntry> | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [editing, setEditing] = useState<KnowledgeEntry | 'new' | null>(null);
  const action = useAction();

  const load = useCallback(() => {
    entries.list(villageId, kind).then(setPage).catch(setLoadError);
  }, [villageId, kind]);
  useEffect(load, [load]);

  if (loadError) return <ErrorBox error={loadError} />;
  if (!page) return <Loading />;

  return (
    <section>
      <div className="section-head">
        <h2>{KIND_LABEL[kind]}</h2>
        {can('EDITOR', 'ADMIN') && editing === null && (
          <button onClick={() => setEditing('new')}>+ إضافة {KIND_SINGULAR[kind]}</button>
        )}
      </div>
      {kind === 'FACILITY' && (
        <p className="muted">
          معلومات المرافق للتعريف فقط — المشروع ليس نظاماً لتقديم الشكاوى أو إدارة الخدمات.
        </p>
      )}
      {editing && (
        <EntryForm
          kind={kind}
          initial={editing === 'new' ? undefined : editing}
          busy={action.busy}
          onCancel={() => setEditing(null)}
          onSave={(body) =>
            action.run(async () => {
              if (editing === 'new') await entries.create(villageId, { ...body, kind });
              else
                await entries.update(villageId, editing.id, {
                  ...body,
                  version: editing.version,
                });
              setEditing(null);
              load();
            })
          }
        />
      )}
      <ErrorBox error={action.error} />
      {page.data.length === 0 && <Empty>لا توجد مدخلات بعد.</Empty>}
      <div className={kind === 'EVENT' ? 'timeline' : 'grid'}>
        {page.data.map((e) => (
          <div key={e.id} className="card entry">
            <div className="card-head">
              <h3>
                {kind === 'EVENT' && e.year != null && <span className="year">{e.year}</span>}
                {e.title}
              </h3>
              <StatusBadge status={e.status} />
            </div>
            {e.category && <span className="chip">{e.category}</span>}
            <p className="prose">{e.description}</p>
            {kind !== 'EVENT' && e.year != null && <p className="muted">السنة: {e.year}</p>}
            <Source>{e.source}</Source>
            <div className="row-actions">
              {can('EDITOR', 'ADMIN') && (
                <button className="link" onClick={() => setEditing(e)}>
                  تعديل
                </button>
              )}
              {can('VERIFIER', 'ADMIN') && e.status === 'DRAFT' && (
                <button
                  className="link"
                  onClick={() =>
                    action.run(async () => {
                      await entries.verify(villageId, e.id, e.version);
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
                    confirm(`حذف "${e.title}"؟`) &&
                    action.run(async () => {
                      await entries.remove(villageId, e.id, e.version);
                      load();
                    })
                  }
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EntryForm({
  kind,
  initial,
  busy,
  onSave,
  onCancel,
}: {
  kind: EntryKind;
  initial?: KnowledgeEntry;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    source: initial?.source ?? '',
    category: initial?.category ?? '',
    year: initial?.year?.toString() ?? '',
    latitude: initial?.latitude?.toString() ?? '',
    longitude: initial?.longitude?.toString() ?? '',
  });
  const set =
    (k: keyof typeof d) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setD({ ...d, [k]: e.target.value });
  const empty = initial ? null : undefined;
  const num = (s: string) => (s.trim() === '' ? empty : Number(s));

  return (
    <form
      className="form card inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: d.title.trim(),
          description: d.description.trim(),
          source: d.source.trim(),
          category: d.category.trim() || empty,
          year: num(d.year),
          latitude: num(d.latitude),
          longitude: num(d.longitude),
        });
      }}
    >
      <Field label="العنوان">
        <input required value={d.title} onChange={set('title')} />
      </Field>
      <Field label="الوصف">
        <textarea required rows={4} value={d.description} onChange={set('description')} />
      </Field>
      <div className="row">
        <Field label="التصنيف" hint={CATEGORY_HINT[kind]}>
          <input value={d.category} onChange={set('category')} />
        </Field>
        <Field label={kind === 'EVENT' ? 'السنة (إلزامية)' : 'السنة'}>
          <input
            type="number"
            required={kind === 'EVENT'}
            max={new Date().getFullYear()}
            value={d.year}
            onChange={set('year')}
          />
        </Field>
      </div>
      {kind !== 'EVENT' && kind !== 'ECONOMY' && (
        <div className="row">
          <Field label="خط العرض">
            <input type="number" step="any" min={-90} max={90} value={d.latitude} onChange={set('latitude')} />
          </Field>
          <Field label="خط الطول">
            <input type="number" step="any" min={-180} max={180} value={d.longitude} onChange={set('longitude')} />
          </Field>
        </div>
      )}
      <Field label="المصدر" hint="إلزامي — كتاب، أرشيف، مقابلة موثقة، موقع رسمي…">
        <input required value={d.source} onChange={set('source')} />
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

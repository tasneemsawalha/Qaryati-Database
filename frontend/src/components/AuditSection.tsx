import { useEffect, useState } from 'react';
import { villages } from '../api/endpoints';
import type { AuditLog, Page } from '../api/types';
import { ACTION_LABEL, ENTITY_LABEL, fmtDate } from '../labels';
import { Empty, ErrorBox, Loading, Pagination } from './ui';

export default function AuditSection({ villageId }: { villageId: number }) {
  const [pageNo, setPageNo] = useState(1);
  const [page, setPage] = useState<Page<AuditLog> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    villages.audit(villageId, pageNo).then(setPage).catch(setError);
  }, [villageId, pageNo]);

  if (error) return <ErrorBox error={error} />;
  if (!page) return <Loading />;
  return (
    <section className="card">
      <h2>سجل التغييرات</h2>
      <p className="muted">من غيّر ماذا ومتى — يُكتب ضمن نفس المعاملة مع التغيير نفسه.</p>
      {page.data.length === 0 && <Empty>لا توجد تغييرات مسجلة.</Empty>}
      <ul className="audit">
        {page.data.map((a) => (
          <li key={a.id}>
            <button className="link" onClick={() => setOpen(open === a.id ? null : a.id)}>
              <b className={`action action-${a.action.toLowerCase()}`}>
                {ACTION_LABEL[a.action] ?? a.action}
              </b>{' '}
              {ENTITY_LABEL[a.entity] ?? a.entity} #{a.entityId} · المستخدم #{a.actorId} ·{' '}
              <span className="muted">{fmtDate(a.createdAt)}</span>
            </button>
            {open === a.id && (
              <div className="diff">
                <div>
                  <h4>قبل</h4>
                  <pre dir="ltr">{a.before ? JSON.stringify(a.before, null, 2) : '—'}</pre>
                </div>
                <div>
                  <h4>بعد</h4>
                  <pre dir="ltr">{a.after ? JSON.stringify(a.after, null, 2) : '—'}</pre>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Pagination page={page.meta.page} totalPages={page.meta.totalPages} onChange={setPageNo} />
    </section>
  );
}

import { useState } from 'react';
import { auth } from '../api/endpoints';
import type { Role } from '../api/types';
import { useAuth } from '../auth';
import { ErrorBox, Field, useAction } from '../components/ui';
import { ROLE_LABEL } from '../labels';

export default function AdminPage() {
  const { can } = useAuth();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [done, setDone] = useState('');
  const { busy, error, run } = useAction();
  if (!can('ADMIN')) return <p className="empty">هذه الصفحة للمسؤول فقط.</p>;

  return (
    <section className="narrow card">
      <h1>تغيير صلاحية مستخدم</h1>
      <p className="muted">
        تغيير الصلاحية يُسجَّل في سجل التدقيق، ويُنهي جلسات المستخدم الحالية حتى تُطبَّق
        الصلاحية الجديدة فوراً.
      </p>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setDone('');
          const u = await run(() => auth.setRole(Number(userId), role));
          if (u) setDone(`أصبح ${u.email} ${ROLE_LABEL[u.role]}.`);
        }}
      >
        <Field label="رقم المستخدم (id)" hint="يظهر للمستخدم بعد التسجيل في /auth/me">
          <input
            type="number"
            min={1}
            required
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </Field>
        <Field label="الصلاحية">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </Field>
        <ErrorBox error={error} />
        {done && <div className="notice">{done}</div>}
        <button className="primary" disabled={busy}>
          حفظ
        </button>
      </form>
    </section>
  );
}

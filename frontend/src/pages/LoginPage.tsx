import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { auth } from '../api/endpoints';
import { ErrorBox, Field, useAction } from '../components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNote('');
    await run(async () => {
      if (mode === 'register') {
        await auth.register(email, password);
        setNote('تم إنشاء الحساب بصلاحية "قارئ". يمنحك المسؤول صلاحية التحرير أو التدقيق.');
      }
      await login(email, password);
      navigate('/');
    });
  }

  return (
    <section className="narrow card">
      <div className="tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          تسجيل الدخول
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          حساب جديد
        </button>
      </div>
      <form onSubmit={submit} className="form">
        <Field label="البريد الإلكتروني">
          <input
            type="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="كلمة المرور" hint={mode === 'register' ? '12 حرفاً على الأقل' : undefined}>
          <input
            type="password"
            dir="ltr"
            required
            minLength={mode === 'register' ? 12 : 1}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <ErrorBox error={error} />
        {note && <div className="notice">{note}</div>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'دخول' : 'إنشاء حساب'}
        </button>
      </form>
    </section>
  );
}

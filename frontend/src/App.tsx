import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { useAuth } from './auth';
import { ROLE_LABEL } from './labels';
import VillagesPage from './pages/VillagesPage';
import VillagePage from './pages/VillagePage';
import VillageFormPage from './pages/VillageFormPage';
import LoginPage from './pages/LoginPage';
import StatsPage from './pages/StatsPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const { user, logout, can } = useAuth();
  return (
    <>
      <header className="topbar">
        <div className="container topbar-inner">
          <Link to="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ◈
            </span>
            قريتي
            <small>دليل القرى الفلسطينية</small>
          </Link>
          <nav className="nav">
            <NavLink to="/" end>
              القرى
            </NavLink>
            <NavLink to="/stats">إحصائيات</NavLink>
            {can('EDITOR', 'ADMIN') && <NavLink to="/villages/new">+ قرية جديدة</NavLink>}
            {can('ADMIN') && <NavLink to="/admin">الإدارة</NavLink>}
          </nav>
          <div className="account">
            {user ? (
              <>
                <span className="who">
                  {user.email} <span className="muted">#{user.id}</span> · <b>{ROLE_LABEL[user.role]}</b>
                </span>
                <button className="link" onClick={() => void logout()}>
                  خروج
                </button>
              </>
            ) : (
              <NavLink to="/login">دخول</NavLink>
            )}
          </div>
        </div>
      </header>
      <main className="container">
        <Routes>
          <Route path="/" element={<VillagesPage />} />
          <Route path="/villages/new" element={<VillageFormPage />} />
          <Route path="/villages/:id" element={<VillagePage />} />
          <Route path="/villages/:id/edit" element={<VillageFormPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<p className="empty">الصفحة غير موجودة.</p>} />
        </Routes>
      </main>
      <footer className="footer container">
        قريتي — مشروع مساق هندسة البرمجيات المتقدمة · API: <code>/api/v1</code>
      </footer>
    </>
  );
}

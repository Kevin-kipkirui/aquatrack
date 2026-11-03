import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Home, LayoutDashboard } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function NotFoundPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.app_metadata?.role === 'admin';
  // Only offer "go back" when there is somewhere in this app to go back to.
  const canGoBack = typeof window !== 'undefined' && window.history.state?.idx > 0;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <header className="flex items-center gap-2.5 bg-navy-900 px-4 py-3 text-white sm:px-8">
        <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-1" />
        <span className="text-base font-bold tracking-tight">AquaTrack</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <Droplets className="size-7" />
          </span>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-brand-600">Error 404</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We couldn’t find the page you were looking for. It may have been moved, or the address may have a typo.
          </p>

          <p className="mx-auto mt-5 max-w-full break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
            {pathname}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {isAdmin && (
              <Link
                to={ROUTES.admin.dashboard}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <LayoutDashboard className="size-4" />
                Go to dashboard
              </Link>
            )}
            <Link
              to={ROUTES.gateway}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                isAdmin
                  ? 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50'
                  : 'bg-brand-600 text-white hover:bg-navy-900'
              }`}
            >
              <Home className="size-4" />
              Back to start
            </Link>
            {canGoBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <ArrowLeft className="size-4" />
                Go back
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
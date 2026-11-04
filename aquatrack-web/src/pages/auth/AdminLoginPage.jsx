import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES } from '../../config/roles';
import { ROUTES } from '../../config/routes';

const BRAND_IMAGE_URL = 'https://i.pinimg.com/1200x/3c/57/e3/3c57e32966f8cdf2e566a0dd7b3d4901.jpg';

function friendlyError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'The email or password is incorrect. Check them and try again.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || error?.status === 0) {
    return 'Can’t reach the server. Check your internet connection and try again.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export default function AdminLoginPage() {
  const { user, role, loading: authLoading, signInWithEmail, signOut } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already signed in as an administrator: skip the form.
  if (!authLoading && user && role === ROLES.ADMIN) {
    return <Navigate to={ROUTES.admin.dashboard} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error: signInError } = await signInWithEmail(email.trim(), password);
      if (signInError) {
        setError(friendlyError(signInError));
        return;
      }
      if (data.user.app_metadata?.role !== ROLES.ADMIN) {
        await signOut();
        setError('This account is not an administrator account. Field agents sign in from the field agent page.');
        return;
      }
      navigate(ROUTES.admin.dashboard, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen font-sans text-slate-800 lg:grid-cols-5">
      {/* ------------------------------ Brand panel ------------------------------ */}
      <section className="relative isolate flex flex-col justify-between overflow-hidden bg-navy-900 px-6 py-6 text-white sm:px-10 lg:col-span-2 lg:px-12 lg:py-12">
        {/* Background photo: always fills the panel. If it fails to load, the navy background remains. */}
        <img
          src={BRAND_IMAGE_URL}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[35%_center]"
        />
        {/* Dark overlay keeps the text readable while the photo still shows through. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/95 via-navy-900/65 to-navy-900/45"
        />

        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1.5" />
          <div className="leading-tight">
            <p className="text-xl font-extrabold tracking-tight">AquaTrack</p>
            <p className="text-sm text-brand-200">Nakuru Residents Association</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <span className="grid size-12 place-items-center rounded-xl bg-navy-800/80 text-brand-200 backdrop-blur-sm">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold leading-tight tracking-tight drop-shadow-md">
            Administrator console
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-100 drop-shadow">
            Review submitted readings, resolve flagged duplicates, manage households and generate bills for
            the association.
          </p>
        </div>

        <p className="hidden text-xs text-slate-300 lg:block">Smart Water Usage Tracking and Billing System</p>
      </section>

      {/* ------------------------------- Form panel ------------------------------- */}
      <main className="flex items-center justify-center bg-white px-6 py-10 sm:px-10 lg:col-span-3 lg:px-16">
        <div className="w-full max-w-sm">
          <Link
            to={ROUTES.gateway}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            Administrator sign in
          </h2>
          <p className="mt-2 text-sm text-slate-500">Use the email and password your association gave you.</p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-navy-900">
                Email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@association.org"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-navy-900">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Forgot your password? Ask another administrator to reset it for you.
          </p>
        </div>
      </main>
    </div>
  );
}
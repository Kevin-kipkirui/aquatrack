import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, Phone, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES } from '../../config/roles';
import { ROUTES } from '../../config/routes';

// Accepts 0712345678, 712345678, 254712345678 or +254712345678 and returns +254712345678.
function normalizeKenyanPhone(input) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  return `+254${digits}`;
}

function isValidKenyanPhone(input) {
  return /^\+254[17]\d{8}$/.test(normalizeKenyanPhone(input));
}

function friendlyError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return 'The phone number or password is incorrect. Check them and try again.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || error?.status === 0) {
    return 'Can’t reach the server. Check your mobile data or Wi-Fi and try again.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export default function AgentLoginPage() {
  const { user, role, loading: authLoading, signInWithPhone, signOut } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Already signed in as a field agent: skip the form.
  if (!authLoading && user && role === ROLES.AGENT) {
    return <Navigate to={ROUTES.agent.home} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isValidKenyanPhone(phone)) {
      setError('Enter a valid Kenyan phone number, for example 0712 345 678.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: signInError } = await signInWithPhone(normalizeKenyanPhone(phone), password);
      if (signInError) {
        setError(friendlyError(signInError));
        return;
      }
      if (data.user.app_metadata?.role !== ROLES.AGENT) {
        await signOut();
        setError('This account is not a field agent account. Administrators sign in from the administrator page.');
        return;
      }
      navigate(ROUTES.agent.home, { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-900 font-sans text-slate-800 sm:items-center sm:justify-center sm:bg-brand-50 sm:p-6">
      <div className="flex w-full flex-1 flex-col overflow-hidden sm:max-w-md sm:flex-none sm:rounded-3xl sm:shadow-xl">
        {/* ------------------------------- Header ------------------------------- */}
        <header className="bg-navy-900 px-6 pb-14 pt-8 text-white">
          <Link
            to={ROUTES.gateway}
            className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-brand-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1.5" />
            <div className="leading-tight">
              <p className="text-2xl font-extrabold tracking-tight">AquaTrack</p>
              <p className="text-sm text-brand-200">Field agent</p>
            </div>
          </div>
        </header>

        {/* -------------------------------- Form -------------------------------- */}
        <main className="-mt-6 flex flex-1 flex-col rounded-t-3xl bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:mt-0 sm:flex-none sm:rounded-none sm:pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Field agent sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in with the phone number your administrator registered.</p>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-navy-900">
                Phone number
              </label>
              <div className="relative mt-1.5">
                <Phone className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-navy-900">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-14 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !phone || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-navy-900 active:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              {submitting && <Loader2 className="size-5 animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-auto pt-8 text-xs leading-relaxed text-slate-500">
            <p>You’ll stay signed in on this device between visits.</p>
            <p className="mt-1">Forgot your password? Ask your administrator to reset it.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
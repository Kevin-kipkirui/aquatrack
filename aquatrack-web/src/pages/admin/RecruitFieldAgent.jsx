import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Check,
  CircleCheck,
  Copy,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Phone,
  Receipt,
  RefreshCw,
  Settings,
  TriangleAlert,
  User,
  UserPlus,
  Users,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { ROLES } from '../../config/roles';
import { useAuth } from '../../auth/AuthProvider';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Accepts 0712345678, 712345678, 254712345678 or +254712345678 -> +254712345678
function normalizeKenyanPhone(input) {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  return `+254${digits}`;
}

function isValidKenyanPhone(input) {
  return /^\+254[17]\d{8}$/.test(normalizeKenyanPhone(input));
}

// 10 characters, no look-alikes (0/O, 1/l/I), generated with the browser's crypto.
function generatePassword(length = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => alphabet[v % alphabet.length]).join('');
}

function friendlyError(message) {
  const msg = (message || '').toLowerCase();
  if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
    return 'A user with this phone number already exists. Check the number, or look for the agent under User Management.';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Can’t reach the server. Check your internet connection and try again.';
  }
  return message || 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function RecruitFieldAgent() {
  const a = ROUTES.admin;
  const { user, session, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(() => generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { fullName, phone, password }
  const [copied, setCopied] = useState('');

  const adminName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator';

  const navItems = [
    { label: 'Dashboard', to: a.dashboard, icon: LayoutDashboard },
    { label: 'Meter Readings', to: a.readings, icon: Gauge },
    { label: 'Households', to: a.households, icon: Home },
    { label: 'Billing & Payments', to: a.billing, icon: Receipt },
    { label: 'Reports & Analytics', to: a.reports, icon: BarChart3 },
    { label: 'User Management', to: a.users, icon: Users },
    { label: 'Recruit Field Agent', to: a.recruitAgent, icon: UserPlus },
    { label: 'Settings', to: a.settings, icon: Settings },
  ];

  async function copyText(key, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Enter the agent’s full name.');
      return;
    }
    if (!isValidKenyanPhone(phone)) {
      setError('Enter a valid Kenyan phone number, for example 0712 345 678.');
      return;
    }
    if (password.length < 8) {
      setError('The temporary password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const normalizedPhone = normalizeKenyanPhone(phone);
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          role: ROLES.AGENT,
          fullName: fullName.trim(),
          phone: normalizedPhone,
          password,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `The server answered with status ${res.status}.`);

      setCreated({ fullName: fullName.trim(), phone: normalizedPhone, password });
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  function recruitAnother() {
    setFullName('');
    setPhone('');
    setPassword(generatePassword());
    setShowPassword(true);
    setError('');
    setCreated(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* ------------------------------ Mobile top bar ------------------------------ */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-1" />
          <span className="text-base font-bold tracking-tight">AquaTrack</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --------------------------------- Sidebar --------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1.5" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
              <p className="text-xs text-brand-200">Nakuru Residents Assoc.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 hover:bg-navy-800 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-brand-200">Signed in as</p>
          <p className="truncate text-sm font-semibold">{user?.email ?? adminName}</p>
          <p className="mb-3 text-xs text-slate-400">Administrator</p>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-3 py-2 text-sm font-medium hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* ---------------------------------- Main ---------------------------------- */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            Recruit field agent
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a sign-in for a new field agent. They will use it to capture meter readings on their phone.
          </p>

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            {/* --------------------------- Form or success --------------------------- */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
              {created ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-ok-50 text-ok-600">
                      <CircleCheck className="size-6" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-navy-900">{created.fullName} is registered</h2>
                      <p className="text-sm text-slate-500">Give them these sign-in details.</p>
                    </div>
                  </div>

                  <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-brand-100 bg-brand-50">
                    {[
                      { key: 'phone', label: 'Phone number', value: created.phone },
                      { key: 'password', label: 'Temporary password', value: created.password },
                    ].map(({ key, label, value }) => (
                      <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <dt className="text-xs text-slate-500">{label}</dt>
                          <dd className="truncate font-mono text-base font-semibold text-navy-900">{value}</dd>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(key, value)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
                        >
                          {copied === key ? <Check className="size-3.5 text-ok-600" /> : <Copy className="size-3.5" />}
                          {copied === key ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>
                      This password is shown only now. Copy it and share it privately, for example in person
                      or by direct message. If it’s lost, an administrator will need to reset it.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={recruitAnother}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <UserPlus className="size-4" />
                    Recruit another agent
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <h2 className="text-lg font-bold text-navy-900">Agent details</h2>

                  {error && (
                    <div
                      role="alert"
                      className="mt-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
                    >
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="mt-5 space-y-5">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-semibold text-navy-900">
                        Full name
                      </label>
                      <div className="relative mt-1.5">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                        <input
                          id="fullName"
                          type="text"
                          autoComplete="off"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Faith Otieno"
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-navy-900">
                        Phone number
                      </label>
                      <div className="relative mt-1.5">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                        <input
                          id="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="off"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0712 345 678"
                          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        The agent signs in with this number, so double-check it.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-semibold text-navy-900">
                        Temporary password
                      </label>
                      <div className="mt-1.5 flex gap-2">
                        <div className="relative flex-1">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 font-mono text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
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
                        <button
                          type="button"
                          onClick={() => setPassword(generatePassword())}
                          className="inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3.5 text-sm font-semibold text-navy-900 hover:bg-white focus-visible:outline-2 focus-visible:outline-brand-600"
                        >
                          <RefreshCw className="size-4" />
                          <span className="hidden sm:inline">Generate</span>
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">At least 8 characters. We suggest a random one.</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !fullName || !phone || !password}
                    className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    {submitting ? 'Registering…' : 'Register field agent'}
                  </button>
                </form>
              )}
            </section>

            {/* ------------------------------ How it works ------------------------------ */}
            <aside className="rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6 xl:col-span-2">
              <h2 className="text-base font-bold text-navy-900">What happens next</h2>
              <ol className="mt-4 space-y-4 text-sm text-slate-700">
                {[
                  'You register the agent’s name and phone number here.',
                  'Share the temporary password with them privately.',
                  'They sign in from the field agent page and start capturing readings.',
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
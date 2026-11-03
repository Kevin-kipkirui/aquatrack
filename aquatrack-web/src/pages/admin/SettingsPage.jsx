import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  Building2,
  CalendarDays,
  CircleCheck,
  Gauge,
  Home,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  Save,
  Settings,
  TriangleAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Config and helpers
// ---------------------------------------------------------------------------
// In development, show sample values when the database call fails so the layout
// can be judged. Never shown in production builds, and saving is disabled for it.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const SAMPLE = {
  id: 'sample',
  name: 'Nakuru Residents Association',
  billingRate: 60,
  households: 482,
  awaitingApproval: 9,
};

const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const countFormat = new Intl.NumberFormat('en-KE');

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [rateInput, setRateInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [flash, setFlash] = useState('');

  const adminName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const monthLabel = new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const { data: result, error } = await supabase.rpc('settings_get');
    if (error) {
      setData(null);
      setLoadError(error.message);
    } else {
      setData(result);
      setRateInput(result.billingRate == null ? '' : String(result.billingRate));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usingSample = !data && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const settings = data ?? (usingSample ? SAMPLE : null);

  useEffect(() => {
    if (usingSample) setRateInput(String(SAMPLE.billingRate));
  }, [usingSample]);

  // ---- Derived values ----
  const savedRate = settings?.billingRate == null ? null : Number(settings.billingRate);
  const typedRate = rateInput.trim() === '' ? NaN : Number(rateInput);
  const rateIsValid = Number.isFinite(typedRate) && typedRate > 0 && typedRate <= 10000;
  const dirty = savedRate === null ? rateInput.trim() !== '' : !(rateIsValid && typedRate === savedRate);
  const changePct =
    rateIsValid && savedRate && savedRate > 0 ? ((typedRate - savedRate) / savedRate) * 100 : 0;
  const bigChange = Math.abs(changePct) >= 50;
  const awaiting = settings?.awaitingApproval ?? 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError('');
    setFlash('');

    if (!rateIsValid) {
      setFieldError('Enter a rate above 0 and no more than 10,000, for example 60.');
      return;
    }
    setFieldError('');

    setSaving(true);
    const { data: result, error } = await supabase.rpc('settings_save', { p_rate: typedRate });
    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }
    setData((d) => ({ ...d, billingRate: result.billingRate }));
    setRateInput(String(result.billingRate));
    setFlash('Billing rate saved. It applies to every bill generated from now on.');
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
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">How the association is billed.</p>

          {loadError && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load settings</p>
                <p>{loadError}</p>
              </div>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only). Saving is disabled.
            </p>
          )}

          {loading ? (
            <div className="mt-6 space-y-6" aria-busy="true">
              <div className="h-80 animate-pulse rounded-2xl bg-brand-50" />
              <div className="h-40 animate-pulse rounded-2xl bg-brand-50" />
            </div>
          ) : (
            settings && (
              <div className="mt-6 space-y-6">
                {/* No rate yet */}
                {savedRate === null && (
                  <div className="flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    <p>
                      <strong>No billing rate is set yet.</strong> Bills can’t be generated, and readings can’t be
                      approved, until you set one below.
                    </p>
                  </div>
                )}

                {/* ------------------------------ Billing rate ------------------------------ */}
                <section aria-labelledby="rate-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                      <Banknote className="size-5" />
                    </span>
                    <div>
                      <h2 id="rate-heading" className="text-lg font-bold text-navy-900">Billing rate</h2>
                      <p className="text-sm text-slate-500">
                        The price of one unit (1 m³) of water. Every bill is consumption × this rate.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} noValidate className="mt-6">
                    {saveError && (
                      <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p>{saveError}</p>
                      </div>
                    )}
                    {flash && (
                      <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-ok-600/20 bg-ok-50 p-4 text-sm text-ok-700">
                        <CircleCheck className="mt-0.5 size-4 shrink-0" />
                        <p className="font-semibold">{flash}</p>
                      </div>
                    )}

                    <label htmlFor="rate" className="block text-sm font-semibold text-navy-900">
                      Rate per unit
                    </label>
                    <div className="mt-1.5 flex max-w-sm items-stretch">
                      <span className="grid place-items-center rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 px-4 text-sm font-bold text-slate-600">
                        KES
                      </span>
                      <input
                        id="rate"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={rateInput}
                        onChange={(e) => {
                          setRateInput(e.target.value);
                          setFieldError('');
                          setSaveError('');
                          setFlash('');
                        }}
                        placeholder="60"
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby="rate-message"
                        className={`w-full min-w-0 border bg-white py-3 pl-4 pr-4 text-base font-semibold tabular-nums text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                          fieldError
                            ? 'border-bad-600 focus:border-bad-600 focus:ring-bad-50'
                            : 'border-slate-300 focus:border-brand-600 focus:ring-brand-100'
                        }`}
                      />
                      <span className="grid place-items-center whitespace-nowrap rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 px-4 text-sm text-slate-600">
                        per unit (m³)
                      </span>
                    </div>
                    {fieldError ? (
                      <p id="rate-message" role="alert" className="mt-1.5 text-xs font-medium text-bad-700">
                        {fieldError}
                      </p>
                    ) : (
                      <p id="rate-message" className="mt-1.5 text-xs text-slate-500">
                        {savedRate === null ? 'Not set yet.' : `Currently ${kes.format(savedRate)} per unit.`}
                      </p>
                    )}

                    {/* Live example */}
                    {rateIsValid && (
                      <div className="mt-5 max-w-sm rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm">
                        <p className="text-xs font-semibold text-slate-500">Example</p>
                        <p className="mt-1 text-slate-700">
                          A household that used <strong className="text-navy-900">10 units</strong> would be billed{' '}
                          <strong className="text-navy-900">{kes.format(10 * typedRate)}</strong>.
                        </p>
                      </div>
                    )}

                    {bigChange && (
                      <div className="mt-4 flex max-w-xl items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p>
                          This is {Math.abs(Math.round(changePct))}% {changePct > 0 ? 'higher' : 'lower'} than the
                          current rate. Check it isn’t a typing mistake before saving.
                        </p>
                      </div>
                    )}

                    <div className="mt-4 flex max-w-xl items-start gap-3 text-sm text-slate-600">
                      <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
                      <p>
                        A new rate applies to bills generated from now on. Bills that already exist keep their amounts.
                        {awaiting > 0 && (
                          <>
                            {' '}
                            <strong className="text-navy-900">
                              {countFormat.format(awaiting)} {awaiting === 1 ? 'reading is' : 'readings are'} still
                              awaiting approval
                            </strong>{' '}
                            and will be billed at the new rate.
                          </>
                        )}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || usingSample || !dirty}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {saving ? 'Saving…' : 'Save billing rate'}
                    </button>
                  </form>
                </section>

                {/* ----------------------------- Billing period ----------------------------- */}
                <section aria-labelledby="period-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-navy-900 text-white">
                      <CalendarDays className="size-5" />
                    </span>
                    <div>
                      <h2 id="period-heading" className="text-lg font-bold text-navy-900">Billing period</h2>
                      <p className="text-sm text-slate-500">Monthly. This is fixed and needs no setup.</p>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">Current period</dt>
                      <dd className="mt-1 text-lg font-extrabold text-navy-900">{monthLabel}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">Cycle</dt>
                      <dd className="mt-1 text-lg font-extrabold text-navy-900">One bill per household per month</dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    Readings are grouped by the month they belong to. A second reading for the same household and month
                    is flagged as a duplicate and held back from billing until you resolve it.
                  </p>
                </section>

                {/* ------------------------------ Association ------------------------------ */}
                <section aria-labelledby="assoc-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                      <Building2 className="size-5" />
                    </span>
                    <h2 id="assoc-heading" className="text-lg font-bold text-navy-900">Association</h2>
                  </div>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">Name</dt>
                      <dd className="mt-1 text-base font-bold text-navy-900">{settings.name || '—'}</dd>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <dt className="text-xs font-semibold text-slate-500">Registered households</dt>
                      <dd className="mt-1 flex items-baseline gap-3">
                        <span className="text-base font-bold text-navy-900">{countFormat.format(settings.households ?? 0)}</span>
                        <Link
                          to={a.households}
                          className="text-sm font-semibold text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        >
                          Manage
                        </Link>
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
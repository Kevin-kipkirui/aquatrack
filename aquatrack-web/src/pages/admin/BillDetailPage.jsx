import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleCheck,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Printer,
  Receipt,
  RefreshCw,
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
// Helpers
// ---------------------------------------------------------------------------
const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

function formatPeriod(value) {
  if (!value) return '—';
  const raw = String(value);
  const date = new Date(raw.length === 7 ? `${raw}-01` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PAYMENT_BADGES = {
  paid: { label: 'Paid', className: 'bg-ok-50 text-ok-700' },
  unpaid: { label: 'Unpaid', className: 'bg-warn-50 text-warn-700' },
};

const READING_BADGES = {
  approved: { label: 'Approved', className: 'bg-ok-50 text-ok-700' },
  pending_review: { label: 'Pending review', className: 'bg-warn-50 text-warn-700' },
  flagged_duplicate: { label: 'Flagged duplicate', className: 'bg-bad-50 text-bad-700' },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BillDetailPage() {
  const { billId } = useParams();
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

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

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      setNotFound(false);
      const { data, error: rpcError } = await supabase.rpc('bill_detail', { p_bill_id: billId });
      if (rpcError) {
        setBill(null);
        if (rpcError.code === 'P0002' || /not found/i.test(rpcError.message)) setNotFound(true);
        else setError(rpcError.message);
      } else {
        setBill(data);
      }
      setLoading(false);
    },
    [billId]
  );

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid() {
    setPaying(true);
    setPayError('');
    const { error: rpcError } = await supabase.rpc('mark_bill_paid', { p_bill_id: billId });
    setPaying(false);
    if (rpcError) {
      setPayError(rpcError.message);
      return;
    }
    setConfirming(false);
    await load({ silent: true });
  }

  // ---- Derived figures (same rule as the billing service: floor at zero) ----
  const current = Number(bill?.reading?.value ?? 0);
  const previous = Number(bill?.previousReading ?? 0);
  const consumption = Math.max(current - previous, 0);
  const amount = Number(bill?.amountDue ?? 0);
  const rate = consumption > 0 ? amount / consumption : Number(bill?.association?.billingRate ?? 0);
  const isPaid = bill?.paymentStatus === 'paid';
  const paymentBadge = PAYMENT_BADGES[bill?.paymentStatus] ?? {
    label: bill?.paymentStatus ?? '—',
    className: 'bg-slate-100 text-slate-600',
  };
  const readingBadge = READING_BADGES[bill?.reading?.status] ?? {
    label: bill?.reading?.status ?? '—',
    className: 'bg-slate-100 text-slate-600',
  };
  const billNumber = bill ? `BILL-${String(bill.id).replace(/-/g, '').slice(0, 8).toUpperCase()}` : '';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* ------------------------------ Mobile top bar ------------------------------ */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white print:hidden lg:hidden">
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
          className="fixed inset-0 z-40 bg-navy-950/60 print:hidden lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --------------------------------- Sidebar --------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-white transition-transform duration-200 print:hidden lg:translate-x-0 ${
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
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">
          {/* Header (hidden when printing) */}
          <div className="print:hidden">
            <Link
              to={a.billing}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <ArrowLeft className="size-4" />
              Back to billing
            </Link>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
                  {bill ? billNumber : 'Bill'}
                </h1>
                {bill && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadge.className}`}>
                    {paymentBadge.label}
                  </span>
                )}
              </div>
              {bill && (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                >
                  <Printer className="size-4" />
                  Print bill
                </button>
              )}
            </div>
          </div>

          {/* ------------------------------- States ------------------------------- */}
          {loading && (
            <div className="mt-6 grid gap-6 xl:grid-cols-5" aria-busy="true">
              <div className="h-[34rem] animate-pulse rounded-2xl bg-brand-50 xl:col-span-3" />
              <div className="space-y-6 xl:col-span-2">
                <div className="h-48 animate-pulse rounded-2xl bg-brand-50" />
                <div className="h-48 animate-pulse rounded-2xl bg-brand-50" />
              </div>
            </div>
          )}

          {!loading && notFound && (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center">
              <Receipt className="mx-auto size-10 text-brand-200" />
              <h2 className="mt-3 text-lg font-bold text-navy-900">Bill not found</h2>
              <p className="mt-1 text-sm text-slate-500">This bill doesn’t exist, or it was removed.</p>
              <Link
                to={a.billing}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900"
              >
                Back to billing
              </Link>
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load this bill</p>
                <p>{error}</p>
              </div>
              <button
                type="button"
                onClick={() => load()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-navy-900 hover:bg-brand-50"
              >
                <RefreshCw className="size-3.5" />
                Retry
              </button>
            </div>
          )}

          {/* -------------------------------- Bill -------------------------------- */}
          {!loading && bill && (
            <div className="mt-6 grid gap-6 xl:grid-cols-5 print:mt-0 print:block">
              {/* Statement */}
              <article
                aria-label="Water bill"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3 print:rounded-none print:border-0 print:shadow-none"
              >
                <div className="flex items-center justify-between gap-4 bg-navy-900 px-6 py-5 text-white print:bg-navy-900">
                  <div className="flex items-center gap-3">
                    <img src="/logo-mark.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1.5" />
                    <div className="leading-tight">
                      <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
                      <p className="text-xs text-brand-200">{bill.association?.name || 'Nakuru Residents Association'}</p>
                    </div>
                  </div>
                  <div className="text-right leading-tight">
                    <p className="text-xs text-brand-200">Water bill</p>
                    <p className="font-mono text-base font-bold">{billNumber}</p>
                    {bill.issuedAt && <p className="mt-0.5 text-xs text-brand-200">{formatDateTime(bill.issuedAt)}</p>}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Billed to</p>
                      <p className="mt-1 text-xl font-extrabold text-navy-900">{bill.household?.code}</p>
                      {bill.household?.ownerName && <p className="text-sm text-slate-700">{bill.household.ownerName}</p>}
                      <dl className="mt-2 space-y-0.5 text-sm text-slate-600">
                        {bill.household?.meterNumber && (
                          <div className="flex gap-2"><dt className="text-slate-400">Meter</dt><dd>{bill.household.meterNumber}</dd></div>
                        )}
                        {bill.household?.section && (
                          <div className="flex gap-2"><dt className="text-slate-400">Section</dt><dd>{bill.household.section}</dd></div>
                        )}
                        {bill.household?.phone && (
                          <div className="flex gap-2"><dt className="text-slate-400">Phone</dt><dd>{bill.household.phone}</dd></div>
                        )}
                      </dl>
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs font-semibold text-slate-500">Billing period</p>
                      <p className="mt-1 text-xl font-extrabold text-navy-900">{formatPeriod(bill.reading?.billingPeriod)}</p>
                      <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${paymentBadge.className}`}>
                        {paymentBadge.label}
                      </span>
                    </div>
                  </div>

                  {/* Calculation */}
                  <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <caption className="sr-only">How this bill was calculated</caption>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">Previous reading</th>
                          <td className="px-4 py-3 text-right tabular-nums">{units.format(previous)} m³</td>
                        </tr>
                        <tr>
                          <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">Current reading</th>
                          <td className="px-4 py-3 text-right tabular-nums">{units.format(current)} m³</td>
                        </tr>
                        <tr className="bg-brand-50/60">
                          <th scope="row" className="px-4 py-3 text-left font-semibold text-navy-900">Consumption</th>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-navy-900">{units.format(consumption)} m³</td>
                        </tr>
                        <tr>
                          <th scope="row" className="px-4 py-3 text-left font-medium text-slate-600">Billing rate</th>
                          <td className="px-4 py-3 text-right tabular-nums">{kes.format(rate)} per unit</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between bg-navy-900 px-4 py-4 text-white">
                      <span className="text-sm font-semibold">Amount due</span>
                      <span className="text-2xl font-extrabold tabular-nums">{kes.format(amount)}</span>
                    </div>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Amount due = (current reading − previous reading) × billing rate. Consumption is never billed below
                    zero. For example, (1,310 − 1,250) × KES 60 = KES 3,600.
                  </p>
                </div>
              </article>

              {/* Side column */}
              <div className="space-y-6 xl:col-span-2 print:hidden">
                {/* Payment */}
                <section aria-labelledby="payment-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 id="payment-heading" className="text-base font-bold text-navy-900">Payment</h2>

                  {isPaid ? (
                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-ok-50 p-4 text-sm text-ok-700">
                      <CircleCheck className="mt-0.5 size-5 shrink-0" />
                      <p>
                        <strong>Payment recorded.</strong> This bill has been settled.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <p className="text-sm text-slate-600">
                        This bill is unpaid. Once you have confirmed the resident’s payment, record it here.
                      </p>

                      {payError && (
                        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-bad-50 p-3 text-sm text-bad-700">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                          {payError}
                        </p>
                      )}

                      {!confirming ? (
                        <button
                          type="button"
                          onClick={() => setConfirming(true)}
                          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        >
                          <Check className="size-4" />
                          Mark as paid
                        </button>
                      ) : (
                        <div className="mt-4 rounded-xl border border-warn-600/25 bg-warn-50 p-4">
                          <p className="text-sm font-semibold text-warn-700">
                            Confirm that {kes.format(amount)} was received for {bill.household?.code}?
                          </p>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={markPaid}
                              disabled={paying}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-ok-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-ok-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ok-600"
                            >
                              {paying && <Loader2 className="size-4 animate-spin" />}
                              {paying ? 'Saving…' : 'Yes, record payment'}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setConfirming(false); setPayError(''); }}
                              disabled={paying}
                              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Source reading */}
                <section aria-labelledby="source-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 id="source-heading" className="text-base font-bold text-navy-900">Source reading</h2>
                  <p className="mt-1 text-sm text-slate-500">Bills are only generated from approved readings.</p>

                  <dl className="mt-4 divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Status</dt>
                      <dd><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${readingBadge.className}`}>{readingBadge.label}</span></dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Captured by</dt>
                      <dd className="font-medium text-navy-900">{bill.reading?.capturedBy || '—'}</dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Captured</dt>
                      <dd className="font-medium text-navy-900">{formatDateTime(bill.reading?.capturedAt)}</dd>
                    </div>
                  </dl>

                  <Link
                    to={a.readingReview(bill.reading?.id)}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    View the reading <ArrowUpRight className="size-4" />
                  </Link>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
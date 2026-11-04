import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  CircleCheck,
  Gauge,
  Hash,
  Home,
  Landmark,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  Menu,
  Phone,
  Plus,
  Receipt,
  Save,
  Settings,
  Tag,
  TriangleAlert,
  User,
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
// Edit this list to match the rate categories your association uses.
const RATE_CATEGORIES = ['Standard Residential', 'Commercial'];

// The 11 constituencies of Nakuru County. Agents narrow down from these.
const CONSTITUENCIES = [
  'Bahati',
  'Gilgil',
  'Kuresoi North',
  'Kuresoi South',
  'Molo',
  'Naivasha',
  'Nakuru Town East',
  'Nakuru Town West',
  'Njoro',
  'Rongai',
  'Subukia',
];

const EMPTY_FORM = {
  owner: '',
  phone: '',
  meter: '',
  constituency: '',
  area: '',
  houseNumber: '',
  rate: RATE_CATEGORIES[0],
  opening: '0',
};

const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

// 0722445981 / 722445981 / +254722445981 -> 0722445981
function toLocalPhone(input) {
  const d = input.replace(/\D/g, '');
  if (d.startsWith('254')) return `0${d.slice(3)}`;
  if (d.length === 9) return `0${d}`;
  return d;
}

// 0722445981 -> 0722 445 981
function formatPhone(local) {
  return /^\d{10}$/.test(local) ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : local;
}

// Trim and collapse spaces. If the area matches one already in use (ignoring case),
// reuse that spelling so the agents' filter never splits one place into two.
function cleanArea(input, knownAreas) {
  const value = input.trim().replace(/\s+/g, ' ');
  const match = knownAreas.find((a) => a.toLowerCase() === value.toLowerCase());
  return match ?? value;
}

function inputClass(hasError) {
  return `w-full rounded-xl border bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-bad-600 focus:border-bad-600 focus:ring-bad-50'
      : 'border-slate-300 focus:border-brand-600 focus:ring-brand-100'
  }`;
}

const ICON_CLASS = 'pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400';

// Small helper used only inside this file.
function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-navy-900">
        {label}
      </label>
      <div className="relative mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-message`} role="alert" className="mt-1.5 text-xs font-medium text-bad-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function HouseholdFormPage() {
  const { householdId } = useParams(); // undefined on /new
  const isEdit = Boolean(householdId);
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [initial, setInitial] = useState(EMPTY_FORM);
  const [code, setCode] = useState('');
  const [lastReading, setLastReading] = useState(null);
  const [knownAreas, setKnownAreas] = useState([]); // areas already in use, for suggestions

  const [loading, setLoading] = useState(isEdit);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(null); // { created, code, skipped }

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

  // Areas already in use, so the admin picks the same spelling instead of retyping it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('households_list');
      if (cancelled || !Array.isArray(data)) return;
      const areas = [...new Set(data.map((h) => h.section).filter(Boolean))];
      setKnownAreas(areas.sort((x, y) => x.localeCompare(y)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the household when editing; reset when switching to "new".
  useEffect(() => {
    setSaved(null);
    setError('');
    setFieldErrors({});
    setNotFound(false);
    setLoadError('');

    if (!isEdit) {
      setForm(EMPTY_FORM);
      setInitial(EMPTY_FORM);
      setCode('');
      setLastReading(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('household_get', { p_id: householdId });
      const { data: extra } = await supabase.rpc('household_details_get', { p_id: householdId });
      if (cancelled) return;
      if (rpcError) {
        if (rpcError.code === 'P0002' || /not found/i.test(rpcError.message)) setNotFound(true);
        else setLoadError(rpcError.message);
      } else {
        const loaded = {
          owner: data.owner ?? '',
          phone: data.phone ?? '',
          meter: data.meterNumber ?? '',
          constituency: extra?.constituency ?? '',
          area: extra?.area ?? data.section ?? '',
          houseNumber: extra?.houseNumber ?? '',
          rate: extra?.rateCategory || data.rateCategory || RATE_CATEGORIES[0],
          opening: '0',
        };
        setForm(loaded);
        setInitial(loaded);
        setCode(data.code ?? '');
        setLastReading(data.previousReading);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [householdId, isEdit]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setFieldErrors((e) => ({ ...e, [name]: undefined }));
    setError('');
    setSaved((s) => (s && !s.created ? null : s));
  }

  function validate() {
    const errs = {};
    if (form.owner.trim().length < 2) errs.owner = 'Enter the owner’s full name.';
    if (!/^0[17]\d{8}$/.test(toLocalPhone(form.phone))) {
      errs.phone = 'Enter a valid Kenyan phone number, for example 0722 445 981.';
    }
    if (form.meter.trim().length < 3) errs.meter = 'Enter the meter number printed on the meter.';
    if (!form.constituency) errs.constituency = 'Choose the constituency.';
    if (!form.area.trim()) errs.area = 'Enter the village, estate or neighbourhood, for example Section 58.';
    if (!form.houseNumber.trim()) errs.houseNumber = 'Enter the house number or address, for example House 14 or Plot 203.';
    if (!isEdit) {
      const opening = Number(form.opening);
      if (form.opening === '' || Number.isNaN(opening) || opening < 0) {
        errs.opening = 'Enter the meter’s current reading (0 or more).';
      }
    }
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(null);

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    const phone = formatPhone(toLocalPhone(form.phone));
    const meter = form.meter.trim().toUpperCase();
    const area = cleanArea(form.area, knownAreas);
    const houseNumber = form.houseNumber.trim().replace(/\s+/g, ' ');

    const { data, error: rpcError } = await supabase.rpc('household_save', {
      p_id: isEdit ? householdId : null,
      p_owner: form.owner.trim(),
      p_phone: phone,
      p_meter: meter,
      p_section: area,
      p_rate: form.rate,
      p_opening: isEdit ? null : Number(form.opening),
    });

    if (rpcError) {
      setSubmitting(false);
      if (rpcError.code === '23505') setFieldErrors({ meter: rpcError.message });
      else setError(rpcError.message);
      return;
    }

    // Second step: the location fields and rate category.
    const savedCode = data?.code ?? code;
    const { error: detailsError } = await supabase.rpc('household_set_details', {
      p_id: isEdit ? householdId : null,
      p_meter: meter,
      p_constituency: form.constituency,
      p_area: area,
      p_house_number: houseNumber,
      p_rate_category: form.rate,
    });
    setSubmitting(false);
    if (detailsError) {
      setError(
        `The household was saved${savedCode ? ` as ${savedCode}` : ''}, but its location and rate category were not: ${detailsError.message}`
      );
      return;
    }

    if (!knownAreas.includes(area)) setKnownAreas((list) => [...list, area].sort((x, y) => x.localeCompare(y)));
    const next = { ...form, phone, meter, owner: form.owner.trim(), area, houseNumber };
    setForm(next);
    setInitial(next);
    setSaved({ created: !isEdit, code: savedCode, skipped: data?.skipped ?? [] });
  }

  function addAnother() {
    setForm(EMPTY_FORM);
    setInitial(EMPTY_FORM);
    setFieldErrors({});
    setError('');
    setSaved(null);
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const requiredFilled =
    form.owner && form.phone && form.meter && form.constituency && form.area && form.houseNumber;
  const canSubmit = !submitting && !loading && (isEdit ? dirty : requiredFilled);
  const rateOptions = RATE_CATEGORIES.includes(form.rate) ? RATE_CATEGORIES : [form.rate, ...RATE_CATEGORIES];
  const showSuccessCard = saved?.created;

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
          <Link
            to={a.households}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <ArrowLeft className="size-4" />
            Back to households
          </Link>

          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            {isEdit ? `Edit household${code ? ` ${code}` : ''}` : 'Add household'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit
              ? 'Update the details for this household.'
              : 'Register a household so field agents can capture its meter readings.'}
          </p>

          {/* Not found / load error */}
          {notFound && (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center">
              <Home className="mx-auto size-10 text-brand-200" />
              <h2 className="mt-3 text-lg font-bold text-navy-900">Household not found</h2>
              <p className="mt-1 text-sm text-slate-500">This household doesn’t exist, or it was removed.</p>
              <Link
                to={a.households}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900"
              >
                Back to households
              </Link>
            </div>
          )}
          {loadError && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load this household</p>
                <p>{loadError}</p>
              </div>
            </div>
          )}

          {!notFound && !loadError && (
            <div className="mt-6 grid gap-6 xl:grid-cols-5">
              {/* ------------------------------ Form / success ------------------------------ */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
                {loading ? (
                  <div className="space-y-5" aria-busy="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 animate-pulse rounded-xl bg-brand-50" />
                    ))}
                  </div>
                ) : showSuccessCard ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-ok-50 text-ok-600">
                        <CircleCheck className="size-6" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-navy-900">Household registered</h2>
                        <p className="text-sm text-slate-500">
                          {form.owner} is ready for meter readings.
                        </p>
                      </div>
                    </div>

                    {saved.code && (
                      <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
                        <p className="text-xs text-slate-500">Household ID</p>
                        <p className="font-mono text-2xl font-bold text-navy-900">{saved.code}</p>
                      </div>
                    )}

                    {saved.skipped.length > 0 && (
                      <div className="mt-5 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p>
                          Saved, but your households table has no column for: <strong>{saved.skipped.join(', ')}</strong>.
                          Those values weren’t stored.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={addAnother}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      >
                        <Plus className="size-4" />
                        Add another household
                      </button>
                      <Link
                        to={a.households}
                        className="inline-flex items-center rounded-xl border border-brand-100 px-5 py-3 text-sm font-semibold text-navy-900 hover:bg-brand-50"
                      >
                        Back to households
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <h2 className="text-lg font-bold text-navy-900">Household details</h2>

                    {error && (
                      <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <p>{error}</p>
                      </div>
                    )}

                    {saved && !saved.created && (
                      <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-ok-600/20 bg-ok-50 p-4 text-sm text-ok-700">
                        <CircleCheck className="mt-0.5 size-4 shrink-0" />
                        <p>
                          <strong>Changes saved.</strong>
                          {saved.skipped.length > 0 && (
                            <span className="text-warn-700">
                              {' '}Your households table has no column for {saved.skipped.join(', ')}, so those weren’t stored.
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 space-y-5">
                      <Field
                        id="code"
                        label="Household ID"
                        hint={isEdit ? 'The ID can’t be changed.' : 'Assigned automatically when you save.'}
                      >
                        <Lock className={ICON_CLASS} />
                        <input
                          id="code"
                          type="text"
                          readOnly
                          value={isEdit ? code : 'Assigned automatically'}
                          aria-describedby="code-message"
                          className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 font-mono text-sm text-slate-500"
                        />
                      </Field>

                      <Field id="owner" label="Owner full name" error={fieldErrors.owner}>
                        <User className={ICON_CLASS} />
                        <input
                          id="owner"
                          type="text"
                          autoComplete="off"
                          required
                          value={form.owner}
                          onChange={(e) => setField('owner', e.target.value)}
                          placeholder="e.g. James Mwangi"
                          aria-invalid={Boolean(fieldErrors.owner)}
                          aria-describedby="owner-message"
                          className={inputClass(fieldErrors.owner)}
                        />
                      </Field>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field id="phone" label="Phone number" error={fieldErrors.phone}>
                          <Phone className={ICON_CLASS} />
                          <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="off"
                            required
                            value={form.phone}
                            onChange={(e) => setField('phone', e.target.value)}
                            placeholder="0722 445 981"
                            aria-invalid={Boolean(fieldErrors.phone)}
                            aria-describedby="phone-message"
                            className={inputClass(fieldErrors.phone)}
                          />
                        </Field>

                        <Field
                          id="meter"
                          label="Meter number"
                          error={fieldErrors.meter}
                          hint="Each meter can belong to only one household."
                        >
                          <Gauge className={ICON_CLASS} />
                          <input
                            id="meter"
                            type="text"
                            autoComplete="off"
                            required
                            value={form.meter}
                            onChange={(e) => setField('meter', e.target.value)}
                            placeholder="MTR-118824"
                            aria-invalid={Boolean(fieldErrors.meter)}
                            aria-describedby="meter-message"
                            className={`${inputClass(fieldErrors.meter)} font-mono uppercase`}
                          />
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field id="constituency" label="Constituency" error={fieldErrors.constituency}>
                          <Landmark className={ICON_CLASS} />
                          <select
                            id="constituency"
                            required
                            value={form.constituency}
                            onChange={(e) => setField('constituency', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.constituency)}
                            aria-describedby="constituency-message"
                            className={inputClass(fieldErrors.constituency)}
                          >
                            <option value="">Select constituency</option>
                            {CONSTITUENCIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </Field>

                        <Field
                          id="area"
                          label="Village / estate"
                          error={fieldErrors.area}
                          hint={knownAreas.length > 0 ? 'Pick an existing one from the list so spellings match.' : undefined}
                        >
                          <MapPin className={ICON_CLASS} />
                          <input
                            id="area"
                            type="text"
                            list="known-areas"
                            autoComplete="off"
                            required
                            value={form.area}
                            onChange={(e) => setField('area', e.target.value)}
                            placeholder="Section 58"
                            aria-invalid={Boolean(fieldErrors.area)}
                            aria-describedby="area-message"
                            className={inputClass(fieldErrors.area)}
                          />
                          <datalist id="known-areas">
                            {knownAreas.map((a2) => (
                              <option key={a2} value={a2} />
                            ))}
                          </datalist>
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field id="houseNumber" label="House number / address" error={fieldErrors.houseNumber}>
                          <Home className={ICON_CLASS} />
                          <input
                            id="houseNumber"
                            type="text"
                            autoComplete="off"
                            required
                            value={form.houseNumber}
                            onChange={(e) => setField('houseNumber', e.target.value)}
                            placeholder="House 14"
                            aria-invalid={Boolean(fieldErrors.houseNumber)}
                            aria-describedby="houseNumber-message"
                            className={inputClass(fieldErrors.houseNumber)}
                          />
                        </Field>

                        <Field id="rate" label="Billing rate category">
                          <Tag className={ICON_CLASS} />
                          <select
                            id="rate"
                            value={form.rate}
                            onChange={(e) => setField('rate', e.target.value)}
                            className={inputClass(false)}
                          >
                            {rateOptions.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      {isEdit ? (
                        <Field
                          id="last"
                          label="Last recorded reading"
                          hint="This is the baseline the next bill is measured from."
                        >
                          <Hash className={ICON_CLASS} />
                          <input
                            id="last"
                            type="text"
                            readOnly
                            value={lastReading == null ? '—' : `${units.format(Number(lastReading))} m³`}
                            aria-describedby="last-message"
                            className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-500"
                          />
                        </Field>
                      ) : (
                        <Field
                          id="opening"
                          label="Opening meter reading (m³)"
                          error={fieldErrors.opening}
                          hint="The reading on the meter today. The first bill is measured from this."
                        >
                          <Hash className={ICON_CLASS} />
                          <input
                            id="opening"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            required
                            value={form.opening}
                            onChange={(e) => setField('opening', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.opening)}
                            aria-describedby="opening-message"
                            className={inputClass(fieldErrors.opening)}
                          />
                        </Field>
                      )}
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={!canSubmit}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      >
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save household'}
                      </button>
                      <Link
                        to={a.households}
                        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                      >
                        {saved && !saved.created ? 'Back to households' : 'Cancel'}
                      </Link>
                    </div>
                  </form>
                )}
              </section>

              {/* ------------------------------ How it's used ------------------------------ */}
              <aside className="rounded-2xl border border-brand-100 bg-brand-50 p-5 sm:p-6 xl:col-span-2">
                <h2 className="text-base font-bold text-navy-900">How household records are used</h2>
                <ul className="mt-4 space-y-4 text-sm text-slate-700">
                  {[
                    ['Household ID', 'Generated automatically in the form NRA-0001, so IDs never clash.'],
                    ['Location', 'Constituency, village or estate, then house number. Field agents narrow down through these to find the household, so spell each place the same way every time.'],
                    ['Meter number', 'Field agents can also search by it directly, so one meter can’t belong to two households.'],
                    ['Opening reading', 'A household’s first bill is (first approved reading − opening reading) × the billing rate.'],
                    ['Rate category', 'Recorded on the household. Bills currently use the association’s configured rate, whatever the category.'],
                  ].map(([title, text]) => (
                    <li key={title} className="flex gap-3">
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" />
                      <span className="leading-snug">
                        <strong className="text-navy-900">{title}.</strong> {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
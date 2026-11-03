import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LayoutDashboard, Receipt, Smartphone, WifiOff } from 'lucide-react';
import { ROUTES } from '../../config/routes';

const BRAND_IMAGE_URL = 'https://i.pinimg.com/736x/0d/32/4c/0d324cbc522f0c1f9883bc00b2d3f27f.jpg';

const FEATURES = [
  { icon: WifiOff, text: 'Readings captured offline sync automatically once the connection returns.' },
  { icon: AlertTriangle, text: 'Duplicate readings are flagged at the point of capture, not weeks later.' },
  { icon: Receipt, text: 'Bills are generated only from readings an administrator has approved.' },
];

const DOORS = [
  {
    to: ROUTES.admin.login,
    icon: LayoutDashboard,
    title: 'Administrator',
    description: 'Review readings, resolve flagged duplicates, manage households and generate bills.',
    cta: 'Sign in as administrator',
  },
  {
    to: ROUTES.agent.login,
    icon: Smartphone,
    title: 'Field agent',
    description: 'Capture household meter readings on your phone, even without a connection.',
    cta: 'Sign in as field agent',
  },
];

export default function GatewayPage() {
  return (
    <div className="grid min-h-screen font-sans text-slate-800 lg:grid-cols-2">
      {/* ------------------------------ Brand panel ------------------------------ */}
      <section className="relative isolate flex flex-col justify-between overflow-hidden bg-navy-900 px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-14">
        {/* Background photo: always fills the panel. If it fails to load, the navy background remains. */}
        <img
          src={BRAND_IMAGE_URL}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        {/* Dark overlay keeps the text readable while the photo still shows through. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-900/95 via-navy-900/70 to-navy-900/50"
        />

        <div className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1.5" />
          <div className="leading-tight">
            <p className="text-xl font-extrabold tracking-tight">AquaTrack</p>
            <p className="text-sm text-brand-200">Nakuru Residents Association</p>
          </div>
        </div>

        <div className="hidden lg:block">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight drop-shadow-md">
            Accurate readings. Fair bills. Records everyone can trust.
          </h1>
          <ul className="mt-10 max-w-md space-y-5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-800/80 text-brand-200 backdrop-blur-sm">
                  <Icon className="size-5" />
                </span>
                <p className="pt-1.5 text-sm leading-relaxed text-slate-100 drop-shadow">{text}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden text-xs text-slate-300 lg:block">
          Smart Water Usage Tracking and Billing System
        </p>
      </section>

      {/* ------------------------------ Choice panel ------------------------------ */}
      <main className="flex items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
            Choose how you’re signing in
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Each role has its own sign-in. Pick the one that matches your account.
          </p>

          <div className="mt-8 space-y-4">
            {DOORS.map(({ to, icon: Icon, title, description, cta }) => (
              <Link
                key={title}
                to={to}
                aria-label={cta}
                className="group flex items-center gap-4 rounded-2xl border border-brand-100 bg-brand-50 p-5 transition-all hover:border-brand-600 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition-colors group-hover:bg-navy-900">
                  <Icon className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-bold text-navy-900">{title}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-600">{description}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-brand-600 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-slate-500">
            Accounts are created by an administrator. If you don’t have one yet, ask your association office.
          </p>
        </div>
      </main>
    </div>
  );
}
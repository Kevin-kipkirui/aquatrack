import { NavLink } from 'react-router-dom';
import { Home, LogOut, Mail, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function AgentProfilePage() {
  const a = ROUTES.agent;
  const { user, signOut } = useAuth();

  const fullName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field agent';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const details = [
    { label: 'Full name', value: fullName, icon: User },
    { label: 'Email', value: user?.email ?? 'Not set', icon: Mail },
    { label: 'Role', value: 'Field agent', icon: ShieldCheck },
  ];

  const tabs = [
    { label: 'Households', to: a.home, icon: Home, end: true },
    { label: 'Sync queue', to: a.queue, icon: RefreshCw },
    { label: 'Profile', to: a.profile, icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 sm:shadow-xl">
        {/* ------------------------------- Header ------------------------------- */}
        <header className="bg-navy-900 px-5 pb-16 pt-6 text-white">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1.5" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
              <p className="text-xs text-brand-200">Field agent</p>
            </div>
          </div>
        </header>

        {/* -------------------------------- Main -------------------------------- */}
        <main className="-mt-8 flex-1 rounded-t-3xl bg-slate-50 px-5 pb-28 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Your account details.</p>

          {/* Identity card */}
          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white">
              {initials || <User className="size-6" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-navy-900">{fullName}</p>
              <p className="truncate text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          {/* Details */}
          <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
            {details.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-slate-500">{label}</dt>
                  <dd className="truncate text-sm font-semibold text-navy-900">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Need to change your details or reset your password? Ask your administrator.
          </p>

          {/* Log out */}
          <button
            type="button"
            onClick={signOut}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-bad-600/20 bg-bad-50 px-4 py-3.5 text-base font-bold text-bad-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad-600"
          >
            <LogOut className="size-5" />
            Log out
          </button>
        </main>

        {/* ---------------------------- Bottom navigation ---------------------------- */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto grid max-w-md grid-cols-3">
            {tabs.map(({ label, to, icon: Icon, end }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 ${
                      isActive ? 'text-brand-600' : 'text-slate-500 hover:text-navy-900'
                    }`
                  }
                >
                  <Icon className="size-5" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
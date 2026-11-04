import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, CloudOff, Home, LogOut, RefreshCw, User, Wifi } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

/**
 * Shared shell for every field-agent page.
 *
 * Phones and tablets: navy header with a rounded sheet, and a bottom tab bar.
 * Laptops and desktops (lg and up): fixed sidebar on the left and a wide content area.
 *
 * Props
 *  - active:             'households' | 'queue' | 'profile'   which tab is highlighted
 *  - back:               { to, label }                         optional back link
 *  - online:             boolean                               shows the Online/Offline badge when provided
 *  - subtitle:           text under "AquaTrack" in the header  (default "Field agent")
 *  - mobileHeaderRight:  node shown on the right of the phone header (replaces the badge)
 *  - mobileHeaderExtra:  node shown under the logo row in the phone header
 */

function OnlineBadge({ online }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        online ? 'bg-ok-50 text-ok-600' : 'bg-warn-50 text-warn-700'
      }`}
    >
      {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
      {online ? 'Online' : 'Offline'}
    </span>
  );
}

function Brand({ subtitle, size = 'md' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-mark.png"
        alt=""
        className={`${big ? 'h-11 w-11' : 'h-10 w-10'} shrink-0 rounded-xl bg-white object-contain p-1.5`}
      />
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
        <p className="text-xs text-brand-200">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AgentLayout({
  children,
  active,
  back,
  online,
  subtitle = 'Field agent',
  mobileHeaderRight,
  mobileHeaderExtra,
}) {
  const a = ROUTES.agent;
  const { user, signOut } = useAuth();

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field agent';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

  const tabs = [
    { key: 'households', label: 'Households', to: a.home, icon: Home, end: true },
    { key: 'queue', label: 'Sync queue', to: a.queue, icon: RefreshCw },
    { key: 'profile', label: 'Profile', to: a.profile, icon: User },
  ];

  const isOn = (tab, isActive) => (active ? active === tab.key : isActive);
  const showTopRow = Boolean(back) || online !== undefined;

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 font-sans text-slate-800">
      {/* ----------------------- Desktop sidebar (lg and up) ----------------------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 text-white lg:flex">
        <div className="px-6 pb-6 pt-8">
          <Brand subtitle="Field agent" size="lg" />
        </div>

        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="space-y-1">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      isOn(tab, isActive)
                        ? 'bg-navy-800 text-white'
                        : 'text-brand-200 hover:bg-navy-800/60 hover:text-white'
                    }`
                  }
                >
                  <tab.icon className="size-5" />
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-navy-800 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
              {initials || <User className="size-5" />}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">{fullName}</p>
              <p className="truncate text-xs text-brand-200">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-navy-800 px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* ------------------------------ Page column ------------------------------ */}
      <div className="flex min-h-screen min-h-[100dvh] flex-col lg:pl-64">
        {/* Phone / tablet header */}
        <header className="bg-navy-900 text-white lg:hidden">
          <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-[max(1.5rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              {back ? (
                <Link
                  to={back.to}
                  className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-brand-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ArrowLeft className="size-4" />
                  {back.label}
                </Link>
              ) : (
                <Brand subtitle={subtitle} />
              )}
              {mobileHeaderRight ?? (online !== undefined ? <OnlineBadge online={online} /> : null)}
            </div>
            {back && (
              <div className="mt-5">
                <Brand subtitle={subtitle} />
              </div>
            )}
            {mobileHeaderExtra}
          </div>
        </header>

        {/* Content */}
        <main className="-mt-8 flex-1 rounded-t-3xl bg-slate-50 lg:mt-0 lg:rounded-none">
          <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 lg:max-w-5xl lg:px-10 lg:pb-12 lg:pt-10">
            {showTopRow && (
              <div className="mb-6 hidden items-center justify-between lg:flex">
                {back ? (
                  <Link
                    to={back.to}
                    className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-slate-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                  >
                    <ArrowLeft className="size-4" />
                    {back.label}
                  </Link>
                ) : (
                  <span />
                )}
                {online !== undefined && <OnlineBadge online={online} />}
              </div>
            )}
            {children}
          </div>
        </main>

        {/* Phone / tablet bottom navigation */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <ul className="mx-auto grid max-w-2xl grid-cols-3">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 ${
                      isOn(tab, isActive) ? 'text-brand-600' : 'text-slate-500 hover:text-navy-900'
                    }`
                  }
                >
                  <tab.icon className="size-5" />
                  {tab.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
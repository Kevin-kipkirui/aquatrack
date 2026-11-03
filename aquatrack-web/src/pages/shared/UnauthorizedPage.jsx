import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function UnauthorizedPage() {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin = user?.app_metadata?.role === 'admin';

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-800">
      <header className="flex items-center gap-2.5 bg-navy-900 px-4 py-3 text-white sm:px-8">
        <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-1" />
        <span className="text-base font-bold tracking-tight">AquaTrack</span>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-warn-50 text-warn-700">
            <ShieldAlert className="size-7" />
          </span>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-warn-700">Access restricted</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            You don’t have access to this area
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            This section is for association administrators. Field agents record readings in the AquaTrack mobile app,
            and residents don’t sign in here.
          </p>

          {user && (
            <div className="mx-auto mt-5 max-w-sm rounded-xl bg-slate-50 px-4 py-3 text-left text-sm">
              <p className="text-xs font-semibold text-slate-500">Signed in as</p>
              <p className="truncate font-semibold text-navy-900">{user.email ?? user.phone ?? 'Unknown account'}</p>
              <p className="text-xs text-slate-500">{isAdmin ? 'Administrator' : 'Not an administrator'}</p>
            </div>
          )}

          <p className="mt-5 text-sm text-slate-600">
            If you should have access, sign out and log in with your administrator account, or ask an existing
            administrator to check your account.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            )}
            <Link
              to={ROUTES.gateway}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                user
                  ? 'border border-slate-300 bg-white text-navy-900 hover:bg-slate-50'
                  : 'bg-brand-600 text-white hover:bg-navy-900'
              }`}
            >
              <Home className="size-4" />
              Back to start
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

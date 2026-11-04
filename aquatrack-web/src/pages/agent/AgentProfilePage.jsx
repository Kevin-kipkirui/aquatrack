import { LogOut, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import AgentLayout from './AgentLayout';

export default function AgentProfilePage() {
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

  return (
    <AgentLayout active="profile">
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Your account details.</p>

      {/* Phones: stacked. Desktop: identity card on the left, details on the right. */}
      <div className="mt-5 lg:mt-8 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        {/* Identity card */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-col lg:gap-3 lg:p-8 lg:text-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-600 text-lg font-extrabold text-white lg:size-20 lg:text-2xl">
            {initials || <User className="size-6 lg:size-9" />}
          </span>
          <div className="min-w-0 lg:w-full">
            <p className="truncate text-lg font-bold text-navy-900">{fullName}</p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          {/* Details */}
          <dl className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm lg:mt-0">
            {details.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-4 lg:px-6 lg:py-5">
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

          {/* Log out (on desktop the sidebar already has one) */}
          <button
            type="button"
            onClick={signOut}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-bad-600/20 bg-bad-50 px-4 py-3.5 text-base font-bold text-bad-700 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad-600 lg:hidden"
          >
            <LogOut className="size-5" />
            Log out
          </button>
        </div>
      </div>
    </AgentLayout>
  );
}
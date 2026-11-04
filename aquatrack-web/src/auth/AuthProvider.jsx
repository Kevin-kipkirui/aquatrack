import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

const IDLE_LIMIT_MS = 45 * 60 * 1000; // sign out after 45 minutes with no activity
const ACTIVITY_KEY = 'aquatrack.lastActivity'; // shared by every tab of the app
const CHECK_EVERY_MS = 30 * 1000;
const WRITE_EVERY_MS = 15 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

// Personal data cached on the device. Wiped on every sign-out so the next person
// to use the phone or computer sees nothing of the previous user's.
// The unsent readings queue ('aquatrack.syncQueue') is deliberately NOT cleared:
// those are captured readings that have not reached the server yet.
const WIPE_ON_SIGN_OUT = ['aquatrack.households', 'aquatrack.syncHistory', ACTIVITY_KEY];

function wipeDeviceData() {
  for (const key of WIPE_ON_SIGN_OUT) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked: nothing to wipe.
    }
  }
}

function lastActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function markActive() {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
  } catch {
    // Storage blocked.
  }
}

function idleExpired() {
  const last = lastActivity();
  return last > 0 && Date.now() - last > IDLE_LIMIT_MS;
}

// Ends the session on the server (all devices) when online, then always clears it
// on this device, even offline, so a logged-out browser can never stay logged in.
async function hardSignOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Offline or token already dead: the local sign-out below still runs.
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Nothing left to clear.
  }
  wipeDeviceData();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      let current = data.session;

      // A session left behind past the idle limit (tab closed, phone asleep) is not honoured.
      if (current && idleExpired()) {
        await hardSignOut();
        current = null;
      }

      // Ask the server whether the account still exists and is allowed in
      // (removed or deactivated users are signed out). Skipped offline; network
      // failures never sign anyone out, only a clear rejection does.
      if (current && navigator.onLine) {
        const { error } = await supabase.auth.getUser();
        if (error && typeof error.status === 'number' && error.status >= 400 && error.status < 500) {
          await hardSignOut();
          current = null;
        }
      }

      if (current && !lastActivity()) markActive();
      if (!cancelled) {
        setSession(current);
        setLoading(false);
      }
    })();

    // Stay in sync when the user signs in, signs out (in any tab), or the token refreshes.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') wipeDeviceData();
      if (event === 'SIGNED_IN') markActive();
      setSession(newSession);
    });

    // Back/forward cache: pressing Back after logging out must not show a protected page.
    const onPageShow = (e) => {
      if (e.persisted) supabase.auth.getSession().then(({ data }) => setSession(data.session));
    };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // ---- 45-minute inactivity sign-out (runs only while someone is signed in) ----
  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) return undefined;

    let lastSeen = 0;
    let lastWrite = 0;

    const expireIfIdle = () => {
      if (idleExpired()) {
        hardSignOut().then(() => setSession(null));
        return true;
      }
      return false;
    };

    const onActivity = () => {
      const now = Date.now();
      if (now - lastSeen < 1000) return;
      lastSeen = now;
      if (expireIfIdle()) return; // came back after the limit: do not refresh the clock
      if (now - lastWrite > WRITE_EVERY_MS) {
        lastWrite = now;
        markActive();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') expireIfIdle();
    };

    if (!lastActivity()) markActive();
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = setInterval(expireIfIdle, CHECK_EVERY_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(timer);
    };
  }, [signedIn]);

  const user = session?.user ?? null;
  // app_metadata can only be changed by the server, never by the user (unlike user_metadata).
  const role = user?.app_metadata?.role ?? null;

  const value = {
    session,
    user,
    role,
    loading,
    signInWithEmail: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: async () => {
      await hardSignOut();
      setSession(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
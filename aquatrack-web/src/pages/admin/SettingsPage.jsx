import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function SettingsPage() {
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Settings</h1>
      <form>
        <input placeholder="Billing rate (KES per unit)" /><br />
        <input placeholder="Billing period" /><br />
        <button type="submit">Save settings</button>
      </form>
    </main>
  );
}
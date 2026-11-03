import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function DashboardPage() {
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Dashboard</h1>
      <p>Households: 0</p>
      <p>Readings this month: 0</p>
      <p>Flagged duplicates: 0</p>
      <p>Unpaid bills: 0</p>
    </main>
  );
}
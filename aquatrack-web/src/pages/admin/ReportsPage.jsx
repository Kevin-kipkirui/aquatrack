import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function ReportsPage() {
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Reports and analytics</h1>
      <p>Monthly revenue trend</p>
      <p>Consumption by section</p>
      <button>Export</button>
    </main>
  );
}
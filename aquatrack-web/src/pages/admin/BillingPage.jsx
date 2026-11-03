import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function BillingPage() {
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Billing and payments</h1>
      <p>Revenue: 0 | Bills generated: 0 | Outstanding: 0</p>
      <p>Filter: paid / unpaid</p>
      <ul>
        <li><Link to={a.billDetail('1')}>Sample bill 1</Link></li>
      </ul>
    </main>
  );
}
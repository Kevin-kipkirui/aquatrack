import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function HouseholdsPage() {
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Households</h1>
      <input placeholder="Search households" />
      <br />
      <Link to={a.householdNew}>Add household</Link>
      <ul>
        <li>Sample household 1 - <Link to={a.householdEdit('1')}>Edit</Link></li>
      </ul>
    </main>
  );
}
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function ReadingReviewPage() {
  const { readingId } = useParams();
  const a = ROUTES.admin;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.dashboard}>Dashboard</Link> | <Link to={a.readings}>Readings</Link> | <Link to={a.households}>Households</Link> | <Link to={a.billing}>Billing</Link> | <Link to={a.reports}>Reports</Link> | <Link to={a.users}>Users</Link> | <Link to={a.settings}>Settings</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Review reading {readingId}</h1>
      <p>This reading vs existing reading</p>
      <button>Approve</button> <button>Reject</button>
      <br />
      <Link to={a.readings}>Back to readings</Link>
    </main>
  );
}
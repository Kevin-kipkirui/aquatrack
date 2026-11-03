import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function SyncQueuePage() {
  const a = ROUTES.agent;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.home}>Households</Link> | <Link to={a.queue}>Sync queue</Link> | <Link to={a.profile}>Profile</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Sync queue</h1>
      <p>Synced: 0 | Pending: 0 | Flagged: 0 | Failed: 0</p>
      <button>Sync now</button>
    </main>
  );
}
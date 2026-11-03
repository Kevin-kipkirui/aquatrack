import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function AgentProfilePage() {
  const a = ROUTES.agent;
  const { user, signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.home}>Households</Link> | <Link to={a.queue}>Sync queue</Link> | <Link to={a.profile}>Profile</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Profile</h1>
      <p>Phone: {user?.phone}</p>
    </main>
  );
}
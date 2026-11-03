import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function AgentHomePage() {
  const a = ROUTES.agent;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.home}>Households</Link> | <Link to={a.queue}>Sync queue</Link> | <Link to={a.profile}>Profile</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Select a household</h1>
      <input placeholder="Search households" />
      <ul>
        <li><Link to={a.capture('1')}>Sample household 1</Link></li>
      </ul>
    </main>
  );
}
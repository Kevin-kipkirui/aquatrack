import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function UnauthorizedPage() {
  const { signOut } = useAuth();
  return (
    <main>
      <h1>You don't have access to this area</h1>
      <button onClick={signOut}>Sign out</button>
      <br />
      <Link to={ROUTES.gateway}>Back to start</Link>
    </main>
  );
}
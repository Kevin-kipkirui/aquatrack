import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

export default function CaptureReadingPage() {
  const { householdId } = useParams();
  const a = ROUTES.agent;
  const { signOut } = useAuth();
  return (
    <main>
      <nav>
        <Link to={a.home}>Households</Link> | <Link to={a.queue}>Sync queue</Link> | <Link to={a.profile}>Profile</Link> | <button onClick={signOut}>Log out</button>
      </nav>
      <h1>Capture reading</h1>
      <p>Household: {householdId}</p>
      <p>Previous reading: 0</p>
      <form>
        <input type="number" placeholder="Current reading" /><br />
        <p>Consumption: 0</p>
        <button type="submit">Submit reading</button>
      </form>
      <p>Offline indicator</p>
    </main>
  );
}
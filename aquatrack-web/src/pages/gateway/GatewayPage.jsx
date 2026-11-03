import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

export default function GatewayPage() {
  return (
    <main>
      <h1>AquaTrack</h1>
      <p>Choose how you're signing in</p>
      <Link to={ROUTES.admin.login}>Administrator</Link>
      <br />
      <Link to={ROUTES.agent.login}>Field agent</Link>
    </main>
  );
}
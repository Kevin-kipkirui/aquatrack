import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/routes';

export default function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <Link to={ROUTES.gateway}>Back to start</Link>
    </main>
  );
}
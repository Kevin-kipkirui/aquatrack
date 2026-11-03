import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES } from '../../config/roles';
import { ROUTES } from '../../config/routes';

export default function AdminLoginPage() {
  const { signInWithEmail, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { data, error } = await signInWithEmail(email, password);
    if (error) return setError(error.message);
    if (data.user.app_metadata?.role !== ROLES.ADMIN) {
      await signOut();
      return setError('This account is not an administrator account.');
    }
    navigate(ROUTES.admin.dashboard);
  }

  return (
    <main>
      <h1>Administrator sign in</h1>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <br />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <br />
        <button type="submit">Sign in</button>
      </form>
      {error && <p>{error}</p>}
      <Link to={ROUTES.gateway}>Back</Link>
    </main>
  );
}
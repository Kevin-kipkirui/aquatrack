import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { ROLES } from '../../config/roles';
import { ROUTES } from '../../config/routes';

export default function AgentLoginPage() {
  const { signInWithPhone, signOut } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { data, error } = await signInWithPhone(phone, password);
    if (error) return setError(error.message);
    if (data.user.app_metadata?.role !== ROLES.AGENT) {
      await signOut();
      return setError('This account is not a field agent account.');
    }
    navigate(ROUTES.agent.home);
  }

  return (
    <main>
      <h1>Field agent sign in</h1>
      <form onSubmit={handleSubmit}>
        <input type="tel" placeholder="Phone (254...)" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
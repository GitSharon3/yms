import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import './LoginPage.css';

function LogoMark() {
  return (
    <div className="logoMark" aria-hidden>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M17 9V7a5 5 0 0 0-10 0v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login(identifier, password, remember);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="loginShell">
      <div className="loginCard" role="region" aria-label="Admin login">
        <div className="loginHeader">
          <div className="brandRow">
            <LogoMark />
            <div className="brandName">YMS</div>
          </div>

          <div className="headline">Yard Management System</div>
          <div className="tagline">Streamline Your Operations. Anytime, Anywhere.</div>
        </div>

        <form className="loginForm" onSubmit={onSubmit}>
          <label className="field">
            <div className="fieldLabel">Email Address</div>
            <input
              className="fieldInput"
              inputMode="email"
              autoComplete="username"
              placeholder="your.email@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </label>

          <label className="field">
            <div className="fieldLabel">Password</div>
            <input
              className="fieldInput"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <div className="rowBetween">
            <label className="remember">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>

            <a className="link" href="#" onClick={(e) => e.preventDefault()}>
              Forgot Password?
            </a>
          </div>

          {error && <div className="errorBanner">{error}</div>}

          <button className="primaryBtn" type="submit" disabled={submitting || !identifier.trim() || !password}>
            {submitting ? 'Signing In…' : 'Sign In'}
          </button>
        </form>
      </div>

      <div className="loginFooter">
        © 2024 Yard Management System. All rights reserved.
        <a className="link" href="#" onClick={(e) => e.preventDefault()}>
          Contact Support
        </a>
      </div>
    </div>
  );
}

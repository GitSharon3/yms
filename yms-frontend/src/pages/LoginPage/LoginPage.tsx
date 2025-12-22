import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';
import './LoginPage.css';

interface ValidationError {
  field: 'email' | 'password';
  message: string;
}

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
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ValidationError[]>([]);

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return 'Email or username is required.';
    if (email.length > 254) return 'Email or username cannot exceed 254 characters.';
    if (email.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password.trim()) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (password.length > 200) return 'Password cannot exceed 200 characters.';
    return null;
  };

  const validateForm = (): boolean => {
    const errors: ValidationError[] = [];
    
    const emailError = validateEmail(identifier);
    if (emailError) errors.push({ field: 'email', message: emailError });
    
    const passwordError = validatePassword(password);
    if (passwordError) errors.push({ field: 'password', message: passwordError });
    
    setFieldErrors(errors);
    return errors.length === 0;
  };

  const getFieldError = (field: 'email' | 'password'): string | null => {
    const error = fieldErrors.find(e => e.field === field);
    return error?.message || null;
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    setFieldErrors(prev => prev.filter(e => e.field !== 'email'));
    setGeneralError(null);
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors(prev => prev.filter(e => e.field !== 'password'));
    setGeneralError(null);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setGeneralError(null);

    try {
      await login(identifier, password, remember);
      navigate('/admin', { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      
      // Check if the error is field-specific
      if (errorMessage.toLowerCase().includes('email') || errorMessage.toLowerCase().includes('username')) {
        setFieldErrors([{ field: 'email', message: errorMessage }]);
      } else if (errorMessage.toLowerCase().includes('password')) {
        setFieldErrors([{ field: 'password', message: errorMessage }]);
      } else {
        setGeneralError(errorMessage);
      }
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
              className={`fieldInput ${getFieldError('email') ? 'fieldInput--error' : ''}`}
              inputMode="email"
              autoComplete="username"
              placeholder="your.email@example.com"
              value={identifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              aria-invalid={!!getFieldError('email')}
              aria-describedby={getFieldError('email') ? 'email-error' : undefined}
            />
            {getFieldError('email') && (
              <div id="email-error" className="fieldError" role="alert">
                {getFieldError('email')}
              </div>
            )}
          </label>

          <label className="field">
            <div className="fieldLabel">Password</div>
            <input
              className={`fieldInput ${getFieldError('password') ? 'fieldInput--error' : ''}`}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              aria-invalid={!!getFieldError('password')}
              aria-describedby={getFieldError('password') ? 'password-error' : undefined}
            />
            {getFieldError('password') && (
              <div id="password-error" className="fieldError" role="alert">
                {getFieldError('password')}
              </div>
            )}
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

          {generalError && <div className="errorBanner" role="alert">{generalError}</div>}

          <button 
            className="primaryBtn" 
            type="submit" 
            disabled={submitting || !identifier.trim() || !password}
            aria-busy={submitting}
          >
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../lib/api';
import { Input, Button } from '../components/ui';
import { Eye, EyeOff, ShieldCheck, Activity, ArrowRight } from 'lucide-react';

export default function Login() {
  const nav = useNavigate();
  const [f, setF] = React.useState({ email: '', password: '' });
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [authMode, setAuthMode] = React.useState('password');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const r = await api.post('/auth/login', { email: f.email, password: f.password });
      localStorage.setItem('pharma_token', r.data.data.token);
      localStorage.setItem('pharma_user', JSON.stringify(r.data.data.user));
      nav('/dashboard');
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="loginVisual">
        <div className="brandBlock">
          <div className="brandBadge">M</div>
          <div className="brandText">
            <strong>MediFlux</strong>
            <span>Har smart pharmacy ki pehchaan!</span>
          </div>
        </div>

        <div className="heroContent">
          <h1>Your Gateway to Smart Management</h1>
          <p>Manage Your Pharmacy with Ease and Precision</p>
          <button className="manualButton" type="button" disabled>
            Download User Manual
          </button>
        </div>
      </div>

      <div className="loginPanel">
        <div className="loginCard">
          <div className="authHeader">
            <div>
              <span className="eyebrow">Welcome back</span>
              <h2>Sign in to your account.</h2>
            </div>
          </div>

          <div className="authTabs" role="tablist" aria-label="Authentication methods">
            <button
              type="button"
              className={authMode === 'password' ? 'authTab active' : 'authTab'}
              onClick={() => setAuthMode('password')}
            >
              Password
            </button>
            <button
              type="button"
              className={authMode === 'otp' ? 'authTab active' : 'authTab'}
              onClick={() => setAuthMode('otp')}
            >
              OTP
            </button>
          </div>

          <form onSubmit={submit} className="loginForm">
            <label className="field">
              <span>Email or Phone Number</span>
              <input
                type="text"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                placeholder="Email or 10-digit phone"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="passwordWrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="togglePassword"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <a href="/" className="forgotLink">Forgot Password?</a>
            </label>

            {err && <div className="alert errorBox">{err}</div>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>

          <div className="divider"><span>or</span></div>

          <button type="button" className="googleBtn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.92h5.45c-.24 1.29-.95 2.37-2.02 3.08l3.27 2.53c1.9-1.74 2.99-4.31 2.99-7.37 0-.7-.06-1.37-.18-2.02H12z"/>
              <path fill="#34A853" d="M12 21.5c2.7 0 4.97-.9 6.62-2.43l-3.27-2.53c-.91.61-2.07.97-3.35.97-2.58 0-4.77-1.74-5.55-4.09H.97v2.63A9.5 9.5 0 0 0 12 21.5z"/>
              <path fill="#FBBC05" d="M6.45 18.5A5.73 5.73 0 0 1 6.1 15.3V12.7H2.77A9.5 9.5 0 0 0 .97 15.8c.76 1.75 1.89 3.24 3.45 4.34l1.98-1.64z"/>
              <path fill="#4285F4" d="M12 4.4c1.47 0 2.8.5 3.84 1.48l2.88-2.88A9.5 9.5 0 0 0 12 1.5 9.5 9.5 0 0 0 2.77 12.7h3.33A5.74 5.74 0 0 1 12 4.4z"/>
            </svg>
            Continue with Google
          </button>

          <p className="signupPrompt">
            Not a MediFlux user? <a href="/registration">Sign Up</a>
          </p>

          <div className="footerLinks">
            <a href="/privacy-policy">Privacy Policy</a>
            <span>•</span>
            <a href="/terms-of-service">Terms of Service</a>
            <span>•</span>
            <a href="/refund-policy">Refund Policy</a>
            <span>•</span>
            <a href="/data-deletion">Data Deletion</a>
            <span>•</span>
            <a href="/contact-us">Contact Us</a>
          </div>

          <p className="policyText">By signing in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}


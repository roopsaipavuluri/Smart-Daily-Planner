import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { auth } from '../firebase/auth';
import { firebaseConfigured } from '../firebase/config';
import { db } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';

const messages = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-credential': 'That email and password combination does not match.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/user-not-found': 'No account was found for that email address.',
};

function getErrorMessage(error) {
  return messages[error.code] || error.message || 'Something went wrong. Please try again.';
}

export default function AuthForm({ mode }) {
  const { setRegistrationPending } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';
  const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!firebaseConfigured) {
      setError('Firebase is not configured yet. Add your project settings to .env.local and restart the app.');
      return;
    }
    if (isRegister && values.password !== values.confirm) {
      setError('Your passwords do not match.');
      return;
    }
    setBusy(true);
    if (isRegister) setRegistrationPending(true);
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, values.email.trim());
        setNotice('Password reset instructions have been sent. Check your inbox.');
      } else if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, values.email.trim(), values.password);
        try {
          await updateProfile(credential.user, { displayName: values.name.trim() });
          await setDoc(doc(db, 'users', credential.user.uid), {
            name: values.name.trim(),
            email: credential.user.email,
            photoURL: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (profileError) {
          try {
            await deleteUser(credential.user);
          } catch (rollbackError) {
            throw new Error(`Your account was created, but its profile could not be saved (${profileError.message}); automatic cleanup also failed (${rollbackError.message}). Sign in again to continue.`);
          }
          throw new Error(`Your profile could not be saved, so the new account was removed. ${profileError.message}`);
        }
        navigate('/dashboard', { replace: true });
      } else {
        await signInWithEmailAndPassword(auth, values.email.trim(), values.password);
        navigate(location.state?.from || '/dashboard', { replace: true });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      if (isRegister) setRegistrationPending(false);
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="auth-back" to="/" aria-label="Back to home"><ArrowLeft size={18} /> Home</Link>
      <section className="auth-card">
        <Link to="/" className="brand auth-brand"><span className="brand-mark">d</span><span>daymark</span></Link>
        <div className="auth-heading">
          <span className="eyebrow">{isReset ? 'ACCOUNT RECOVERY' : isRegister ? 'A FRESH START' : 'WELCOME BACK'}</span>
          <h1>{isReset ? 'Reset your password' : isRegister ? 'Make room for what matters.' : 'Good to have you back.'}</h1>
          <p>{isReset ? 'We’ll email you a link to choose a new password.' : isRegister ? 'Create your account and make today count.' : 'Sign in to pick up right where you left off.'}</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Full name<input autoComplete="name" name="name" value={values.name} onChange={update} placeholder="Your name" required maxLength={100} /></label>}
          <label>Email address<input type="email" autoComplete="email" name="email" value={values.email} onChange={update} placeholder="you@example.com" required /></label>
          {!isReset && <label>Password
            <span className="password-input">
              <input type={showPassword ? 'text' : 'password'} autoComplete={isRegister ? 'new-password' : 'current-password'} name="password" value={values.password} onChange={update} placeholder="At least 6 characters" minLength={6} required />
              <button type="button" className="input-action" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>}
          {isRegister && <label>Confirm password<input type="password" autoComplete="new-password" name="confirm" value={values.confirm} onChange={update} placeholder="Enter your password again" minLength={6} required /></label>}
          {!isRegister && !isReset && <div className="form-meta"><span><LockKeyhole size={14} /> Your account is private</span><Link to="/forgot-password">Forgot password?</Link></div>}
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {notice && <p className="form-message success-message" role="status"><Check size={16} /> {notice}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'One moment…' : isReset ? 'Send reset link' : isRegister ? 'Create your account' : 'Log in'}</button>
        </form>
        <div className="auth-footer">
          {isReset ? <Link to="/login">Back to login</Link> : isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>Don’t have an account? <Link to="/register">Create one</Link></>}
        </div>
        {!firebaseConfigured && <p className="setup-hint">Add Firebase values from <code>.env.example</code> to start using authentication.</p>}
      </section>
      <p className="auth-privacy"><LockKeyhole size={14} /> Your personal planner is only visible to you.</p>
    </main>
  );
}

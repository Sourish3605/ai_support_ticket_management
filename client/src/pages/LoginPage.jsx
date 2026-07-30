import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

const LoginPage = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.email) nextErrors.email = 'Email is required';
    if (!form.password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      login(form.email, form.password);
      setMessage('Welcome back! Redirecting to your dashboard...');
      navigate('/dashboard');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.2),_transparent_40%)] p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl lg:grid lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-indigo-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-indigo-100">Support AI</p>
            <h1 className="mt-4 text-4xl font-semibold">Modern support operations, powered by AI.</h1>
            <p className="mt-4 max-w-md text-indigo-100">Route, prioritize, and resolve tickets faster with a unified workspace built for teams.</p>
          </div>
          <div className="rounded-3xl border border-white/20 bg-white/10 p-6">
            <p className="text-sm text-indigo-100">“Every ticket is tracked, every customer is informed.”</p>
          </div>
        </div>
        <div className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-semibold text-white">S</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Welcome back</p>
                <h2 className="text-2xl font-semibold text-slate-900">Sign in to your workspace</h2>
              </div>
            </div>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <Input label="Email or Employee ID" name="email" value={form.email} onChange={handleChange} placeholder="you@company.com" error={errors.email} />
              <div className="relative">
                <Input label="Password" name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="Enter your password" error={errors.password} />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-11 text-slate-500">
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <div className="flex items-center justify-between text-sm text-slate-500">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-300" />
                  <span>Remember me</span>
                </label>
                <a className="font-medium text-indigo-600" href="#">Forgot password?</a>
              </div>
              <Button type="submit" className="w-full">Log in</Button>
            </form>
            {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
            <p className="mt-6 text-sm text-slate-500">
              Don&apos;t have an account? <Link className="font-semibold text-indigo-600" to="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

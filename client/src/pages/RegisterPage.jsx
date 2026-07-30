import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';

const RegisterPage = () => {
  const [form, setForm] = useState({ fullName: '', employeeId: '', email: '', phone: '', department: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName) nextErrors.fullName = 'Full name is required';
    if (!form.employeeId) nextErrors.employeeId = 'Employee ID is required';
    if (!form.email) nextErrors.email = 'Email is required';
    if (!form.phone) nextErrors.phone = 'Phone number is required';
    if (!form.department) nextErrors.department = 'Department is required';
    if (!form.password) nextErrors.password = 'Password is required';
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    register({ name: form.fullName, email: form.email, employeeId: form.employeeId, department: form.department, phone: form.phone });
    navigate('/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.2),_transparent_40%)] p-4">
      <div className="w-full max-w-5xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Create account</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Set up your support team profile</h2>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <Input label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Jade Morgan" error={errors.fullName} />
          <Input label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} placeholder="EMP-1025" error={errors.employeeId} />
          <Input label="Email" type="email" name="email" value={form.email} onChange={handleChange} placeholder="jade@company.com" error={errors.email} />
          <Input label="Phone Number" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 415 555 0185" error={errors.phone} />
          <Input label="Department" name="department" value={form.department} onChange={handleChange} placeholder="Support Ops" error={errors.department} />
          <div className="relative">
            <Input label="Password" type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="Create password" error={errors.password} />
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-11 text-slate-500">
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          <div className="md:col-span-2">
            <Input label="Confirm Password" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm password" error={errors.confirmPassword} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full">Register</Button>
          </div>
        </form>
        <p className="mt-6 text-sm text-slate-500">
          Already have an account? <Link className="font-semibold text-indigo-600" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;

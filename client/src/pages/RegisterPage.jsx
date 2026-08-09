import { useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const RegisterPage = () => {
  const navigate = useNavigate();

  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]:
        event.target.value,
    }));

    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    if (form.password.length < 4) {
      setError(
        "Password must contain at least 4 characters."
      );
      return;
    }

    const user = register(form);

    navigate("/customer/dashboard", {
      replace: true,
      state: {
        message: `Welcome to SupportPilot, ${user.name}!`,
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-indigo-950 p-5">

      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl sm:p-10">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 font-bold text-white">
            SP
          </div>

          <div>
            <p className="text-xl font-bold text-slate-900">
              SupportPilot
            </p>

            <p className="text-xs text-slate-500">
              Create customer account
            </p>
          </div>

        </div>

        <h1 className="mt-8 text-3xl font-bold text-slate-900">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Customer accounts can raise and track support tickets.
        </p>

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-4"
        >

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full name
            </label>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your name"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>

            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Department
            </label>

            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
            >
              <option value="">
                Select department
              </option>
              <option>Finance</option>
              <option>IT</option>
              <option>Operations</option>
              <option>HR</option>
              <option>Sales</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>

            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Create password"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white hover:bg-emerald-700"
          >
            Create account
          </button>

        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-emerald-600"
          >
            Sign in
          </Link>
        </p>

      </div>

    </div>
  );
};

export default RegisterPage;
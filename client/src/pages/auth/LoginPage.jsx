import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

const LoginPage = () => {
  const navigate = useNavigate();

  const { login, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  };

  const redirectUser = (user) => {
    if (!user) {
      setError("Login failed. Please try again.");
      return;
    }

    console.log("Logged in user:", user);
    console.log("User role:", user.role);

    if (user.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    if (user.role === "agent") {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (user.role === "customer") {
      navigate("/portal/tickets", { replace: true });
      return;
    }

    setError("Invalid user role.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!form.email.trim()) {
      setError("Please enter your username or email.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    if (form.password.length < 4) {
      setError(
        "Password must contain at least 4 characters."
      );
      return;
    }

    try {
      setLoading(true);

      const user = await login(
        form.email,
        form.password
      );

      redirectUser(user);
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to login."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    setError("");
    if (selectedRole !== "customer") {
      setError("Google sign-in is available for customer accounts only.");
      return;
    }
    try {
      setLoading(true);
      const user = await loginWithGoogle(response.credential);
      redirectUser(user);
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef4ef] px-4 py-8 sm:px-6 lg:px-8">

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">

        <div className="grid w-full overflow-hidden rounded-[30px] bg-white shadow-2xl lg:grid-cols-2">

          {/* LEFT SIDE */}

          <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#14532d] via-[#166534] to-[#0f2b1d] p-12 text-white lg:block">

            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />

            <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative z-10">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-lg font-bold">
                  SP
                </div>

                <span className="text-2xl font-bold">
                  SupportPilot
                </span>

              </div>

              <div className="mt-24">

                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
                  Intelligent Support
                </p>

                <h1 className="mt-5 text-5xl font-bold leading-tight">
                  Support tickets.
                  <br />
                  Simplified.
                </h1>

                <p className="mt-6 max-w-md text-lg leading-8 text-emerald-50">
                  One intelligent workspace for
                  customers, agents and
                  administrators.
                </p>

              </div>

              <div className="mt-20 grid grid-cols-3 gap-3">

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">
                    24/7
                  </p>

                  <p className="mt-1 text-xs text-emerald-100">
                    Support
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">
                    AI
                  </p>

                  <p className="mt-1 text-xs text-emerald-100">
                    Powered
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-2xl font-bold">
                    Fast
                  </p>

                  <p className="mt-1 text-xs text-emerald-100">
                    Resolution
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="bg-white p-7 sm:p-10 lg:p-12">

            <div className="mx-auto max-w-md">

              {/* MOBILE LOGO */}

              <div className="lg:hidden">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#14532d] font-bold text-white">
                    SP
                  </div>

                  <span className="text-xl font-bold text-slate-900">
                    SupportPilot
                  </span>

                </div>

              </div>

              {/* TITLE */}

              <div className="mt-8 lg:mt-0">

                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#14532d]">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  Sign in
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Access your SupportPilot workspace.
                </p>

                <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
                  {["admin", "agent", "customer"].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold capitalize ${selectedRole === role ? "bg-white text-[#14532d] shadow-sm" : "text-slate-500"}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* LOGIN FORM */}

              <form
                onSubmit={handleSubmit}
                className="mt-7 space-y-5"
              >

                {/* EMAIL */}

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email or username
                  </label>

                  <div className="relative">

                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />

                  </div>

                </div>

                {/* PASSWORD */}

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">

                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>

                  </div>

                </div>

                {/* SIGN IN */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#14532d] py-3.5 font-semibold text-white shadow-lg transition hover:bg-[#0f2b1d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>

                <div className="flex justify-center">
                  {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign-in was cancelled or failed.")} />
                  ) : (
                    <button type="button" onClick={() => setError("Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the frontend deployment.")} className="w-full rounded-xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-700">Continue with Google</button>
                  )}
                </div>

              </form>

              {/* REGISTER */}

              <p className="mt-6 text-center text-sm text-slate-500">

                New to SupportPilot?{" "}

                <Link
                  to="/register"
                  className="font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  Create an account
                </Link>

              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default LoginPage;
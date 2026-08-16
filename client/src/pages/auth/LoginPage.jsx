import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { normalizeRole, getDefaultRouteForRole } from "../../utils/roleUtils";


const portalThemes = {
  admin: {
    portalLabel: "Admin Portal",
    eyebrow: "Control Center",
    headline: "Operate support like mission control.",
    subText: "Govern users, security rules, and system health with executive-level visibility.",
    pageBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800",
    frameBg: "bg-slate-900/70",
    shellBorder: "border border-slate-700/60",
    leftPanel: "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700",
    glowA: "bg-cyan-300/20",
    glowB: "bg-indigo-300/20",
    brandChip: "bg-cyan-300/20 text-cyan-100",
    statCard: "border border-cyan-200/20 bg-white/5",
    statMuted: "text-cyan-100/70",
    rightPanel: "bg-slate-50",
    mobileLogo: "bg-slate-900 text-cyan-100",
    titleAccent: "text-cyan-700",
    titleText: "text-slate-900",
    copyText: "text-slate-500",
    tabWrap: "bg-slate-200",
    tabIdle: "text-slate-500 hover:text-slate-700",
    tabActive: "bg-slate-900 text-cyan-100 shadow-sm",
    inputClass:
      "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/10",
    iconClass: "text-slate-400",
    signInButton:
      "bg-slate-900 text-cyan-100 hover:bg-slate-800 focus-visible:ring-cyan-400/50",
    linkClass: "text-cyan-700 hover:text-cyan-800",
  },
  agent: {
    portalLabel: "Agent Workspace",
    eyebrow: "Work Queue",
    headline: "Resolve faster. Stay in flow.",
    subText: "Triage priority tickets, track SLAs, and deliver quick outcomes with confidence.",
    pageBg: "bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100",
    frameBg: "bg-white/85",
    shellBorder: "border border-blue-200/70",
    leftPanel: "bg-gradient-to-br from-blue-700 via-cyan-700 to-indigo-700",
    glowA: "bg-cyan-200/35",
    glowB: "bg-blue-100/20",
    brandChip: "bg-white/20 text-white",
    statCard: "border border-white/20 bg-white/10",
    statMuted: "text-cyan-50/80",
    rightPanel: "bg-white",
    mobileLogo: "bg-blue-700 text-white",
    titleAccent: "text-blue-700",
    titleText: "text-slate-900",
    copyText: "text-slate-600",
    tabWrap: "bg-blue-50",
    tabIdle: "text-blue-500 hover:text-blue-700",
    tabActive: "bg-white text-blue-700 shadow-sm ring-1 ring-blue-200",
    inputClass:
      "border-blue-100 bg-blue-50/40 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/10",
    iconClass: "text-blue-400",
    signInButton:
      "bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-400/50",
    linkClass: "text-blue-700 hover:text-blue-800",
  },
  customer: {
    portalLabel: "Customer Portal",
    eyebrow: "Smart Support",
    headline: "Support tickets. Simplified.",
    subText: "Raise requests, follow updates, and get AI-guided help from one clean workspace.",
    pageBg: "bg-gradient-to-br from-emerald-50 via-lime-50 to-teal-100",
    frameBg: "bg-white/90",
    shellBorder: "border border-emerald-200/70",
    leftPanel: "bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900",
    glowA: "bg-lime-200/30",
    glowB: "bg-emerald-200/20",
    brandChip: "bg-white/20 text-white",
    statCard: "border border-white/20 bg-white/10",
    statMuted: "text-emerald-50/80",
    rightPanel: "bg-white",
    mobileLogo: "bg-emerald-700 text-white",
    titleAccent: "text-emerald-700",
    titleText: "text-slate-900",
    copyText: "text-slate-500",
    tabWrap: "bg-emerald-50",
    tabIdle: "text-emerald-500 hover:text-emerald-700",
    tabActive: "bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200",
    inputClass:
      "border-emerald-100 bg-emerald-50/40 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/10",
    iconClass: "text-emerald-400",
    signInButton:
      "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-400/50",
    linkClass: "text-emerald-700 hover:text-emerald-800",
  },
};

const roleDetails = {
  admin: {
    idLabel: "Admin email",
    stats: [
      ["Policy", "Access"],
      ["User", "Ops"],
      ["Live", "Audit"],
    ],
  },
  agent: {
    idLabel: "Agent email",
    stats: [
      ["Queue", "Focus"],
      ["SLA", "Tracking"],
      ["Fast", "Resolve"],
    ],
  },
  customer: {
    idLabel: "Email or username",
    stats: [
      ["24/7", "Support"],
      ["AI", "Powered"],
      ["Fast", "Updates"],
    ],
  },
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, loginWithGoogle, user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("customer");
  const isCustomerLogin = selectedRole === "customer";
  const isGoogleConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const activeTheme = portalThemes[selectedRole];
  const selectedRoleMeta = roleDetails[selectedRole];

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

    const canonicalRole = normalizeRole(user.role);
    const targetHome = getDefaultRouteForRole(canonicalRole);

    const fromPath = location.state?.from;
    const isSafePath =
      typeof fromPath === "string" &&
      fromPath.startsWith("/") &&
      fromPath !== "/login" &&
      fromPath !== "/unauthorized" &&
      fromPath !== "/register" &&
      fromPath !== "/";

    // Verify if user's role is permitted to enter the fromPath
    let isPermittedForFrom = false;
    if (isSafePath) {
      if (fromPath.startsWith("/admin") && canonicalRole === "admin") isPermittedForFrom = true;
      else if ((fromPath.startsWith("/dashboard") || fromPath.startsWith("/tickets")) && canonicalRole === "agent") isPermittedForFrom = true;
      else if (fromPath.startsWith("/portal") && canonicalRole === "customer") isPermittedForFrom = true;
    }

    navigate(isPermittedForFrom ? fromPath : targetHome, { replace: true });
  };

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      redirectUser(user);
    }
  }, [isAuthenticated, user, location.state]);


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
        form.password,
        selectedRole
      );
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
    if (!isGoogleConfigured) {
      setError("Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID to the frontend deployment.");
      return;
    }
    if (selectedRole !== "customer") {
      setError("Google sign-in is available for customer accounts only.");
      return;
    }
    try {
      setLoading(true);
      await loginWithGoogle(response.credential);
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen px-4 py-8 sm:px-6 lg:px-8 ${activeTheme.pageBg}`}>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">

        <div className={`grid w-full overflow-hidden rounded-[32px] ${activeTheme.frameBg} ${activeTheme.shellBorder} shadow-2xl backdrop-blur-sm transition-colors duration-300 lg:grid-cols-2`}>

          {/* LEFT SIDE */}

          <div className={`relative hidden overflow-hidden p-12 text-white transition-colors duration-300 lg:block ${activeTheme.leftPanel}`}>

            <div className={`absolute -right-20 -top-20 h-64 w-64 rounded-full ${activeTheme.glowA}`} />

            <div className={`absolute -bottom-20 -left-20 h-72 w-72 rounded-full ${activeTheme.glowB}`} />

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_55%)]" />

            <div className="relative z-10">

              <div className="flex items-center gap-3">

                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold ${activeTheme.brandChip}`}>
                  SP
                </div>

                <span className="text-2xl font-bold">
                  SupportPilot
                </span>

              </div>

              <div className="mt-24">

                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">
                  {activeTheme.eyebrow}
                </p>

                <h1 className="mt-5 text-5xl font-bold leading-tight">
                  {activeTheme.headline}
                </h1>

                <p className="mt-6 max-w-md text-lg leading-8 text-white/85">
                  {activeTheme.subText}
                </p>

              </div>

              <div className="mt-20 grid grid-cols-3 gap-3">

                {selectedRoleMeta.stats.map(([headline, label]) => (
                  <div key={headline} className={`rounded-2xl p-4 ${activeTheme.statCard}`}>
                    <p className="text-2xl font-bold">{headline}</p>

                    <p className={`mt-1 text-xs ${activeTheme.statMuted}`}>{label}</p>
                  </div>
                ))}

              </div>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className={`p-7 sm:p-10 lg:p-12 ${activeTheme.rightPanel}`}>

            <div className="mx-auto max-w-md">

              {/* MOBILE LOGO */}

              <div className="lg:hidden">

                <div className="flex items-center gap-3">

                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${activeTheme.mobileLogo}`}>
                    SP
                  </div>

                  <span className="text-xl font-bold text-slate-900">
                    SupportPilot
                  </span>

                </div>

              </div>

              {/* TITLE */}

              <div className="mt-8 lg:mt-0">

                <p className={`text-sm font-semibold uppercase tracking-[0.25em] ${activeTheme.titleAccent}`}>
                  {activeTheme.portalLabel}
                </p>

                <h2 className={`mt-2 text-3xl font-bold ${activeTheme.titleText}`}>
                  Sign in
                </h2>

                <p className={`mt-2 text-sm ${activeTheme.copyText}`}>
                  Access your SupportPilot workspace.
                </p>

                <div className={`mt-6 grid grid-cols-3 gap-2 rounded-xl p-1 ${activeTheme.tabWrap}`}>
                  {["admin", "agent", "customer"].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`rounded-lg px-2 py-2 text-xs font-semibold capitalize transition ${
                        selectedRole === role ? activeTheme.tabActive : activeTheme.tabIdle
                      }`}
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
                    {selectedRoleMeta.idLabel}
                  </label>

                  <div className="relative">

                    <FiMail className={`absolute left-4 top-1/2 -translate-y-1/2 ${activeTheme.iconClass}`} />

                    <input
                      id="email"
                      name="email"
                      type="text"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@company.com"
                      className={`w-full rounded-xl border py-3.5 pl-11 pr-4 outline-none transition focus:bg-white focus:ring-4 ${activeTheme.inputClass}`}
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

                    <FiLock className={`absolute left-4 top-1/2 -translate-y-1/2 ${activeTheme.iconClass}`} />

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
                      className={`w-full rounded-xl border py-3.5 pl-11 pr-12 outline-none transition focus:bg-white focus:ring-4 ${activeTheme.inputClass}`}
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
                  className={`w-full rounded-xl py-3.5 font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${activeTheme.signInButton}`}
                >
                  {loading
                    ? "Signing in..."
                    : "Sign in"}
                </button>

                {isCustomerLogin && (
                  <div className="flex justify-center">
                    {isGoogleConfigured ? (
                      <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google sign-in was cancelled or failed.")} />
                    ) : (
                      <button type="button" disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3.5 font-semibold text-slate-400">
                        Google sign-in unavailable
                      </button>
                    )}
                  </div>
                )}

                {!isCustomerLogin && (
                  <p className={`text-center text-xs ${activeTheme.copyText}`}>
                    Google sign-in is enabled only for customer portal access.
                  </p>
                )}
              </form>

              {/* Quick Demo Logins */}

              <div className="mt-5 border-t border-slate-200/80 pt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">Quick Demo Credentials</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedRole("admin"); setForm({ email: "admin@company.com", password: "password123" }); }}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedRole("agent"); setForm({ email: "bala@company.com", password: "password123" }); }}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  >
                    🛡️ Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedRole("customer"); setForm({ email: "arun@company.com", password: "password123" }); }}
                    className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
                  >
                    👤 Customer
                  </button>
                </div>
              </div>

              {/* REGISTER */}
              <p className="mt-4 text-center text-sm text-slate-500">
                New to SupportPilot?{" "}
                <Link
                  to="/register"
                  className={`font-semibold ${activeTheme.linkClass}`}
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
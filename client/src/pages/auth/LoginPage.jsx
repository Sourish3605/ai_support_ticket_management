import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiShield,
  FiHeadphones,
  FiUser,
  FiCheck,
  FiChevronDown,
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
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target)
      ) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

      const loggedUser = await login(
        form.email,
        form.password,
        selectedRole
      );
      if (loggedUser) {
        redirectUser(loggedUser);
      }
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
    try {
      setLoading(true);
      const tokenPayload = response?.credential || response;
      const loggedUser = await loginWithGoogle(tokenPayload);
      if (loggedUser) {
        redirectUser(loggedUser);
      }
    } catch (err) {
      setError(err?.message || "Google sign-in failed.");
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

                {/* ENTERPRISE WORKSPACE SELECTOR (NOT SIDE-BY-SIDE) */}
                <div className="mt-6 relative" ref={roleDropdownRef}>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Workspace & Role
                  </label>

                  <button
                    type="button"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs hover:border-slate-300 hover:bg-slate-50/50 transition cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                          selectedRole === "admin"
                            ? "bg-slate-900 text-cyan-300"
                            : selectedRole === "agent"
                            ? "bg-blue-700 text-white"
                            : "bg-emerald-700 text-white"
                        }`}
                      >
                        {selectedRole === "admin" ? (
                          <FiShield />
                        ) : selectedRole === "agent" ? (
                          <FiHeadphones />
                        ) : (
                          <FiUser />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 leading-none">
                          {selectedRole === "admin"
                            ? "System Administrator"
                            : selectedRole === "agent"
                            ? "Support Agent"
                            : "Customer Portal"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate mt-1">
                          {selectedRole === "admin"
                            ? "Executive governance, policies & system health"
                            : selectedRole === "agent"
                            ? "Incident triage, AI routing & SLAs"
                            : "Raise tickets, track status & AI self-service"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-400 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Change
                      </span>
                      <FiChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          roleDropdownOpen ? "rotate-180 text-slate-700" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* FLOATING SELECTION POPOVER */}
                  {roleDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-1.5 space-y-1 backdrop-blur-sm">
                      {[
                        {
                          id: "admin",
                          title: "System Administrator",
                          subtitle: "Governance, RBAC policies & system health",
                          tag: "Executive",
                          Icon: FiShield,
                          activeIcon: "bg-slate-900 text-cyan-300",
                          tagColor: "bg-cyan-50 text-cyan-800 border-cyan-200",
                        },
                        {
                          id: "agent",
                          title: "Support Agent",
                          subtitle: "Incident triage, AI routing & SLAs",
                          tag: "Operations",
                          Icon: FiHeadphones,
                          activeIcon: "bg-blue-700 text-white",
                          tagColor: "bg-blue-50 text-blue-800 border-blue-200",
                        },
                        {
                          id: "customer",
                          title: "Customer",
                          subtitle: "Raise tickets, track status & AI self-service",
                          tag: "End User",
                          Icon: FiUser,
                          activeIcon: "bg-emerald-700 text-white",
                          tagColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        },
                      ].map((item) => {
                        const isSelected = selectedRole === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedRole(item.id);
                              setRoleDropdownOpen(false);
                              setError("");
                            }}
                            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-slate-50 border border-slate-200 text-slate-900 shadow-2xs"
                                : "hover:bg-slate-50 text-slate-700 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                                  isSelected ? item.activeIcon : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <item.Icon />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-slate-900">
                                    {item.title}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${item.tagColor}`}
                                  >
                                    {item.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 pr-1">
                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-extrabold shadow-xs">
                                  <FiCheck className="stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
                  <div className="flex flex-col gap-2">
                    {isGoogleConfigured ? (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="flex justify-center w-full">
                          <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => setError("Google sign-in popup was cancelled or failed. You can use the demo button below.")}
                            theme="outline"
                            size="large"
                            width="100%"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={async () => {
                            setError("");
                            try {
                              setLoading(true);
                              const loggedUser = await loginWithGoogle("mock-google-customer-token");
                              if (loggedUser) {
                                redirectUser(loggedUser);
                              }
                            } catch (err) {
                              setError(err?.message || "Google sign-in failed.");
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="text-center text-[11px] text-emerald-700 hover:text-emerald-800 font-medium underline cursor-pointer py-0.5"
                        >
                          Or continue with Google Customer Demo
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={async () => {
                          setError("");
                          try {
                            setLoading(true);
                            const loggedUser = await loginWithGoogle("mock-google-customer-token");
                            if (loggedUser) {
                              redirectUser(loggedUser);
                            }
                          } catch (err) {
                            setError(err?.message || "Google sign-in failed.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 px-4 font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer hover:border-slate-300"
                      >
                        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Continue with Google</span>
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

              {/* Quick Demo Credentials */}

              <div className="mt-5 border-t border-slate-200/80 pt-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 text-center">
                  Quick Demo Credentials
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("admin");
                      setForm({ email: "admin@gmail.com", password: "password123" });
                      setError("");
                    }}
                    className={`rounded-xl border py-2 px-1 text-xs font-bold transition shadow-xs cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                      selectedRole === "admin"
                        ? "border-slate-900 bg-slate-900 text-cyan-300 ring-2 ring-cyan-400/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm">👑</span>
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("agent");
                      setForm({ email: "agent@gmail.com", password: "password123" });
                      setError("");
                    }}
                    className={`rounded-xl border py-2 px-1 text-xs font-bold transition shadow-xs cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                      selectedRole === "agent"
                        ? "border-blue-700 bg-blue-700 text-white ring-2 ring-blue-400/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm">🛡️</span>
                    <span>Agent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole("customer");
                      setForm({ email: "customer@gmail.com", password: "password123" });
                      setError("");
                    }}
                    className={`rounded-xl border py-2 px-1 text-xs font-bold transition shadow-xs cursor-pointer text-center flex flex-col items-center justify-center gap-0.5 ${
                      selectedRole === "customer"
                        ? "border-emerald-700 bg-emerald-700 text-white ring-2 ring-emerald-400/20"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-sm">👤</span>
                    <span>Customer</span>
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
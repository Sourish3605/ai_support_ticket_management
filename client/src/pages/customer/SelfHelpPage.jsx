import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiShield,
  FiKey,
  FiMonitor,
  FiSettings,
  FiMail,
  FiPrinter,
  FiSearch,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle,
  FiX,
  FiBookOpen,
} from "react-icons/fi";

const ARTICLES = [
  {
    id: "ART-001",
    category: "Network",
    icon: FiShield,
    title: "Cannot connect to VPN",
    summary: "Troubleshoot VPN connection failures when working remotely.",
    steps: [
      "Ensure your internet connection is working by visiting any public website.",
      "Update the VPN client to the latest version from the software portal.",
      "Disconnect any existing VPN sessions and try reconnecting fresh.",
      "Check that the VPN server address matches the corporate gateway (vpn.company.com).",
      "If using multi-factor authentication, ensure your authenticator app time is synchronized.",
      "Restart the VPN client service or restart your workstation.",
      "If the issue persists, submit a ticket to the Network Operations Desk with the error code.",
    ],
    tags: ["vpn", "remote", "connectivity", "network"],
  },
  {
    id: "ART-002",
    category: "Authentication",
    icon: FiKey,
    title: "Forgot password or account locked",
    summary: "Reset your password or unlock your account without raising a ticket.",
    steps: [
      "Navigate to the corporate SSO portal at /auth/recovery.",
      "Enter your corporate email address to receive a verification OTP or push notification.",
      "Check your inbox for the reset link — links expire after 15 minutes.",
      "If you do not receive the email within 5 minutes, use the 'Resend Code' option.",
      "If your account is temporarily locked due to failed attempts, wait 30 minutes for lockout expiry.",
      "For urgent unlocks, contact your system administrator or open an Authentication ticket.",
    ],
    tags: ["password", "login", "locked", "sso", "authentication"],
  },
  {
    id: "ART-003",
    category: "Hardware",
    icon: FiMonitor,
    title: "Laptop slow, freezing, or high CPU usage",
    summary: "Diagnostics to resolve workstation performance before raising a ticket.",
    steps: [
      "Restart your laptop to clear accumulated cache and zombie processes.",
      "Close unused browser tabs and heavy background applications.",
      "Check disk storage — ensure at least 15 GB free space is available on the main drive.",
      "Run system disk cleanup or purge temporary directories.",
      "Inspect Task Manager / Activity Monitor for runaway processes consuming >80% CPU.",
      "Verify system firmware and operating system updates are current.",
      "If slowdown continues, open a Hardware support ticket with your device asset tag.",
    ],
    tags: ["slow", "freeze", "laptop", "performance", "hardware"],
  },
  {
    id: "ART-004",
    category: "Software",
    icon: FiSettings,
    title: "Application crashes or fails to launch",
    summary: "Troubleshoot crashing software applications.",
    steps: [
      "Perform a full restart of the affected application.",
      "Clear application cache and local session cookies.",
      "Check whether an updated application version is available in the company catalog.",
      "Review antivirus logs to ensure files are not quarantined erroneously.",
      "Submit a Software ticket with error dialog screenshots if crashes repeat.",
    ],
    tags: ["software", "crash", "application", "error"],
  },
  {
    id: "ART-005",
    category: "Email",
    icon: FiMail,
    title: "Outlook sync or email deliverability failure",
    summary: "Resolve Outlook synchronization and message delivery issues.",
    steps: [
      "Verify your mailbox is not full or exceeding quota limits.",
      "Check Outlook connection status (bottom right tray indicator should show 'Connected').",
      "Send a test email to an internal recipient to verify outward transmission.",
      "Inspect Junk/Spam folders for missing incoming communications.",
      "Restart Microsoft Outlook in Safe Mode (outlook.exe /safe) to isolate add-in conflicts.",
    ],
    tags: ["email", "outlook", "sync", "deliverability"],
  },
  {
    id: "ART-006",
    category: "Hardware",
    icon: FiPrinter,
    title: "Office network printer offline or paper jam",
    summary: "Quick fixes for office printer connectivity and print spooler errors.",
    steps: [
      "Check printer display panel for error codes or paper jam indicators.",
      "Verify the printer is powered on and connected to the corporate LAN.",
      "Clear local print queue via Windows Print Spooler restart.",
      "Re-add the network printer via corporate print server directory.",
    ],
    tags: ["printer", "hardware", "office", "offline"],
  },
];

const CATEGORIES = ["Network", "Authentication", "Hardware", "Software", "Email"];

export default function SelfHelpPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [solvedToast, setSolvedToast] = useState(false);

  const filtered = useMemo(() => {
    return ARTICLES.filter((article) => {
      const matchesCategory =
        activeCategory === "All" || article.category === activeCategory;
      if (!matchesCategory) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {solvedToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            <FiCheck className="text-emerald-400" />
            <span>Thank you for your feedback. Glad this article helped!</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
          <FiBookOpen />
          <span>Knowledge Base</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Self-Help Troubleshooting Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Find fast troubleshooting guides and solve common IT issues before raising a ticket.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles... e.g. VPN connection, password reset, slow laptop"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <FiX />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeCategory === cat
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <FiSearch className="mx-auto text-3xl text-slate-300 mb-2" />
          <p className="text-xs font-semibold text-slate-800">No articles match your query</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Need direct help?{" "}
            <Link to="/portal/tickets/new" className="text-blue-600 hover:underline font-medium">
              Create a support ticket
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id;
            const Icon = article.icon;

            return (
              <div key={article.id} className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50/80 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-base">
                    <Icon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                        {article.category}
                      </span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-900">{article.title}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{article.summary}</p>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/30">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Recommended Troubleshooting Steps
                    </div>
                    <ol className="space-y-2">
                      {article.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500">Did this solve your issue?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSolvedToast(true);
                            setTimeout(() => setSolvedToast(false), 3000);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <FiCheck className="text-emerald-600" />
                          <span>Yes, Solved</span>
                        </button>
                        <Link
                          to="/portal/tickets/new"
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                        >
                          <FiHelpCircle />
                          <span>Need More Help</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Still Stuck Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center space-y-2 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Still experiencing issues?</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Our specialized department agents are available to assist. Open a support ticket to receive prioritized resolution.
        </p>
        <div className="pt-1">
          <Link
            to="/portal/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <span>Create a Support Ticket</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

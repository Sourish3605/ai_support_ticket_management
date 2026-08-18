import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

const ARTICLES = [
  {
    id: "ART-001",
    category: "VPN & Network",
    icon: "🔒",
    title: "Cannot connect to VPN",
    summary: "Troubleshoot VPN connection failures when working remotely.",
    steps: [
      "Ensure your internet connection is working by visiting any public website.",
      "Update the VPN client to the latest version from the software centre.",
      "Disconnect any existing VPN sessions and try reconnecting fresh.",
      "Check that the VPN server address matches the one in IT's knowledge portal.",
      "If using multi-factor authentication, make sure your authenticator app time is synced.",
      "Restart the VPN service: open Services, find your VPN service, and click Restart.",
      "Contact IT if the issue persists — provide the error code shown.",
    ],
    tags: ["vpn", "remote", "connectivity", "network"],
  },
  {
    id: "ART-002",
    category: "Authentication",
    icon: "🔑",
    title: "Forgot password or locked out",
    summary: "Reset your password or unlock your account without raising a ticket.",
    steps: [
      "Go to the company SSO portal and click 'Forgot Password'.",
      "Enter your company email address and submit.",
      "Check your email inbox (and spam folder) for the reset link — it expires in 15 minutes.",
      "If you don't receive the email within 5 minutes, try the 'Resend' option.",
      "If your account is locked after too many failed attempts, wait 30 minutes before retrying.",
      "For immediate unlock, contact IT via phone during business hours.",
    ],
    tags: ["password", "login", "locked", "sso", "authentication"],
  },
  {
    id: "ART-003",
    category: "Hardware",
    icon: "💻",
    title: "Laptop is slow or freezing",
    summary: "Steps to speed up a sluggish laptop before raising a hardware ticket.",
    steps: [
      "Restart your laptop — this resolves most temporary performance issues.",
      "Close unused applications and browser tabs to free up RAM.",
      "Check Disk Space: if your C: drive has less than 10 GB free, delete temporary files.",
      "Run Windows Disk Cleanup or macOS Storage Management.",
      "Check Task Manager (Ctrl+Shift+Esc) for processes using high CPU or memory.",
      "Make sure Windows/macOS updates are fully installed — restart if pending.",
      "If the issue persists after the above, raise a hardware ticket with your asset tag.",
    ],
    tags: ["slow", "freeze", "laptop", "performance", "hardware"],
  },
  {
    id: "ART-004",
    category: "Software & Apps",
    icon: "⚙️",
    title: "Application keeps crashing or won't open",
    summary: "Fix common application crash issues before contacting support.",
    steps: [
      "Close the application completely (check the system tray) and reopen it.",
      "Restart your computer — a fresh start resolves most crash loops.",
      "Check for application updates via Help → Check for Updates or the software centre.",
      "Clear the application cache: usually in Settings → Advanced → Clear Cache.",
      "If using a web app, try a different browser or clear cookies and cache.",
      "Uninstall and reinstall the application if the above steps don't help.",
      "Note the exact error message before raising a support ticket.",
    ],
    tags: ["crash", "application", "software", "error", "not opening"],
  },
  {
    id: "ART-005",
    category: "Email & Calendar",
    icon: "📧",
    title: "Outlook / email not working",
    summary: "Troubleshoot Outlook sync issues, missing emails, and calendar problems.",
    steps: [
      "Check your internet connection — Outlook needs internet to sync.",
      "Look at the status bar at the bottom of Outlook; click 'Disconnected' to reconnect.",
      "Remove and re-add your account: File → Account Settings → Remove → Add.",
      "Rebuild the Outlook profile if emails are missing or OST file is corrupted.",
      "For calendar issues, run the Microsoft Support and Recovery Assistant tool.",
      "Ensure Office 365 subscription is active in your account settings.",
    ],
    tags: ["outlook", "email", "calendar", "sync", "office"],
  },
  {
    id: "ART-006",
    category: "Printing",
    icon: "🖨️",
    title: "Printer not working or offline",
    summary: "Get your printer back online and fix common printing problems.",
    steps: [
      "Check that the printer is powered on and connected to the network.",
      "On Windows: Settings → Devices → Printers → right-click your printer → See what's printing → clear the queue.",
      "Set the printer to Online: right-click the printer → Use Printer Online.",
      "Remove and reinstall the printer driver from the manufacturer's website.",
      "For network printers, verify the printer IP address matches IT's documentation.",
      "Restart both the printer and your computer if all else fails.",
    ],
    tags: ["printer", "print", "offline", "driver", "queue"],
  },
];

const CATEGORIES = [...new Set(ARTICLES.map((a) => a.category))];

export default function SelfHelpPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return ARTICLES.filter((article) => {
      const matchesCategory =
        activeCategory === "All" || article.category === activeCategory;
      const matchesQuery =
        !q ||
        article.title.toLowerCase().includes(q) ||
        article.summary.toLowerCase().includes(q) ||
        article.tags.some((tag) => tag.includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1c2430]">Self-Help Centre</h1>
        <p className="mt-1 text-sm text-[#8b95a1]">
          Browse common issues and troubleshooting guides. Can't find what you need?{" "}
          <Link to="/portal/tickets/new" className="font-semibold text-[#14532d] hover:underline">
            Raise a ticket
          </Link>
          .
        </p>
      </div>

      <div className="relative mb-5">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b95a1]"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search articles… e.g. VPN, password, slow laptop"
          className="w-full rounded-xl border border-[#dfe5e1] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#1f7a45] focus:ring-2 focus:ring-[#1f7a45]/10"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8b95a1] hover:text-[#1c2430]"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === cat
                ? "border-[#14532d] bg-[#14532d] text-white"
                : "border-[#dfe5e1] bg-white text-[#4b5563] hover:border-[#1f7a45] hover:text-[#14532d]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sp-card p-10 text-center">
          <div className="text-3xl mb-3">🔍</div>
          <p className="font-semibold text-[#1c2430]">No articles found</p>
          <p className="mt-1 text-sm text-[#8b95a1]">
            Try a different search term or{" "}
            <Link to="/portal/tickets/new" className="font-semibold text-[#14532d] hover:underline">
              raise a support ticket
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <div key={article.id} className="sp-card overflow-hidden">
                <button
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-[#f8faf9]"
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                >
                  <span className="text-2xl">{article.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="sp-tag sp-tag-brand text-[10px]">
                        {article.category}
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-[#1c2430]">
                      {article.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#8b95a1]">
                      {article.summary}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[#8b95a1] transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ▾
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#eef2f0] px-4 pb-4 pt-3">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8b95a1]">
                      Troubleshooting Steps
                    </p>
                    <ol className="space-y-2">
                      {article.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-[#4b5563]">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eef4ef] text-[10px] font-bold text-[#14532d]">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-dashed border-[#eef2f0] pt-3">
                      <p className="text-xs text-[#8b95a1]">Did this solve your issue?</p>
                      <button className="sp-btn sp-btn-secondary px-3 py-1 text-[11px]">
                        👍 Yes, solved
                      </button>
                      <Link
                        to="/portal/tickets/new"
                        className="sp-btn sp-btn-primary px-3 py-1 text-[11px]"
                      >
                        No — Raise a ticket
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[#dfe5e1] bg-[#eef4ef] p-5 text-center">
        <p className="text-sm font-semibold text-[#1c2430]">
          Still stuck? Our support team is here.
        </p>
        <p className="mt-1 text-xs text-[#4b5563]">
          Average first response time is under 4 hours during business hours.
        </p>
        <Link
          to="/portal/tickets/new"
          className="sp-btn sp-btn-primary mt-3 inline-flex"
        >
          Raise a support ticket
        </Link>
      </div>
    </div>
  );
}

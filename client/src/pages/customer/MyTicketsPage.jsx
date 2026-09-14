import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiInbox,
  FiPlus,
  FiPaperclip,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
  getCustomerTickets,
  fetchMyTicketsApi,
  getTickets,
  saveTickets,
} from "../../services/ticketService";

const PRIORITY_CONFIG = {
  P1: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  Critical: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  "P1 - Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  "P1 – Critical": { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  High: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  P2: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "P2 - High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "P2 – High": { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  Medium: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  P3: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "P3 - Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "P3 – Medium": { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Low: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  P4: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  "P4 - Low": { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  "P4 – Low": { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

function getPriorityInfo(priority) {
  if (PRIORITY_CONFIG[priority]) return PRIORITY_CONFIG[priority];
  const p = String(priority || "").toUpperCase();
  if (p.includes("P1") || p.includes("CRITICAL")) return PRIORITY_CONFIG.P1;
  if (p.includes("P2") || p.includes("HIGH")) return PRIORITY_CONFIG.P2;
  if (p.includes("P4") || p.includes("LOW")) return PRIORITY_CONFIG.P4;
  return PRIORITY_CONFIG.P3;
}

const STATUS_CONFIG = {
  NEW: { label: "New", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Open: { label: "Open", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  CLASSIFIED: { label: "Classified", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  AI_RESOLUTION_READY: { label: "AI Resolution", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ASSIGNED: { label: "Assigned", badge: "bg-sky-50 text-sky-700 border-sky-200" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  "In Progress": { label: "In Progress", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDING_ASSIGNMENT: { label: "Pending Assignment", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  ESCALATED: { label: "Escalated", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  ON_HOLD: { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  "On Hold": { label: "On Hold", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Resolved: { label: "Resolved", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CLOSED: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  Closed: { label: "Closed", badge: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const apiTickets = await fetchMyTicketsApi();
      if (apiTickets && Array.isArray(apiTickets) && apiTickets.length > 0) {
        setTickets(apiTickets);
        try {
          const current = getTickets();
          const merged = [...apiTickets];
          current.forEach((t) => {
            if (
              !merged.some(
                (m) =>
                  String(m.id) === String(t.id) ||
                  String(m.ticketNumber || m.ticket_number) ===
                    String(t.ticketNumber || t.ticket_number)
              )
            ) {
              merged.push(t);
            }
          });
          storage.set(STORAGE_KEYS.tickets, merged);
        } catch (mErr) {}
      } else if (user) {
        setTickets(getCustomerTickets(user));
      } else {
        setTickets(getCustomerTickets());
      }
    } catch (e) {
      if (user) setTickets(getCustomerTickets(user));
      else setTickets(getCustomerTickets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const handleSync = () => {
      if (user) setTickets(getCustomerTickets(user));
      else setTickets(getCustomerTickets());
    };
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_tickets_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user]);

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(
    (t) => ["NEW", "Open", "CLASSIFIED", "AI_RESOLUTION_READY"].includes(t.status)
  ).length;
  const inProgressTickets = tickets.filter(
    (t) => ["IN_PROGRESS", "In Progress", "Pending", "PENDING_ASSIGNMENT", "ESCALATED"].includes(t.status)
  ).length;
  const resolvedTickets = tickets.filter(
    (t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
            Customer Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Support Ticket Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track, inspect, and reply to your active service requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/portal/tickets/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs cursor-pointer"
          >
            <FiPlus className="text-sm" />
            <span>Create New Ticket</span>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total Tickets</div>
          <div className="my-1 text-2xl font-bold text-slate-900">{totalTickets}</div>
          <div className="text-[11px] text-slate-400">All submissions</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-blue-600">Open Tickets</div>
          <div className="my-1 text-2xl font-bold text-blue-600">{openTickets}</div>
          <div className="text-[11px] text-blue-500">Awaiting triage</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-amber-600">In Progress</div>
          <div className="my-1 text-2xl font-bold text-amber-600">{inProgressTickets}</div>
          <div className="text-[11px] text-amber-500">Under investigation</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">Resolved / Closed</div>
          <div className="my-1 text-2xl font-bold text-emerald-600">{resolvedTickets}</div>
          <div className="text-[11px] text-emerald-500">Completed</div>
        </div>
      </div>

      {/* Ticket List Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            My Submitted Tickets ({tickets.length})
          </h2>
          <button
            onClick={loadTickets}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            <FiRefreshCw className="text-[11px]" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {tickets.map((ticket) => {
            const ticketCode =
              ticket.ticketNumber ||
              ticket.ticket_number ||
              (typeof ticket.id === "number" ? `TKT-${1000 + ticket.id}` : ticket.id);
            const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);

            return (
              <Link
                key={ticket.id || ticketCode}
                to={`/portal/tickets/${ticketCode}`}
                className={`flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50/80 ${
                  isResolved ? "opacity-80" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      #{ticketCode}
                    </span>
                    {(() => {
                      const prio = getPriorityInfo(ticket.priority);
                      return (
                        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${prio.badge}`}>
                          {prio.label}
                        </span>
                      );
                    })()}
                    <span className="truncate text-xs font-semibold text-slate-900">
                      {ticket.subject || ticket.title}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span>
                      Category: <strong className="text-slate-700">{ticket.category || "General"}</strong>
                    </span>
                    {ticket.attachment && (
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <FiPaperclip />
                        <span>Attachment</span>
                      </span>
                    )}
                    <span>
                      Created:{" "}
                      {ticket.createdAt || ticket.created_at
                        ? new Date(ticket.createdAt || ticket.created_at).toLocaleDateString()
                        : "Recently"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${
                      STATUS_CONFIG[ticket.status]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    {STATUS_CONFIG[ticket.status]?.label || ticket.status}
                  </span>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {ticket.assignedAgentName || ticket.assignedAgent || "Support Desk"}
                  </div>
                </div>
              </Link>
            );
          })}

          {!tickets.length && !loading && (
            <div className="py-12 text-center text-slate-500">
              <FiInbox className="mx-auto text-3xl text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-800">No tickets found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">You have not created any support tickets yet.</p>
              <Link
                to="/portal/tickets/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-xs"
              >
                <FiPlus className="text-xs" />
                <span>Create Your First Ticket</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

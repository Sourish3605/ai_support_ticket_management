import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiClock,
  FiAlertTriangle,
  FiAlertCircle,
  FiCheckCircle,
  FiRefreshCw,
  FiInbox,
  FiUser,
} from "react-icons/fi";
import {
  getAllTickets,
  updateTicket,
  fetchAgentTicketsApi,
  assignTicketApi,
  updateAgentAvailabilityApi,
} from "../../services/ticketService";
import { storage, STORAGE_KEYS } from "../../services/storageService";
import { useAuth } from "../../context/AuthContext";

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

function minutesToBreach(ticket) {
  const p = String(ticket.priority || "").toUpperCase();
  const slaHours =
    ticket.slaHours ||
    (p.includes("P1") || p.includes("CRITICAL") ? 4 : p.includes("P2") || p.includes("HIGH") ? 8 : p.includes("P4") || p.includes("LOW") ? 48 : 24);
  const created = ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).getTime() : Date.now();
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : created + slaHours * 3600000;
  return Math.max(-9999, Math.round((due - Date.now()) / 60000));
}

export default function WorkQueuePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const isAssignedToMe = (ticket) => {
    if (!user) return false;
    const myId = String(user.id || "").toLowerCase();
    const myUsername = String(user.username || "").toLowerCase();
    const myName = String(user.name || "").toLowerCase();
    const myEmail = String(user.email || "").toLowerCase();

    const tAgentId = String(ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo ?? "").toLowerCase();
    const tAgentName = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();

    if (myId && tAgentId && (myId === tAgentId || tAgentId === myId)) return true;
    if (myUsername && (tAgentName.includes(myUsername) || tAgentId === myUsername)) return true;
    if (myName && tAgentName.includes(myName)) return true;
    if (myEmail && (tAgentName.includes(myEmail) || tAgentId === myEmail)) return true;
    return false;
  };

  const isUnassigned = (ticket) => {
    const tAgent = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
    const tAgentId = ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo;
    return !tAgentId && (!tAgent || tAgent === "unassigned" || tAgent === "support desk");
  };

  const load = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    let all = [];
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets) && apiTickets.length > 0) {
        all = apiTickets;
      }
    } catch (e) {}

    // Always merge local tickets with API tickets to capture newly submitted ones
    const localTickets = getAllTickets();
    if (localTickets.length > 0) {
      const apiIds = new Set(all.map((t) => String(t.id ?? t.ticketNumber ?? "")));
      const onlyLocal = localTickets.filter(
        (t) => !apiIds.has(String(t.id ?? t.ticketNumber ?? ""))
      );
      all = [...all, ...onlyLocal];
    }

    const actionable = all
      .filter((ticket) => !["Resolved", "RESOLVED", "Closed", "CLOSED"].includes(ticket.status))
      .filter((ticket) => isAssignedToMe(ticket) || isUnassigned(ticket))
      .sort((a, b) => minutesToBreach(a) - minutesToBreach(b));

    setTickets(actionable);
    if (manual) {
      setIsRefreshing(false);
      setToast(`Queue refreshed with ${actionable.length} actionable tickets.`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  useEffect(() => {
    load();
    const handleSync = () => {
      const all = getAllTickets();
      const actionable = all.filter((t) => {
        const isClosed = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status);
        const isAssigned = isTicketAssignedToAgent(t, user);
        const isHold = ["HOLD", "ON_HOLD", "PENDING_CUSTOMER"].includes(t.status);
        return !isClosed && (isAssigned || !t.assignedTo) && !isHold;
      });
      setTickets(actionable);
    };
    window.addEventListener("supportpilot_tickets_changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("supportpilot_tickets_changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user]);

  const agentName = user?.name || user?.username || "Agent";
  const agentId = user?.id || null;

  const claim = async (ticket) => {
    try {
      await assignTicketApi(ticket.id, agentId, agentName);
    } catch (e) {}
    updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedTo: agentId,
      assigned_to: agentId,
      status: "IN_PROGRESS",
    });
    load();
  };

  const currentAvailability = user?.availability_status || user?.availabilityStatus || "AVAILABLE";

  const handleAvailabilityChange = async (newStatus) => {
    if (updateUser) {
      updateUser({
        availability_status: newStatus,
        availabilityStatus: newStatus,
      });
    }

    try {
      const storedUsers = storage.get(STORAGE_KEYS.users, []);
      if (Array.isArray(storedUsers) && user?.email) {
        const uEmail = user.email.toLowerCase().trim();
        const updated = storedUsers.map((u) => {
          if (u.email?.toLowerCase().trim() === uEmail || u.id === user?.id) {
            return { ...u, availabilityStatus: newStatus, availability_status: newStatus };
          }
          return u;
        });
        storage.set(STORAGE_KEYS.users, updated);
        window.dispatchEvent(new CustomEvent("supportpilot_users_changed", { detail: updated }));
      }
    } catch (e) {}

    try {
      await updateAgentAvailabilityApi(newStatus, user?.id, user?.email);
    } catch (e) {}

    const statusNames = {
      AVAILABLE: "Working / Available",
      BUSY: "Busy",
      UNAVAILABLE: "Not Working / Unavailable",
    };
    setToast(`Status updated to ${statusNames[newStatus] || newStatus}.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div className="rounded-lg bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl border border-slate-700 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-400" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* Availability Status Alert Banner if not Available */}
      {currentAvailability !== "AVAILABLE" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="text-amber-600 shrink-0 text-base" />
            <div>
              <strong>Your status is currently '{currentAvailability}'.</strong>
              <div className="text-amber-800 text-[11px] mt-0.5">
                New incoming tickets in your department will not be auto-assigned to you while you are {currentAvailability.toLowerCase()}.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleAvailabilityChange("AVAILABLE")}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
          >
            Set to Available
          </button>
        </div>
      )}

      {/* Control Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="text-xs">
          <span className="font-bold text-slate-900">Ordered by SLA Urgency / Time-to-Breach</span>
          <div className="mt-0.5 text-slate-500 text-[11px]">
            Shows tickets assigned to you and pending unassigned requests ready to be claimed.
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick status selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
            <span className="text-[11px] font-medium text-slate-500">My Status:</span>
            <select
              value={currentAvailability}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="bg-transparent font-semibold text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>

          <button
            onClick={() => load(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw className={isRefreshing ? "animate-spin text-blue-600" : ""} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Queue"}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4 w-[50px]">#</th>
                <th className="py-3 px-4 min-w-[240px]">Ticket & Customer</th>
                <th className="py-3 px-4 w-[140px]">Category</th>
                <th className="py-3 px-4 w-[120px]">Priority</th>
                <th className="py-3 px-4 w-[130px]">Time to Breach</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.map((ticket, index) => {
                const minutes = minutesToBreach(ticket);
                const assignedToMe = isAssignedToMe(ticket);
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;

                return (
                  <tr key={ticket.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 truncate max-w-xs">{ticket.subject || ticket.title}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-mono text-blue-600 font-bold">#{ticketCode}</span>
                        <span>•</span>
                        <span>{ticket.customerName || "Customer"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                        {ticket.category || "General"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {(() => {
                        const prio = getPriorityInfo(ticket.priority);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold ${prio.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              prio.label.includes("P1") ? "bg-red-600" : prio.label.includes("P2") ? "bg-amber-600" : prio.label.includes("P4") ? "bg-slate-400" : "bg-blue-600"
                            }`} />
                            <span>{prio.label}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                      {minutes < 0 ? (
                        <span className="rounded bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 font-bold">
                          Breached
                        </span>
                      ) : minutes <= 60 ? (
                        <span className="rounded bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 font-semibold">
                          {minutes}m left
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          {Math.floor(minutes / 60)}h {minutes % 60}m left
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {assignedToMe ? (
                        <Link
                          to={`/tickets/${ticketCode}`}
                          className="rounded border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Open
                        </Link>
                      ) : (
                        <button
                          onClick={() => claim(ticket)}
                          className="rounded bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs"
                        >
                          Claim
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!tickets.length && (
          <div className="py-12 text-center text-slate-500">
            <FiInbox className="mx-auto text-3xl text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-800">Your actionable queue is clear</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No pending tickets waiting for action.</p>
          </div>
        )}
      </div>
    </div>
  );
}

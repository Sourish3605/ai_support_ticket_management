import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllTickets, updateTicket, fetchAgentTicketsApi, assignTicketApi, updateAgentAvailabilityApi } from "../../services/ticketService";
import { storage, STORAGE_KEYS } from "../../services/storageService";
import { useAuth } from "../../context/AuthContext";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4", P1: "sp-p1", P2: "sp-p2", P3: "sp-p3", P4: "sp-p4", Critical: "sp-p1" };

function minutesToBreach(ticket) {
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : Date.now() + (ticket.slaHours || 24) * 3600000;
  return Math.max(0, Math.round((due - Date.now()) / 60000));
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
    if (!all.length) all = getAllTickets();

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
    const timer = setInterval(() => load(false), 8000);
    return () => clearInterval(timer);
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
      INACTIVE: "Inactive",
    };
    setToast(`Your status updated to ${statusNames[newStatus] || newStatus}.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700">
            {toast}
          </div>
        </div>
      )}

      {/* Availability Status Alert Banner if not Available */}
      {currentAvailability !== "AVAILABLE" && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 p-3.5 rounded-xl border border-amber-300 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <strong>Your status is currently '{currentAvailability}'.</strong>
              <div className="text-amber-800 text-[11px] mt-0.5">
                New incoming tickets in your department will not be auto-assigned to you while you are {currentAvailability.toLowerCase()}.
              </div>
            </div>
          </div>
          <button
            onClick={() => handleAvailabilityChange("AVAILABLE")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow cursor-pointer"
          >
            ✓ Set to Working / Available
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#eef4ef] p-4 rounded-xl border border-[#dfe5e1] border-l-4 border-l-[#1f7a45]">
        <div className="text-xs">
          <strong className="text-[#14532d]">Ordered by time-to-breach, not by creation date</strong>
          <div className="mt-0.5 text-[#4b5563]">
            Shows only tickets assigned to you and unassigned tickets ready for claim. Tickets assigned to other agents are excluded.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick status selector */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">My Status:</span>
            <select
              value={currentAvailability}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
            >
              <option value="AVAILABLE">🟢 Available</option>
              <option value="BUSY">🟡 Busy</option>
              <option value="UNAVAILABLE">🟠 Unavailable</option>
              <option value="INACTIVE">⚪ Inactive</option>
            </select>
          </div>

          <button
            className="sp-btn sp-btn-primary shadow flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-60"
            onClick={() => load(true)}
            disabled={isRefreshing}
            title="Refresh Work Queue"
          >
            <span className={`inline-block text-xs ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
            <span>{isRefreshing ? "Refreshing..." : "Refresh Queue"}</span>
          </button>
        </div>
      </div>

      <div className="sp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-xs">
            <thead className="bg-[#f8faf9] text-left text-[10px] uppercase tracking-wide text-[#4b5563]">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Ticket</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Time to breach</th>
                <th className="px-3 py-2.5">Requester</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket, index) => {
                const minutes = minutesToBreach(ticket);
                const assignedToMe = isAssignedToMe(ticket);
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;

                return (
                  <tr
                    className={`cursor-pointer group hover:bg-[#f0fdf4] transition-colors ${minutes < 30 ? "bg-[#fffbeb]" : ""}`}
                    key={ticket.id}
                    onClick={(e) => {
                      if (e.target.closest("button, select, input, a")) return;
                      navigate(`/tickets/${ticketCode}`);
                    }}
                    title="Click to view ticket details"
                  >
                    <td className="px-3 py-3 font-bold text-[#8b95a1]">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Link
                        to={`/tickets/${ticketCode}`}
                        className="font-semibold text-[#1c2430] group-hover:text-[#15803d] hover:underline block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticket.subject || ticket.title}
                      </Link>
                      <Link
                        to={`/tickets/${ticketCode}`}
                        className="font-mono text-[10px] text-[#8b95a1] group-hover:text-[#15803d] hover:underline inline-block font-bold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ticketCode}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="sp-tag sp-tag-brand">{ticket.category || "Unclassified"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>{ticket.priority}</span>
                    </td>
                    <td className={`px-3 py-3 font-mono font-bold ${minutes < 30 ? "text-[#b91c1c]" : "text-[#15803d]"}`}>
                      {minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}
                    </td>
                    <td className="px-3 py-3">{ticket.customerName || "Customer"}</td>
                    <td className="px-3 py-3 text-right">
                      {assignedToMe ? (
                        <Link to={`/tickets/${ticketCode}`} className="sp-btn sp-btn-secondary px-3 py-1 text-[11px] font-bold">
                          Open
                        </Link>
                      ) : (
                        <button onClick={() => claim(ticket)} className="sp-btn sp-btn-primary px-3 py-1 text-[11px] font-bold">
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
          <div className="p-10 text-center text-sm text-[#8b95a1]">
            Your actionable queue is clear. No pending tickets assigned to you or waiting for claim.
          </div>
        )}
      </div>
    </div>
  );
}

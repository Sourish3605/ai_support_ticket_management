import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { storage, STORAGE_KEYS } from "../../services/storageService";
import {
  getAllTickets,
  fetchAgentTicketsApi,
  updateTicketStatusApi,
  assignTicketApi,
  addTicketReplyApi,
  updateTicket,
  addComment,
  updateAgentAvailabilityApi,
  getDepartmentForCategory,
} from "../../services/ticketService";

const priorityClass = {
  P1: "bg-red-700 text-white",
  High: "bg-red-700 text-white",
  Critical: "bg-red-700 text-white",
  P2: "bg-orange-600 text-white",
  P3: "bg-amber-600 text-white",
  Medium: "bg-amber-600 text-white",
  P4: "bg-slate-600 text-white",
  Low: "bg-slate-600 text-white",
};

const statusClass = {
  NEW: "sp-tag-info font-bold",
  IN_PROGRESS: "sp-tag-warning font-semibold",
  RESOLVED: "sp-tag-success font-semibold",
  CLOSED: "sp-tag-neutral",
  Open: "sp-tag-info",
  "In Progress": "sp-tag-warning font-semibold",
  Resolved: "sp-tag-success font-semibold",
  Closed: "sp-tag-neutral",
  CLASSIFIED: "sp-tag-brand",
  AI_RESOLUTION_READY: "sp-tag-brand font-bold bg-emerald-50 text-emerald-800 border border-emerald-300",
};

const AVAILABILITY_OPTIONS = [
  { value: "AVAILABLE", label: "Working / Available", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
  { value: "BUSY", label: "Busy", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-300" },
  { value: "UNAVAILABLE", label: "Not Working / Unavailable", dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-300" },
  { value: "INACTIVE", label: "Inactive", dot: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100 border-slate-300" },
];

export default function AgentDashboard() {
  const { user, updateUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeReplyTicket, setActiveReplyTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [toast, setToast] = useState(null);
  const [availability, setAvailability] = useState(
    user?.availability_status || user?.availabilityStatus || "AVAILABLE"
  );
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);

  useEffect(() => {
    const current = user?.availability_status || user?.availabilityStatus || "AVAILABLE";
    setAvailability(current);
  }, [user?.email, user?.id, user?.availability_status, user?.availabilityStatus]);

  const handleAvailabilityChange = async (newStatus) => {
    setIsUpdatingAvailability(true);
    setAvailability(newStatus);

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
    } catch (e) {
      console.warn("Error updating local users store:", e);
    }

    try {
      await updateAgentAvailabilityApi(newStatus, user?.id, user?.email);
      setToast({
        type: "success",
        message: `Status updated to ${AVAILABILITY_OPTIONS.find((o) => o.value === newStatus)?.label || newStatus}.`,
      });
    } catch (e) {
      setToast({
        type: "success",
        message: `Status updated to ${AVAILABILITY_OPTIONS.find((o) => o.value === newStatus)?.label || newStatus}.`,
      });
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  const loadTickets = async () => {
    try {
      const apiTickets = await fetchAgentTicketsApi();
      if (apiTickets && Array.isArray(apiTickets)) {
        setTickets(apiTickets);
        return;
      }
    } catch (e) {}
    setTickets(getAllTickets());
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [queueFilter, setQueueFilter] = useState("assigned_to_me"); // "assigned_to_me", "unassigned", "all"

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

  const isAssignedToOther = (ticket) => {
    return !isUnassigned(ticket) && !isAssignedToMe(ticket);
  };

  // Support Agent KPI Calculations
  const totalCount = tickets.length;
  const myAssignedCount = tickets.filter(isAssignedToMe).length;
  const unassignedCount = tickets.filter(isUnassigned).length;
  const newCount = tickets.filter((t) => ["NEW", "Open", "CLASSIFIED", "AI_RESOLUTION_READY"].includes(t.status)).length;
  const inProgressCount = tickets.filter((t) => ["IN_PROGRESS", "In Progress", "Pending"].includes(t.status)).length;
  const resolvedCount = tickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)).length;
  const highPriorityCount = tickets.filter((t) => ["P1", "P2", "High", "Critical"].includes(t.priority)).length;

  const displayedTickets = useMemo(() => {
    if (queueFilter === "assigned_to_me") {
      return tickets.filter(isAssignedToMe);
    }
    if (queueFilter === "unassigned") {
      return tickets.filter(isUnassigned);
    }
    return tickets;
  }, [tickets, queueFilter, user]);

  // Agent Actions
  const handleAssignToMe = async (ticket) => {
    const agentName = user?.name || user?.username || "Agent";
    const agentId = user?.id || null;

    try {
      await assignTicketApi(ticket.id, agentId, agentName);
    } catch (e) {}

    updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedAgentId: agentId,
      assignedTo: agentId,
      assigned_to: agentId,
      status: "ASSIGNED",
      timelineEvent: {
        type: "assigned",
        title: "Ticket Assigned",
        description: `Assigned to ${agentName}.`,
      },
    });

    setToast({ type: "success", message: `Ticket ${ticket.ticketNumber || ticket.id} assigned to you.` });
    loadTickets();
  };

  const handleStatusChange = async (ticket, newStatus) => {
    try {
      await updateTicketStatusApi(ticket.id, newStatus);
    } catch (e) {}

    updateTicket(ticket.id, {
      status: newStatus,
      timelineEvent: {
        type: "status",
        title: `Status updated to ${newStatus}`,
        description: `Agent updated status to ${newStatus}.`,
      },
    });

    setToast({ type: "success", message: `Status updated to ${newStatus}.` });
    loadTickets();
  };

  const handleQuickResolve = async (ticket) => {
    handleStatusChange(ticket, "RESOLVED");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!activeReplyTicket || !replyMessage.trim()) return;

    const replyText = replyMessage.trim();
    setActiveReplyTicket(null);
    setReplyMessage("");

    try {
      await addTicketReplyApi(activeReplyTicket.id, replyText);
    } catch (e) {}

    const agentName = user?.name || user?.username || "Support Agent";
    addComment(activeReplyTicket.id, {
      author: agentName,
      authorRole: "SUPPORT_AGENT",
      visibility: "Public",
      message: replyText,
    });

    setToast({ type: "success", message: `✓ Reply sent to customer on ${activeReplyTicket.ticketNumber || activeReplyTicket.id}.` });
    loadTickets();
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700">
            {toast.message}
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0c1a2e] via-[#163354] to-[#1d4ed8] p-5 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Support Workspace</span>
            <span className="rounded-full bg-cyan-400/20 border border-cyan-300/30 px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-200">
              🏢 {user?.department || "IT Department"}
            </span>
            {user?.title && (
              <span className="text-[11px] text-cyan-100/70 hidden sm:inline">• {user.title}</span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2">
            Support Agent Dashboard
            <span className="text-xs font-normal text-white/80">({user?.name || user?.username || "Agent"})</span>
          </h1>
          <p className="text-xs text-white/70 mt-0.5">Manage ticket queue, triage requests, assign agents, and reply to customers.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Availability Status Selector */}
          <div className="flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-md px-3 py-1.5 border border-white/20">
            <span className="text-[11px] font-semibold text-white/80">My Status:</span>
            <div className="relative">
              <select
                value={availability}
                disabled={isUpdatingAvailability}
                onChange={(e) => handleAvailabilityChange(e.target.value)}
                className="rounded-lg bg-slate-900/90 text-white font-bold text-xs py-1 pl-2.5 pr-6 border border-white/20 focus:outline-hidden focus:ring-2 focus:ring-cyan-400 cursor-pointer"
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white font-medium">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Status dot */}
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                AVAILABILITY_OPTIONS.find((o) => o.value === availability)?.dot || "bg-emerald-500"
              }`}
              title={AVAILABILITY_OPTIONS.find((o) => o.value === availability)?.label}
            />
          </div>

          <Link to="/tickets" className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#1d4ed8] shadow hover:bg-blue-50 transition">
            View All ({totalCount})
          </Link>
          <button onClick={loadTickets} className="rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/25 transition cursor-pointer">
            Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b95a1]">Total Tickets</div>
          <div className="my-1 text-2xl font-extrabold text-[#1c2430]">{totalCount}</div>
          <div className="text-[11px] font-semibold text-[#15803d]">All submissions</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Assigned To Me</div>
          <div className="my-1 text-2xl font-extrabold text-emerald-700">{myAssignedCount}</div>
          <div className="text-[11px] font-semibold text-emerald-600">Your active queue</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">In Progress</div>
          <div className="my-1 text-2xl font-extrabold text-amber-700">{inProgressCount}</div>
          <div className="text-[11px] font-semibold text-amber-600">Active investigation</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Unassigned</div>
          <div className="my-1 text-2xl font-extrabold text-blue-700">{unassignedCount}</div>
          <div className="text-[11px] font-semibold text-blue-600">Awaiting assignment</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-red-600">High Priority</div>
          <div className="my-1 text-2xl font-extrabold text-red-700">{highPriorityCount}</div>
          <div className="text-[11px] font-semibold text-red-600">P1 / P2 / Urgent</div>
        </div>
      </div>

      {/* Ticket Table with Actionable Filter Tabs */}
      <div className="sp-card overflow-hidden">
        <div className="border-b border-[#dfe5e1] bg-[#fafbfa] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#1c2430]">Support Ticket Queue</h2>
            <p className="text-[11px] text-slate-500">Tickets assigned to you appear as actionable work</p>
          </div>

          {/* Queue Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setQueueFilter("assigned_to_me")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                queueFilter === "assigned_to_me"
                  ? "bg-white text-emerald-800 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✦ Assigned to Me ({myAssignedCount})
            </button>
            <button
              onClick={() => setQueueFilter("unassigned")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                queueFilter === "unassigned"
                  ? "bg-white text-blue-800 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unassigned Queue ({unassignedCount})
            </button>
            <button
              onClick={() => setQueueFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                queueFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Tickets ({tickets.length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-xs">
            <thead className="bg-[#f4f7f5] text-left text-[10px] uppercase tracking-wider text-[#4b5563]">
              <tr>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Ticket ID</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Subject</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Department</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Category</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Priority</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Status</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Created Date</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedTickets.map((ticket) => {
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
                const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);
                const assignedToMe = isAssignedToMe(ticket);
                const assignedToOther = isAssignedToOther(ticket);
                const deptName = ticket.department || getDepartmentForCategory(ticket.category);

                return (
                  <tr
                    className={`transition-colors border-b border-[#eef2f0] ${
                      assignedToMe ? "bg-emerald-50/20 hover:bg-emerald-50/40" : "hover:bg-[#f8faf9]"
                    }`}
                    key={ticket.id}
                  >
                    {/* Ticket ID */}
                    <td className="px-3.5 py-3 font-mono font-bold text-[#14532d]">
                      {ticketCode}
                    </td>

                    {/* Subject */}
                    <td className="px-3.5 py-3 max-w-[260px]">
                      <div className="font-semibold text-[#1c2430] truncate">{ticket.subject || ticket.title}</div>
                      <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                        <span className="text-[#8b95a1]">{ticket.customerName || "Customer"}</span>
                        {assignedToMe && (
                          <span className="rounded bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 text-[9px] font-bold">
                            Assigned to You
                          </span>
                        )}
                        {assignedToOther && (
                          <span className="rounded bg-slate-100 text-slate-600 px-1.5 py-0.2 text-[9px] font-medium">
                            Assigned: {ticket.assignedAgentName || ticket.assignedAgent}
                          </span>
                        )}
                        {!assignedToMe && !assignedToOther && (
                          <span className="rounded bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 text-[9px] font-medium">
                            Unassigned
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-3.5 py-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 text-slate-800 px-2 py-0.5 text-[10px] font-bold">
                        <span>🏢</span> {deptName}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="px-3.5 py-3">
                      <span className="sp-tag sp-tag-brand font-semibold">{ticket.category || "Account"}</span>
                    </td>

                    {/* Priority */}
                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${priorityClass[ticket.priority] || "bg-slate-600 text-white"}`}>
                        {ticket.priority || "Medium"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-3">
                      <span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>
                        {ticket.status}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="px-3.5 py-3 text-[#4b5563]">
                      {ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).toLocaleDateString() : "Recently"}
                    </td>

                    {/* Actions: Distinguish assigned to me vs other agents */}
                    <td className="px-3.5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Open Ticket Details */}
                        <Link
                          to={`/tickets/${ticketCode}`}
                          className="rounded-lg bg-slate-900 text-white px-2.5 py-1 text-[11px] font-bold hover:bg-slate-800 transition"
                        >
                          Open
                        </Link>

                        {assignedToOther ? (
                          <span
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 border border-slate-200"
                            title={`Assigned to ${ticket.assignedAgentName || ticket.assignedAgent}. Non-actionable for you.`}
                          >
                            🔒 Assigned
                          </span>
                        ) : (
                          <>
                            {/* Assign to me (for unassigned) */}
                            {!assignedToMe && (
                              <button
                                onClick={() => handleAssignToMe(ticket)}
                                className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                                title="Assign to me"
                              >
                                Claim
                              </button>
                            )}

                            {/* Change Status Dropdown */}
                            <select
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket, e.target.value)}
                              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 outline-none cursor-pointer"
                            >
                              <option value="NEW">NEW</option>
                              <option value="ASSIGNED">ASSIGNED</option>
                              <option value="IN_PROGRESS">IN_PROGRESS</option>
                              <option value="RESOLVED">RESOLVED</option>
                              <option value="CLOSED">CLOSED</option>
                            </select>

                            {/* Reply */}
                            <button
                              onClick={() => {
                                setActiveReplyTicket(ticket);
                                setReplyMessage("");
                              }}
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                            >
                              Reply
                            </button>

                            {/* Resolve */}
                            {!isResolved && (
                              <button
                                onClick={() => handleQuickResolve(ticket)}
                                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer shadow-sm"
                              >
                                Resolve
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!displayedTickets.length && (
          <div className="p-10 text-center text-sm text-[#8b95a1]">
            {queueFilter === "assigned_to_me"
              ? "You have no tickets currently assigned to you."
              : queueFilter === "unassigned"
              ? "No unassigned tickets waiting in queue."
              : "No tickets found in the queue."}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {activeReplyTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-800">
                  {activeReplyTicket.ticketNumber || activeReplyTicket.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Reply to: {activeReplyTicket.subject || activeReplyTicket.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveReplyTicket(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Support Agent Reply:
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="Enter your support response..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReplyTicket(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!replyMessage.trim()}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow cursor-pointer disabled:opacity-50"
                >
                  Send Reply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllTickets,
  updateTicket,
  updateTicketStatusApi,
} from "../services/ticketService";

function isTicketAssignedToAgent(ticket, agent) {
  if (!ticket || !agent) return false;
  const tAgentName = String(ticket.assignedAgentName || ticket.assignedAgent || "").toLowerCase();
  const tAgentId = String(ticket.assignedAgentId ?? ticket.assigned_to ?? ticket.assignedTo ?? "").toLowerCase();
  const agId = String(agent.id || "").toLowerCase();
  const agName = String(agent.name || "").toLowerCase();
  const agUsername = String(agent.username || "").toLowerCase();
  const agEmail = String(agent.email || "").toLowerCase();

  if (agId && tAgentId && agId === tAgentId) return true;
  if (agName && (tAgentName.includes(agName) || agName.includes(tAgentName))) return true;
  if (agUsername && (tAgentName.includes(agUsername) || tAgentId === agUsername)) return true;
  if (agEmail && (tAgentName.includes(agEmail) || tAgentId === agEmail)) return true;
  return false;
}

function isTicketOnHold(ticket) {
  if (!ticket || !ticket.status) return false;
  const s = String(ticket.status).toUpperCase();
  return (
    s === "ON_HOLD" ||
    s === "ON HOLD" ||
    s === "HOLD" ||
    s === "PENDING" ||
    s === "WAITING" ||
    s.includes("HOLD") ||
    s.includes("WAIT")
  );
}

function isTicketCompleted(ticket) {
  if (!ticket || !ticket.status) return false;
  const s = String(ticket.status).toUpperCase();
  return s === "RESOLVED" || s === "CLOSED";
}

const PRIORITY_BADGES = {
  Critical: "bg-red-500/20 text-red-300 border-red-500/40",
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  High: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  P2: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Low: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  P4: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

export default function AgentHoldTicketsModal({
  agent,
  isOpen,
  onClose,
  initialTab = "hold",
  allTickets: passedTickets,
  onTicketStatusChange,
  onSwitchUser,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab); // "hold", "incomplete", "all", "completed"
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  // Sync tickets
  useEffect(() => {
    if (passedTickets && Array.isArray(passedTickets) && passedTickets.length > 0) {
      setTickets(passedTickets);
    } else {
      setTickets(getAllTickets());
    }
  }, [passedTickets, isOpen]);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "hold");
      setSearchQuery("");
    }
  }, [isOpen, initialTab, agent?.email]);

  const agentTickets = useMemo(() => {
    if (!agent) return [];
    return tickets.filter((t) => isTicketAssignedToAgent(t, agent));
  }, [tickets, agent]);

  const holdTickets = useMemo(
    () => agentTickets.filter(isTicketOnHold),
    [agentTickets]
  );

  const notCompletedTickets = useMemo(
    () => agentTickets.filter((t) => !isTicketCompleted(t)),
    [agentTickets]
  );

  const completedTickets = useMemo(
    () => agentTickets.filter(isTicketCompleted),
    [agentTickets]
  );

  // Current tab tickets filtered by search query
  const filteredTickets = useMemo(() => {
    let list = [];
    if (activeTab === "hold") {
      list = holdTickets;
    } else if (activeTab === "incomplete") {
      list = notCompletedTickets;
    } else if (activeTab === "completed") {
      list = completedTickets;
    } else {
      list = agentTickets;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((t) => {
      const num = String(t.ticketNumber || t.id || "").toLowerCase();
      const title = String(t.title || t.subject || "").toLowerCase();
      const desc = String(t.description || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();
      const status = String(t.status || "").toLowerCase();
      return num.includes(q) || title.includes(q) || desc.includes(q) || cat.includes(q) || status.includes(q);
    });
  }, [activeTab, holdTickets, notCompletedTickets, completedTickets, agentTickets, searchQuery]);

  if (!isOpen || !agent) return null;

  const initials = (agent.name || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleStatusChange = async (ticket, newStatus) => {
    setUpdatingId(ticket.id);
    try {
      // Local update
      const updated = { ...ticket, status: newStatus };
      if (newStatus === "ON_HOLD" && !updated.holdReason) {
        updated.holdReason = "Placed on hold by agent review";
      }
      updateTicket(ticket.id, updated);
      try {
        await updateTicketStatusApi(ticket.id, newStatus);
      } catch (e) {}

      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, ...updated } : t))
      );
      if (onTicketStatusChange) {
        onTicketStatusChange(ticket.id, newStatus);
      }
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: updated }));
      setToastNotice(`✓ Status updated to ${newStatus}`);
      setTimeout(() => setToastNotice(null), 3000);
    } catch (err) {
      console.error("Failed to update ticket status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenTicket = (ticket) => {
    if (onClose) onClose();
    const id = ticket.ticketNumber || ticket.id;
    navigate(`/tickets/${id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* AGENT AVATAR */}
            <div className="relative shrink-0">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-base text-white shadow-lg bg-gradient-to-br ${
                  agent.avatarGradient || agent.avatarBg || "from-blue-600 to-indigo-700"
                }`}
              >
                {initials}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                  agent.availabilityStatus === "BUSY"
                    ? "bg-amber-400"
                    : agent.availabilityStatus === "UNAVAILABLE"
                    ? "bg-orange-400"
                    : agent.availabilityStatus === "INACTIVE"
                    ? "bg-slate-400"
                    : "bg-emerald-400"
                }`}
                title={`Status: ${agent.availabilityStatus || "Available"}`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-white truncate">
                  {agent.name}
                </h2>
                {agent.isTeamLead && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
                    👑 Team Lead
                  </span>
                )}
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                    agent.badgeColor || "bg-cyan-500/20 text-cyan-300 border-cyan-400/40"
                  }`}
                >
                  {agent.deptBadge || agent.department}
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                <span>{agent.title || agent.specialty}</span>
                <span>•</span>
                <span className="text-slate-500 truncate">{agent.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchUser && (
              <button
                type="button"
                onClick={() => onSwitchUser(agent)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer"
                title="Switch session to this agent"
              >
                <span>🔄 Switch Session</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Close modal"
            >
              <span className="text-lg leading-none">✕</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION NOTICE */}
        {toastNotice && (
          <div className="mx-5 mt-3 rounded-lg bg-emerald-950/90 border border-emerald-500/50 px-3 py-2 text-xs font-bold text-emerald-200 text-center animate-fade-in">
            {toastNotice}
          </div>
        )}

        {/* WORKLOAD KPI HIGHLIGHTS */}
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. TICKETS ON HOLD (PROMINENT HIGHLIGHT) */}
          <button
            type="button"
            onClick={() => setActiveTab("hold")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
              activeTab === "hold"
                ? "bg-amber-950/70 border-amber-500/80 shadow-lg shadow-amber-950/50 ring-1 ring-amber-400/50"
                : "bg-slate-900/80 border-slate-800 hover:border-amber-500/40 hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <span>⏸️</span>
                <span>On Hold</span>
              </span>
              <span className="text-[10px] font-bold text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Action Required
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {holdTickets.length}
            </div>
            <p className="text-[11px] text-amber-200/70 mt-0.5 truncate">
              {holdTickets.length === 1 ? "1 ticket on hold" : `${holdTickets.length} tickets on hold`}
            </p>
          </button>

          {/* 2. NOT COMPLETED TICKETS (ACTIVE / IN PROGRESS / OPEN) */}
          <button
            type="button"
            onClick={() => setActiveTab("incomplete")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
              activeTab === "incomplete"
                ? "bg-cyan-950/70 border-cyan-500/80 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50"
                : "bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                <span>⏳</span>
                <span>Not Completed</span>
              </span>
              <span className="text-[10px] font-bold text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                In Progress
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">
              {notCompletedTickets.length}
            </div>
            <p className="text-[11px] text-cyan-200/70 mt-0.5 truncate">
              Pending & Active backlog
            </p>
          </button>

          {/* 3. TOTAL ASSIGNED WORKLOAD */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
              activeTab === "all"
                ? "bg-slate-800 border-blue-500/80 shadow-lg ring-1 ring-blue-400/50"
                : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <span>📋</span>
                <span>Total Assigned</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {agentTickets.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              All assigned tickets
            </p>
          </button>

          {/* 4. RESOLVED / COMPLETED TICKETS */}
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative overflow-hidden group ${
              activeTab === "completed"
                ? "bg-emerald-950/70 border-emerald-500/80 shadow-lg ring-1 ring-emerald-400/50"
                : "bg-slate-900/80 border-slate-800 hover:border-emerald-500/40 hover:bg-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <span>✅</span>
                <span>Completed</span>
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {completedTickets.length}
            </div>
            <p className="text-[11px] text-emerald-200/70 mt-0.5 truncate">
              Resolved & closed tickets
            </p>
          </button>
        </div>

        {/* TABS & SEARCH CONTROLS */}
        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* TABS */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("hold")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "hold"
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md font-black"
                  : "text-amber-300/80 hover:text-amber-200 hover:bg-slate-800/70"
              }`}
            >
              <span>⏸️ On Hold</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-black">
                {holdTickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("incomplete")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "incomplete"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md font-black"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/70"
              }`}
            >
              <span>⏳ Not Completed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-black">
                {notCompletedTickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "all"
                  ? "bg-slate-700 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
              }`}
            >
              <span>📋 All Assigned</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-black">
                {agentTickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "completed"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-black"
                  : "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/70"
              }`}
            >
              <span>✅ Completed</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-black">
                {completedTickets.length}
              </span>
            </button>
          </div>

          {/* SEARCH */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by ID, title..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700/80 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* TICKET LIST */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/30">
              <div className="text-3xl mb-2">
                {activeTab === "hold" ? "🎉" : "📋"}
              </div>
              <h3 className="text-sm font-bold text-white">
                {activeTab === "hold"
                  ? `No tickets currently on hold for ${agent.name}!`
                  : activeTab === "incomplete"
                  ? `All assigned tickets for ${agent.name} are completed!`
                  : `No tickets found matching this filter.`}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === "hold"
                  ? "All active workload is moving forward without any blocker or hold delay."
                  : "Great workload distribution across departments."}
              </p>
              {activeTab !== "all" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700 text-xs font-semibold hover:bg-cyan-900 transition cursor-pointer"
                >
                  View all {agentTickets.length} assigned tickets →
                </button>
              )}
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isOnHold = isTicketOnHold(ticket);
              const isCompleted = isTicketCompleted(ticket);
              const priorityClass =
                PRIORITY_BADGES[ticket.priority] ||
                "bg-slate-500/20 text-slate-300 border-slate-500/40";

              return (
                <div
                  key={ticket.id}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2.5 ${
                    isOnHold
                      ? "bg-amber-950/20 border-amber-500/40 hover:border-amber-500/70 shadow-sm shadow-amber-950/20"
                      : isCompleted
                      ? "bg-slate-900/40 border-slate-800 hover:border-slate-700 opacity-80"
                      : "bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850"
                  }`}
                >
                  {/* TICKET TOP ROW */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenTicket(ticket)}
                          className="text-xs font-black text-cyan-400 hover:text-cyan-300 hover:underline font-mono cursor-pointer flex items-center gap-1"
                          title="Open ticket details"
                        >
                          <span>{ticket.ticketNumber || ticket.id}</span>
                          <span>↗</span>
                        </button>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${priorityClass}`}>
                          {ticket.priority || "Medium"}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          {ticket.category || "General"}
                        </span>
                        {isOnHold && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse">
                            <span>⏸️</span>
                            <span>ON HOLD</span>
                          </span>
                        )}
                        {!isOnHold && !isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                            {ticket.status || "IN_PROGRESS"}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ✓ {ticket.status || "RESOLVED"}
                          </span>
                        )}
                      </div>

                      <h4
                        onClick={() => handleOpenTicket(ticket)}
                        className="text-sm font-bold text-white hover:text-cyan-300 transition cursor-pointer mt-1"
                      >
                        {ticket.title || ticket.subject || "Support Ticket"}
                      </h4>

                      {ticket.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                          {ticket.description}
                        </p>
                      )}

                      {/* HOLD REASON CALLOUT */}
                      {isOnHold && (
                        <div className="mt-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-1.5">
                          <span className="text-amber-400 shrink-0">⏸️ Hold Reason:</span>
                          <span className="italic">
                            {ticket.holdReason ||
                              ticket.escalationReason ||
                              "Awaiting client or 3rd party dependency before continuation."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TICKET FOOTER WITH ACTIONS */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Requester: <strong className="text-slate-300">{ticket.customerName || "Customer"}</strong></span>
                      {ticket.createdAt && (
                        <>
                          <span>•</span>
                          <span>Opened: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* QUICK STATUS CHANGER */}
                      <select
                        disabled={updatingId === ticket.id}
                        value={isOnHold ? "ON_HOLD" : ticket.status || "IN_PROGRESS"}
                        onChange={(e) => handleStatusChange(ticket, e.target.value)}
                        className="bg-slate-950 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold py-1 px-2 rounded-lg outline-none cursor-pointer"
                        title="Change ticket status"
                      >
                        <option value="ON_HOLD">⏸️ Set On Hold</option>
                        <option value="IN_PROGRESS">⚡ In Progress</option>
                        <option value="NEW">🆕 Open / New</option>
                        <option value="RESOLVED">✅ Resolved</option>
                        <option value="CLOSED">🔒 Closed</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleOpenTicket(ticket)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Details</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 px-5 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredTickets.length}</strong> of{" "}
            <strong className="text-white">{agentTickets.length}</strong> assigned tickets for{" "}
            <strong className="text-cyan-300">{agent.name}</strong>.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition cursor-pointer"
            >
              Close Workload View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

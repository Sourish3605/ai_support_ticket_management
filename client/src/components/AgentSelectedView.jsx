import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiChevronLeft,
  FiUser,
  FiClock,
  FiPauseCircle,
  FiCheckCircle,
  FiAlertCircle,
  FiEye,
} from "react-icons/fi";

/**
 * Matches a ticket to an agent using ID, username, email, or name.
 */
function isTicketAssignedToAgent(ticket, agent) {
  if (!ticket || !agent) return false;
  const tAgId = String(ticket.assigned_to ?? ticket.assignedTo ?? ticket.assignedAgentId ?? "").toLowerCase();
  const tAgName = String(
    ticket.assigned_agent_name || ticket.assignedAgentName || ticket.assignedAgent || ""
  ).toLowerCase();
  const agId = String(agent.id || agent.pk || "").toLowerCase();
  const agName = String(agent.name || "").toLowerCase();
  const agUsername = String(agent.username || "").toLowerCase();
  const agEmail = String(agent.email || "").toLowerCase();

  if (agId && tAgId && agId === tAgId) return true;
  if (agUsername && (tAgId === agUsername || tAgName === agUsername || tAgName.includes(agUsername))) return true;
  if (agEmail && (tAgId === agEmail || tAgName === agEmail || tAgName.includes(agEmail))) return true;
  if (agName && agName.length > 2 && (tAgName.includes(agName) || agName.includes(tAgName))) return true;
  return false;
}

export default function AgentSelectedView({ agent, allTickets = [], onClearAgent }) {
  if (!agent) return null;

  const agentTickets = useMemo(
    () => allTickets.filter((t) => isTicketAssignedToAgent(t, agent)),
    [allTickets, agent]
  );

  // Pending: not resolved/closed and not on hold
  const pendingTickets = useMemo(
    () =>
      agentTickets.filter((t) => {
        const s = String(t.status || "").toUpperCase();
        return (
          !["RESOLVED", "CLOSED"].includes(s) &&
          !s.includes("HOLD") &&
          !s.includes("WAIT") &&
          s !== "PENDING"
        );
      }),
    [agentTickets]
  );

  // On Hold: hold/pending/waiting statuses
  const onHoldTickets = useMemo(
    () =>
      agentTickets.filter((t) => {
        const s = String(t.status || "").toUpperCase();
        return (
          s === "ON_HOLD" ||
          s === "ON HOLD" ||
          s === "HOLD" ||
          s === "PENDING" ||
          s === "WAITING" ||
          s.includes("HOLD") ||
          s.includes("WAIT")
        );
      }),
    [agentTickets]
  );

  // Solved: resolved or closed
  const solvedTickets = useMemo(
    () =>
      agentTickets.filter((t) => {
        const s = String(t.status || "").toUpperCase();
        return s === "RESOLVED" || s === "CLOSED";
      }),
    [agentTickets]
  );

  const avail = (agent.availability_status || agent.availability || agent.status || "AVAILABLE").toUpperCase();
  const isAvail = avail === "AVAILABLE";
  const isBusy = avail === "BUSY";

  return (
    <div className="space-y-6">
      {/* AGENT HEADER */}
      <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
              {(agent.name || agent.username || "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {agent.name || agent.username}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                <span className="text-slate-500">{agent.department || "IT Support"}</span>
                {agent.title && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">{agent.title}</span>
                  </>
                )}
                <span className="text-slate-300">·</span>
                <div className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isAvail ? "bg-emerald-500" : isBusy ? "bg-amber-500" : "bg-slate-400"
                    }`}
                  />
                  <span
                    className={`font-semibold ${
                      isAvail ? "text-emerald-700" : isBusy ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    {isAvail ? "Available" : isBusy ? "Busy" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Back button */}
          <button
            type="button"
            onClick={onClearAgent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <FiChevronLeft className="w-3.5 h-3.5" />
            All Tickets
          </button>
        </div>
      </div>

      {/* THREE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
            <span>Pending</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-blue-600">{pendingTickets.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active open tickets</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (pendingTickets.length / Math.max(1, agentTickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* On Hold */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
            <span>On Hold</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <FiPauseCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600">{onHoldTickets.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Paused / waiting</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (onHoldTickets.length / Math.max(1, agentTickets.length)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Solved */}
        <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-3">
            <span>Solved</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600">{solvedTickets.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Resolved / closed</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${Math.min(100, (solvedTickets.length / Math.max(1, agentTickets.length)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* TICKET BREAKDOWN TABLE */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FiUser className="w-4 h-4 text-blue-600" />
              {agent.name || agent.username}'s Tickets
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{agentTickets.length} total assigned</p>
          </div>
        </div>

        {agentTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No tickets assigned to {agent.name || agent.username}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentTickets.map((t) => {
                  const ticketCode = t.ticketNumber || t.id;
                  const s = String(t.status || "").toUpperCase();
                  const isResolved = s === "RESOLVED" || s === "CLOSED";
                  const isHold = s.includes("HOLD") || s.includes("WAIT") || s === "PENDING";
                  const isP1 = t.priority === "Critical" || t.priority === "P1";
                  const isP2 = t.priority === "High" || t.priority === "P2";

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {ticketCode}
                      </td>
                      <td className="py-3 px-4 max-w-[260px]">
                        <div className="font-semibold text-slate-800 truncate" title={t.subject || t.title}>
                          {t.subject || t.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {t.customerName || t.customerEmail || "Customer"}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                            isP1
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : isP2
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {isP1 ? "P1 – Critical" : isP2 ? "P2 – High" : t.priority || "P3"}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isResolved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : isHold
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isResolved ? (
                            <FiCheckCircle className="w-3 h-3" />
                          ) : isHold ? (
                            <FiPauseCircle className="w-3 h-3" />
                          ) : (
                            <FiAlertCircle className="w-3 h-3" />
                          )}
                          {t.status || "OPEN"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/portal/tickets/${ticketCode}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 transition"
                          title="View Ticket"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

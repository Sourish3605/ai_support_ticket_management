import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCustomerTickets, fetchMyTicketsApi } from "../../services/ticketService";

const priorityClass = {
  P1: "sp-p1",
  High: "sp-p1",
  Critical: "sp-p1",
  P2: "sp-p2",
  P3: "sp-p3",
  Medium: "sp-p2",
  P4: "sp-p4",
  Low: "sp-p4",
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

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const apiTickets = await fetchMyTicketsApi();
      if (apiTickets && Array.isArray(apiTickets)) {
        setTickets(apiTickets);
      } else if (user) {
        setTickets(getCustomerTickets(user));
      } else {
        setTickets(getCustomerTickets());
      }
    } catch (e) {
      if (user) setTickets(getCustomerTickets(user));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(
    (t) => ["NEW", "Open", "CLASSIFIED", "AI_RESOLUTION_READY"].includes(t.status)
  ).length;
  const inProgressTickets = tickets.filter(
    (t) => ["IN_PROGRESS", "In Progress", "Pending"].includes(t.status)
  ).length;
  const resolvedTickets = tickets.filter(
    (t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)
  ).length;

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Customer Portal</span>
          <h1 className="text-2xl font-bold text-[#1c2430]">Customer Dashboard</h1>
          <p className="text-xs text-[#8b95a1] mt-0.5">
            Track and manage your submitted support tickets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/portal/tickets"
            className="rounded-xl border border-emerald-700/30 bg-emerald-50/50 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm transition"
          >
            My Tickets
          </Link>
          <Link
            to="/portal/tickets/new"
            className="sp-btn sp-btn-primary shadow"
          >
            + Create Ticket
          </Link>
        </div>
      </div>

      {/* Customer Dashboard Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b95a1]">Total Tickets</div>
          <div className="my-1 text-2xl font-extrabold text-[#1c2430]">{totalTickets}</div>
          <div className="text-[11px] font-medium text-slate-500">All submissions</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Open Tickets</div>
          <div className="my-1 text-2xl font-extrabold text-blue-700">{openTickets}</div>
          <div className="text-[11px] font-medium text-blue-600">Awaiting triage</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">In Progress</div>
          <div className="my-1 text-2xl font-extrabold text-amber-700">{inProgressTickets}</div>
          <div className="text-[11px] font-medium text-amber-600">Under investigation</div>
        </div>

        <div className="sp-card p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Resolved</div>
          <div className="my-1 text-2xl font-extrabold text-emerald-700">{resolvedTickets}</div>
          <div className="text-[11px] font-medium text-emerald-600">Completed</div>
        </div>
      </div>

      {/* Ticket List Section */}
      <div className="sp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#dfe5e1] bg-[#fafbfa] px-4 py-3">
          <h2 className="text-sm font-bold text-[#1c2430]">My Tickets Queue</h2>
          <button
            onClick={loadTickets}
            className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="divide-y divide-[#eef2f0]">
          {tickets.map((ticket) => {
            const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
            const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);

            return (
              <Link
                key={ticket.id}
                to={`/portal/tickets/${ticketCode}`}
                className={`flex items-center justify-between gap-4 p-4 no-underline transition hover:bg-[#f8faf9] ${
                  isResolved ? "opacity-75" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#14532d]">
                      {ticketCode}
                    </span>
                    <span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>
                      {ticket.priority}
                    </span>
                    <span className="truncate text-sm font-semibold text-[#1c2430]">
                      {ticket.subject || ticket.title}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8b95a1]">
                    <span>Category: <strong>{ticket.category || "Account"}</strong></span>
                    {ticket.attachment && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        📎 Attachment
                      </span>
                    )}
                    <span>
                      Created: {ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).toLocaleDateString() : "Recently"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>
                    {ticket.status === "AI_RESOLUTION_READY" ? "✦ AI Ready" : ticket.status}
                  </span>
                  <div className="mt-1 text-[10px] text-[#8b95a1]">
                    {ticket.assignedAgentName || ticket.assignedAgent || "Support Desk"}
                  </div>
                </div>
              </Link>
            );
          })}

          {!tickets.length && !loading && (
            <div className="p-12 text-center">
              <div className="text-3xl mb-2">🎫</div>
              <p className="text-sm font-semibold text-[#1c2430]">No tickets found</p>
              <p className="text-xs text-[#8b95a1] mt-1">You haven't created any support tickets yet.</p>
              <Link to="/portal/tickets/new" className="mt-4 inline-block sp-btn sp-btn-primary text-xs">
                + Create Your First Ticket
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

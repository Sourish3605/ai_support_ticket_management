import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getAllTickets,
  fetchAgentTicketsApi,
  updateTicketStatusApi,
  assignTicketApi,
  addTicketReplyApi,
  updateTicket,
  addComment,
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

export default function AgentAllTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [category, setCategory] = useState("All categories");
  const [activeReplyTicket, setActiveReplyTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [toast, setToast] = useState(null);

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

  const categories = [...new Set(tickets.map((ticket) => ticket.category).filter(Boolean))];
  const filtered = useMemo(() => tickets.filter((ticket) => {
    const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
    const haystack = `${ticketCode} ${ticket.subject || ticket.title} ${ticket.customerName || ""} ${ticket.category || ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (status === "All statuses" || ticket.status === status)
      && (priority === "All priorities" || ticket.priority === priority)
      && (category === "All categories" || ticket.category === category);
  }), [tickets, query, status, priority, category]);

  const handleAssignToMe = async (ticket) => {
    const agentName = user?.name || user?.username || "Agent";
    const agentId = user?.id || null;

    try {
      await assignTicketApi(ticket.id, agentId);
    } catch (e) {}

    updateTicket(ticket.id, {
      assignedAgent: agentName,
      assignedAgentName: agentName,
      assignedTo: agentId,
      assignedAgentId: agentId,
      timelineEvent: {
        type: "assigned",
        title: "Ticket Assigned",
        description: `Assigned to ${agentName}.`,
      },
    });

    setToast({ type: "success", message: `Ticket assigned to ${agentName}.` });
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

    const agentName = user?.name || user?.username || "Support Agent";
    try {
      await addTicketReplyApi(activeReplyTicket.id, replyMessage.trim());
    } catch (e) {}

    addComment(activeReplyTicket.id, {
      author: agentName,
      authorRole: "SUPPORT_AGENT",
      visibility: "Public",
      message: replyMessage.trim(),
    });

    setToast({ type: "success", message: `Reply posted.` });
    setActiveReplyTicket(null);
    setReplyMessage("");
    loadTickets();
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-2xl border border-slate-700">
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1c2430]">All Support Tickets</h1>
          <p className="text-xs text-[#8b95a1] mt-0.5">
            Complete list of customer tickets across all channels and statuses.
          </p>
        </div>
        <button className="sp-btn sp-btn-primary shadow" onClick={loadTickets}>
          Refresh Queue
        </button>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Tickets", value: tickets.length },
          { label: "New / Open", value: tickets.filter((t) => ["NEW", "Open"].includes(t.status)).length },
          { label: "In Progress", value: tickets.filter((t) => ["IN_PROGRESS", "In Progress"].includes(t.status)).length },
          { label: "High Priority", value: tickets.filter((t) => ["P1", "P2", "High", "Critical"].includes(t.priority)).length },
        ].map((item) => (
          <div className="sp-card p-4" key={item.label}>
            <div className="text-[11px] font-semibold text-[#8b95a1] uppercase tracking-wider">{item.label}</div>
            <div className="my-1 text-2xl font-extrabold text-[#1c2430]">{item.value}</div>
            <div className="text-[11px] text-[#15803d]">Agent Queue</div>
          </div>
        ))}
      </div>

      {/* Filter and Table Card */}
      <div className="sp-card overflow-hidden">
        <div className="flex flex-wrap gap-2 p-4 bg-[#fafbfa] border-b border-[#dfe5e1]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticket code, subject, customer..."
            className="min-w-[240px] flex-1 rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#1f7a45]"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All statuses</option>
            <option value="NEW">NEW</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse text-xs">
            <thead className="bg-[#f4f7f5] text-left text-[10px] uppercase tracking-wider text-[#4b5563]">
              <tr>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Ticket ID</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Subject</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Category</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Priority</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Status</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold">Created Date</th>
                <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => {
                const ticketCode = ticket.ticketNumber || ticket.ticket_number || ticket.id;
                const isResolved = ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(ticket.status);

                return (
                  <tr className="hover:bg-[#f8faf9] transition-colors border-b border-[#eef2f0]" key={ticket.id}>
                    <td className="px-3.5 py-3 font-mono font-bold text-[#14532d]">
                      {ticketCode}
                    </td>

                    <td className="px-3.5 py-3 max-w-[260px]">
                      <div className="font-semibold text-[#1c2430] truncate">{ticket.subject || ticket.title}</div>
                      <div className="text-[10px] text-[#8b95a1]">
                        {ticket.customerName || "Customer"} {ticket.assignedAgentName || ticket.assignedAgent ? `· ${ticket.assignedAgentName || ticket.assignedAgent}` : "· Unassigned"}
                      </div>
                    </td>

                    <td className="px-3.5 py-3">
                      <span className="sp-tag sp-tag-brand font-semibold">{ticket.category || "General"}</span>
                    </td>

                    <td className="px-3.5 py-3">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${priorityClass[ticket.priority] || "bg-slate-600 text-white"}`}>
                        {ticket.priority || "Medium"}
                      </span>
                    </td>

                    <td className="px-3.5 py-3">
                      <span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>
                        {ticket.status}
                      </span>
                    </td>

                    <td className="px-3.5 py-3 text-[#4b5563]">
                      {ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).toLocaleDateString() : "Recently"}
                    </td>

                    <td className="px-3.5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/tickets/${ticketCode}`}
                          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 transition"
                        >
                          View
                        </Link>

                        <button
                          onClick={() => handleAssignToMe(ticket)}
                          className="rounded bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                        >
                          Assign
                        </button>

                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusChange(ticket, e.target.value)}
                          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 outline-none"
                        >
                          <option value="NEW">NEW</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>

                        <button
                          onClick={() => {
                            setActiveReplyTicket(ticket);
                            setReplyMessage("");
                          }}
                          className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                        >
                          Reply
                        </button>

                        {!isResolved && (
                          <button
                            onClick={() => handleQuickResolve(ticket)}
                            className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <div className="p-10 text-center text-sm text-[#8b95a1]">
            No tickets match these filters.
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {activeReplyTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Reply to: {activeReplyTicket.ticketNumber || activeReplyTicket.id}
              </h3>
              <button
                onClick={() => setActiveReplyTicket(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-4">
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                required
                placeholder="Enter response..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-blue-600"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReplyTicket(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow"
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

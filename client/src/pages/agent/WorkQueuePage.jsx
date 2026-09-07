import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets, updateTicket, fetchAgentTicketsApi, assignTicketApi } from "../../services/ticketService";
import { useAuth } from "../../context/AuthContext";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4", P1: "sp-p1", P2: "sp-p2", P3: "sp-p3", P4: "sp-p4", Critical: "sp-p1" };

function minutesToBreach(ticket) {
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : Date.now() + (ticket.slaHours || 24) * 3600000;
  return Math.max(0, Math.round((due - Date.now()) / 60000));
}

export default function WorkQueuePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);

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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
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

  return (
    <div className="space-y-4">
      <div className="rounded-r-lg border border-[#dfe5e1] border-l-4 border-l-[#1f7a45] bg-[#eef4ef] p-3.5 text-xs">
        <strong>Ordered by time-to-breach, not by creation date</strong>
        <div className="mt-1 text-[#4b5563]">
          Shows only tickets assigned to you and unassigned tickets ready for claim. Tickets assigned to other agents are excluded.
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
                  <tr className={minutes < 30 ? "bg-[#fffbeb]" : ""} key={ticket.id}>
                    <td className="px-3 py-3 font-bold text-[#8b95a1]">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Link to={`/tickets/${ticketCode}`} className="font-semibold text-[#1c2430] hover:underline">
                        {ticket.subject || ticket.title}
                      </Link>
                      <div className="font-mono text-[10px] text-[#8b95a1]">{ticketCode}</div>
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

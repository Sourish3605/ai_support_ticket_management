import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCustomerTickets } from "../../services/ticketService";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4" };
const statusClass = { Open: "sp-tag-info", "In Progress": "sp-tag-brand", Resolved: "sp-tag-success", Pending: "sp-tag-warning" };

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  useEffect(() => setTickets(getCustomerTickets(user.id)), [user.id]);
  const openCount = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status)).length;
  return <div className="mx-auto max-w-[850px]"><div className="mb-5 flex items-end justify-between gap-3"><div><h1 className="text-xl font-bold">My tickets</h1><p className="text-xs text-[#8b95a1]">{openCount} open - {tickets.length - openCount} resolved in the last 30 days</p></div><Link to="/portal/tickets/new" className="sp-btn sp-btn-primary">+ Raise a ticket</Link></div><div className="space-y-3">{tickets.map((ticket) => <Link key={ticket.id} to={`/portal/tickets/${ticket.id}`} className={`flex items-center justify-between gap-4 rounded-xl border border-[#dfe5e1] bg-white p-4 no-underline transition hover:border-[#1f7a45] ${ticket.status === "Resolved" ? "opacity-70" : ""}`}><div className="min-w-0"><div className="flex items-center gap-2"><span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>{ticket.priority}</span><span className="truncate text-[13.5px] font-semibold text-[#1c2430]">{ticket.subject}</span></div><div className="mt-1 font-mono text-[10px] text-[#8b95a1]">{ticket.id} - {ticket.category} - raised {new Date(ticket.createdAt).toLocaleDateString()}</div></div><div className="shrink-0 text-right"><span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>{ticket.status}</span><div className="mt-1 text-[10px] text-[#8b95a1]">{ticket.assignedAgent || "Unassigned"}</div></div></Link>)}{!tickets.length && <div className="sp-card p-10 text-center text-sm text-[#8b95a1]">You have not created any tickets yet.</div>}</div></div>;
}

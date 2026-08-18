import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets, updateTicket } from "../../services/ticketService";
import { useAuth } from "../../context/AuthContext";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4" };
function minutesToBreach(ticket) { const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : Date.now() + (ticket.slaHours || 24) * 3600000; return Math.max(0, Math.round((due - Date.now()) / 60000)); }
export default function WorkQueuePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const load = () => setTickets(getAllTickets().filter((ticket) => !["Resolved", "Closed"].includes(ticket.status)).sort((a, b) => minutesToBreach(a) - minutesToBreach(b)));
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, []);
  const agentName = user?.name || user?.username || "Agent";
  const agentId = user?.id || "agent-current";
  const claim = (ticket) => { updateTicket(ticket.id, { assignedAgent: agentName, assignedTo: agentId, status: "In Progress" }); load(); };
  return <div><div className="mb-4 rounded-r-lg border border-[#dfe5e1] border-l-4 border-l-[#1f7a45] bg-[#eef4ef] p-3 text-xs"><strong>Ordered by time-to-breach, not by creation date</strong><div className="mt-1 text-[#4b5563]">A critical ticket raised five minutes ago outranks a lower priority ticket raised yesterday.</div></div><div className="sp-card overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-xs"><thead className="bg-[#f8faf9] text-left text-[10px] uppercase tracking-wide text-[#4b5563]"><tr><th className="px-3 py-2">#</th><th className="px-3 py-2">Ticket</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Priority</th><th className="px-3 py-2">Time to breach</th><th className="px-3 py-2">Requester</th><th /></tr></thead><tbody>{tickets.map((ticket, index) => { const minutes = minutesToBreach(ticket); return <tr className={minutes < 30 ? "bg-[#fffbeb]" : ""} key={ticket.id}><td className="px-3 py-3 font-bold text-[#8b95a1]">{index + 1}</td><td className="px-3 py-3"><Link to={`/tickets/${ticket.id}`} className="font-semibold text-[#1c2430]">{ticket.subject}</Link><div className="font-mono text-[10px] text-[#8b95a1]">{ticket.id}</div></td><td className="px-3 py-3"><span className="sp-tag sp-tag-brand">{ticket.category || "Unclassified"}</span></td><td className="px-3 py-3"><span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>{ticket.priority}</span></td><td className={`px-3 py-3 font-mono font-bold ${minutes < 30 ? "text-[#b91c1c]" : "text-[#15803d]"}`}>{minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`}</td><td className="px-3 py-3">{ticket.customerName}</td><td className="px-3 py-3">{ticket.assignedTo ? <Link to={`/tickets/${ticket.id}`} className="sp-btn sp-btn-secondary px-3 py-1 text-[11px]">Open</Link> : <button onClick={() => claim(ticket)} className="sp-btn sp-btn-primary px-3 py-1 text-[11px]">Claim</button>}</td></tr>; })}</tbody></table></div>{!tickets.length && <div className="p-10 text-center text-sm text-[#8b95a1]">Your queue is clear.</div>}</div></div>;
}

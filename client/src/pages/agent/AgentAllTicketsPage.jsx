import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets } from "../../services/ticketService";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4" };
const statusClass = { Open: "sp-tag-info", "In Progress": "sp-tag-brand", Resolved: "sp-tag-success", Closed: "sp-tag-neutral", Pending: "sp-tag-warning" };

export default function AgentAllTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [category, setCategory] = useState("All categories");

  useEffect(() => setTickets(getAllTickets()), []);

  const categories = [...new Set(tickets.map((ticket) => ticket.category).filter(Boolean))];
  const filtered = useMemo(() => tickets.filter((ticket) => {
    const haystack = `${ticket.id} ${ticket.subject} ${ticket.customerName} ${ticket.department}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (status === "All statuses" || ticket.status === status)
      && (priority === "All priorities" || ticket.priority === priority)
      && (category === "All categories" || ticket.category === category);
  }), [tickets, query, status, priority, category]);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button className="sp-btn sp-btn-primary" onClick={() => setTickets(getAllTickets())}>Refresh</button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[{ label: "Received today", value: tickets.length }, { label: "Classified", value: tickets.filter((ticket) => ticket.ai).length }, { label: "Classification accuracy", value: "94%" }, { label: "SLA at risk", value: tickets.filter((ticket) => ticket.priority === "High").length }].map((item) => (
          <div className="sp-card p-4" key={item.label}><div className="text-[11px] font-semibold text-[#8b95a1]">{item.label}</div><div className="my-1 text-2xl font-extrabold">{item.value}</div><div className="text-[11px] text-[#15803d]">Live from ticket workspace</div></div>
        ))}
      </div>
      <div className="sp-card overflow-hidden">
        <div className="flex flex-wrap gap-2 p-4">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ticket no, subject, requester..." className="min-w-[220px] flex-1 rounded-lg border border-[#dfe5e1] px-3 py-2 text-xs outline-none focus:border-[#1f7a45]" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-xs"><option>All statuses</option><option>Open</option><option>In Progress</option><option>Pending</option><option>Resolved</option><option>Closed</option></select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-xs"><option>All priorities</option><option>High</option><option>Medium</option><option>Low</option></select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-xs"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-xs"><thead className="bg-[#f8faf9] text-left text-[10px] uppercase tracking-wide text-[#4b5563]"><tr>{["Ticket", "Subject", "Category", "Priority", "Status", "Confidence", "Assignee", ""].map((heading) => <th className="border-b border-[#dfe5e1] px-3 py-2" key={heading}>{heading}</th>)}</tr></thead><tbody>{filtered.map((ticket) => <tr className="hover:bg-[#fafbfa]" key={ticket.id}><td className="border-b border-[#eef2f0] px-3 py-3 font-mono font-bold">{ticket.id}</td><td className="border-b border-[#eef2f0] px-3 py-3"><div className="font-semibold">{ticket.subject}</div><div className="text-[10px] text-[#8b95a1]">{ticket.customerName} · {ticket.department || "General"}</div></td><td className="border-b border-[#eef2f0] px-3 py-3"><span className="sp-tag sp-tag-brand">{ticket.category || "Unclassified"}</span></td><td className="border-b border-[#eef2f0] px-3 py-3"><span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>{ticket.priority}</span></td><td className="border-b border-[#eef2f0] px-3 py-3"><span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>{ticket.status}</span></td><td className="border-b border-[#eef2f0] px-3 py-3 font-mono text-[#15803d]">{ticket.ai ? `${Math.round(ticket.ai.categoryConfidence * 100)}%` : "-"}</td><td className="border-b border-[#eef2f0] px-3 py-3 text-[#4b5563]">{ticket.assignedAgent || "Unassigned"}</td><td className="border-b border-[#eef2f0] px-3 py-3"><Link className="sp-btn sp-btn-secondary px-3 py-1 text-[11px]" to={`/tickets/${ticket.id}`}>Open</Link></td></tr>)}</tbody></table></div>
        {!filtered.length && <div className="p-10 text-center text-sm text-[#8b95a1]">No tickets match these filters.</div>}
        <div className="border-t border-[#dfe5e1] px-4 py-3 text-[11px] text-[#8b95a1]">Showing {filtered.length} of {tickets.length}</div>
      </div>
    </div>
  );
}

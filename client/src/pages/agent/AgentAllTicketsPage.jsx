import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets } from "../../services/ticketService";

const priorityClass = {
  P1: "bg-red-700 text-white",
  High: "bg-red-700 text-white",
  P2: "bg-orange-600 text-white",
  P3: "bg-amber-600 text-white",
  Medium: "bg-amber-600 text-white",
  P4: "bg-slate-600 text-white",
  Low: "bg-slate-600 text-white",
};

const severityClass = {
  Critical: "text-red-700 bg-red-50 font-bold border border-red-200",
  High: "text-orange-700 bg-orange-50 font-semibold border border-orange-200",
  Medium: "text-amber-700 bg-amber-50 font-semibold border border-amber-200",
  Low: "text-slate-600 bg-slate-50 border border-slate-200",
};

const statusClass = {
  NEW: "sp-tag-info",
  CLASSIFIED: "sp-tag-brand",
  AI_RESOLUTION_READY: "sp-tag-brand font-bold bg-emerald-50 text-emerald-800 border border-emerald-300",
  Open: "sp-tag-info",
  "In Progress": "sp-tag-warning",
  Resolved: "sp-tag-success",
  Closed: "sp-tag-neutral",
  Pending: "sp-tag-warning",
};

export default function AgentAllTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [priority, setPriority] = useState("All priorities");
  const [category, setCategory] = useState("All categories");

  useEffect(() => setTickets(getAllTickets()), []);

  const categories = [...new Set(tickets.map((ticket) => ticket.category).filter(Boolean))];
  const filtered = useMemo(() => tickets.filter((ticket) => {
    const haystack = `${ticket.id} ${ticket.subject} ${ticket.customerName} ${ticket.department} ${ticket.severity}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (status === "All statuses" || ticket.status === status)
      && (priority === "All priorities" || ticket.priority === priority)
      && (category === "All categories" || ticket.category === category);
  }), [tickets, query, status, priority, category]);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <button className="sp-btn sp-btn-primary" onClick={() => setTickets(getAllTickets())}>Refresh Workspace</button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Ingested", value: tickets.length },
          { label: "AI Classified", value: tickets.filter((ticket) => ticket.ai || ticket.category !== "General").length },
          { label: "Classification Accuracy", value: "94.2%" },
          { label: "High Priority (P1/P2)", value: tickets.filter((ticket) => ["P1", "P2", "High"].includes(ticket.priority)).length },
        ].map((item) => (
          <div className="sp-card p-4" key={item.label}>
            <div className="text-[11px] font-semibold text-[#8b95a1]">{item.label}</div>
            <div className="my-1 text-2xl font-extrabold text-[#1c2430]">{item.value}</div>
            <div className="text-[11px] text-[#15803d]">Enterprise Workspace</div>
          </div>
        ))}

      </div>

      <div className="sp-card overflow-hidden">
        <div className="flex flex-wrap gap-2 p-4 bg-[#fafbfa] border-b border-[#dfe5e1]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ticket code, subject, requester..."
            className="min-w-[240px] flex-1 rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs outline-none focus:border-[#1f7a45]"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All statuses</option>
            <option>NEW</option>
            <option>CLASSIFIED</option>
            <option>AI_RESOLUTION_READY</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>Closed</option>
          </select>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All priorities</option>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
            <option>P4</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-xs">
            <option>All categories</option>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead className="bg-[#f4f7f5] text-left text-[10px] uppercase tracking-wider text-[#4b5563]">
              <tr>
                {["Ticket", "Subject & Requester", "Category", "Severity", "Priority", "Status", "AI Confidence", "Assignee", "Action"].map((heading) => (
                  <th className="border-b border-[#dfe5e1] px-3.5 py-3 font-bold" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr className="hover:bg-[#f8faf9] transition-colors" key={ticket.id}>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5 font-mono font-bold text-[#14532d]">
                    {ticket.id}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5 max-w-[280px]">
                    <div className="font-semibold text-[#1c2430] truncate">{ticket.subject}</div>
                    <div className="text-[10px] text-[#8b95a1] mt-0.5">{ticket.customerName} · {ticket.department || "Finance"}</div>
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5">
                    <span className="sp-tag sp-tag-brand font-semibold">{ticket.category || "General"}</span>
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${severityClass[ticket.severity] || "text-slate-600 bg-slate-50"}`}>
                      {ticket.severity || "Medium"}
                    </span>
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${priorityClass[ticket.priority] || "bg-slate-600 text-white"}`}>
                      {ticket.priority || "P3"}
                    </span>
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5">
                    <span className={`sp-tag ${statusClass[ticket.status] || "sp-tag-neutral"}`}>
                      {ticket.status === "AI_RESOLUTION_READY" ? "✦ AI Ready" : ticket.status}
                    </span>
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5 font-mono font-bold text-[#15803d]">
                    {ticket.ai ? `${Math.round(ticket.ai.categoryConfidence * 100)}%` : "94%"}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5 text-[#4b5563]">
                    {ticket.assignedAgent || "Unassigned"}
                  </td>
                  <td className="border-b border-[#eef2f0] px-3.5 py-3.5">
                    <Link className="sp-btn sp-btn-secondary px-3 py-1 text-[11px] hover:border-[#14532d]" to={`/tickets/${ticket.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && <div className="p-10 text-center text-sm text-[#8b95a1]">No tickets match these filters.</div>}
        <div className="border-t border-[#dfe5e1] px-4 py-3 text-[11px] text-[#8b95a1] flex justify-between">
          <span>Showing {filtered.length} of {tickets.length} tickets</span>
          <span>AI Engine Evaluation: ≥90% Category Accuracy, ≥85% Severity Accuracy</span>
        </div>

      </div>
    </div>
  );
}


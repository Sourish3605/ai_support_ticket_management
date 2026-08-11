import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { addComment, getTicketById, updateTicket } from "../../services/ticketService";

const priorityClass = { High: "sp-p1", Medium: "sp-p2", Low: "sp-p4" };

export default function AgentTicketDetails() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState("");
  const [override, setOverride] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => setTicket(getTicketById(id)), [id]);
  if (!ticket) return <div className="sp-card p-10 text-center text-sm text-[#8b95a1]">Ticket not found.</div>;

  const update = (updates) => setTicket(updateTicket(ticket.id, updates));
  const postComment = () => {
    if (!comment.trim()) return;
    setTicket(addComment(ticket.id, { author: "Arun K.", authorRole: "Agent", visibility: "Public", message: comment }));
    setComment("");
  };
  const saveOverride = () => {
    if (override.trim()) update({ category: override.trim() });
    setEditing(false);
  };
  const timeline = [...(ticket.timeline || []), ...(ticket.comments || []).map((item) => ({ ...item, title: `${item.author} commented`, description: item.message }))];

  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <span className={`sp-priority ${priorityClass[ticket.priority] || "sp-p4"}`}>{ticket.priority}</span>
        <button onClick={() => update({ assignedAgent: "Arun K.", assignedTo: "agent-1" })} className="sp-btn sp-btn-secondary">Assign to me</button>
        <select value={ticket.status} onChange={(event) => update({ status: event.target.value })} className="rounded-lg border border-[#dfe5e1] bg-white px-3 text-xs">
          <option>Open</option><option>In Progress</option><option>Pending</option><option>Resolved</option>
          {(ticket.status === "Resolved" || ticket.status === "Closed") && <option>Closed</option>}
        </select>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <section className="sp-card mb-3">
            <div className="sp-card-header"><h2>Ticket</h2><span className="sp-tag sp-tag-info">{ticket.status}</span></div>
            <div className="sp-card-body">
              <div className="mb-4 grid grid-cols-2 gap-3 border-b border-[#eef2f0] pb-4 sm:grid-cols-4">
                {[["Requester", ticket.customerName], ["Department", ticket.department || "-"], ["Site", ticket.location || "-"], ["Asset", ticket.assetTag || "-"]].map(([label, value]) => <div key={label}><div className="text-[10px] text-[#8b95a1]">{label}</div><div className="mt-1 text-xs font-semibold">{value}</div></div>)}
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#4b5563]">{ticket.description}</p>
              <div className="mt-4 flex flex-wrap gap-5 border-t border-[#eef2f0] pt-3 text-xs"><span><small className="block text-[10px] text-[#8b95a1]">Affected</small>{ticket.scope}</span><span><small className="block text-[10px] text-[#8b95a1]">Work blocked</small>{ticket.workBlocked ? "Yes" : "No"}</span><span><small className="block text-[10px] text-[#8b95a1]">Assigned</small>{ticket.assignedAgent || "Unassigned"}</span></div>
            </div>
          </section>
          <section className="sp-card"><div className="sp-card-header"><h2>Activity</h2></div><div className="sp-card-body"><div className="border-l-2 border-[#eef2f0] pl-4">{timeline.map((event) => <div className="relative mb-4" key={event.id}><div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-[#1f7a45] bg-white" /><div className="text-xs font-semibold">{event.title}</div><div className="text-[10px] text-[#8b95a1]">{new Date(event.timestamp).toLocaleString()}</div><div className="mt-1 rounded-md bg-[#f8faf9] p-2 text-xs text-[#4b5563]">{event.description}</div></div>)}</div><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows="2" placeholder="Add a comment..." className="mt-2 w-full rounded-lg border border-[#dfe5e1] p-2.5 text-xs" /><div className="mt-2 flex justify-end"><button onClick={postComment} className="sp-btn sp-btn-primary">Post comment</button></div></div></section>
        </div>
        <aside>
          <section className="sp-card mb-3"><div className="sp-card-header"><h2>AI classification</h2><span className="sp-tag sp-tag-neutral">{ticket.ai?.classificationPath || "FAST"}</span></div><div className="sp-card-body">{[["Category", ticket.category], ["Severity", ticket.ai?.severity || ticket.priority], ["Priority", ticket.priority], ["Confidence", ticket.ai ? `${Math.round(ticket.ai.categoryConfidence * 100)}%` : "-"]].map(([label, value]) => <div className="flex justify-between border-b border-dashed border-[#eef2f0] py-2 text-xs last:border-0" key={label}><span className="text-[#4b5563]">{label}</span><strong>{value}</strong></div>)}{editing ? <div className="mt-3 flex gap-2"><input value={override} onChange={(event) => setOverride(event.target.value)} placeholder="New category" className="min-w-0 flex-1 rounded-lg border border-[#dfe5e1] px-2 py-2 text-xs" /><button onClick={saveOverride} className="sp-btn sp-btn-primary px-2">Save</button></div> : <button onClick={() => { setOverride(ticket.category || ""); setEditing(true); }} className="sp-btn sp-btn-secondary mt-3 w-full">Override classification</button>}</div></section>
          <section className="sp-card"><div className="sp-card-header"><h2>SLA</h2><span className="sp-tag sp-tag-success">On track</span></div><div className="sp-card-body text-xs"><div className="flex justify-between py-2"><span className="text-[#4b5563]">First response</span><strong>{ticket.slaHours || 24} hours</strong></div><div className="flex justify-between py-2"><span className="text-[#4b5563]">Calendar</span><strong>Business hours</strong></div></div></section>
        </aside>
      </div>
    </div>
  );
}

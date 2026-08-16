import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTicketById,
  updateTicket,
} from "../../services/ticketService";

export default function CustomerTicketDetails() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    setTicket(getTicketById(id));
  }, [id]);

  if (!ticket) {
    return (
      <div className="p-8">
        Ticket not found.
      </div>
    );
  }

  const reopen = () => {
    const updated = updateTicket(
      ticket.id,
      {
        status: "Open",
      }
    );

    setTicket(updated);
  };

  const closeTicket = () => {
    const updated = updateTicket(ticket.id, {
      status: "Closed",
    });

    setTicket(updated);
  };

  const priorityColors = {
    P1: "bg-red-700 text-white",
    High: "bg-red-700 text-white",
    P2: "bg-orange-600 text-white",
    P3: "bg-amber-600 text-white",
    Medium: "bg-amber-600 text-white",
    P4: "bg-slate-600 text-white",
    Low: "bg-slate-600 text-white",
  };

  const statusColors = {
    NEW: "bg-blue-100 text-blue-800",
    CLASSIFIED: "bg-emerald-100 text-emerald-800",
    AI_RESOLUTION_READY: "bg-purple-100 text-purple-800 border border-purple-300",
    Open: "bg-blue-100 text-blue-800",
    "In Progress": "bg-amber-100 text-amber-800",
    Resolved: "bg-green-100 text-green-800",
    Closed: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm px-2.5 py-1 rounded bg-[#0f2b1d] text-white">
              {ticket.id}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[ticket.status] || "bg-slate-100 text-slate-700"}`}>
              {ticket.status === "AI_RESOLUTION_READY" ? "✦ AI Resolution Ready" : ticket.status}
            </span>
            <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${priorityColors[ticket.priority] || "bg-slate-600 text-white"}`}>
              {ticket.priority}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mt-3 text-[#1c2430]">
            {ticket.subject}
          </h1>

          <p className="text-xs text-gray-500 mt-1">
            Submitted by {ticket.customerName} on {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex gap-2">
          {ticket.status === "Resolved" && (
            <button
              onClick={reopen}
              className="px-4 py-2 border border-[#14532d] text-[#14532d] rounded-lg text-xs font-semibold hover:bg-emerald-50"
            >
              Reopen Ticket
            </button>
          )}
          {ticket.status !== "Closed" && (
            <button
              onClick={closeTicket}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
            >
              Close Ticket
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Milestone 2 AI Resolution Box */}
          {ticket.ai?.suggestedResolution && ticket.ai.suggestedResolution.length > 0 && (
            <section className="bg-gradient-to-br from-emerald-950 via-[#0f2b1d] to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-500/30">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✦</span>
                  <h2 className="font-bold text-lg text-emerald-100">
                    Milestone 2 — Automated AI Resolution
                  </h2>
                </div>
                <span className="text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 border border-emerald-500/30">
                  RAG Pipeline Active
                </span>
              </div>

              {ticket.knowledgeSource && (
                <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                  <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Retrieved Knowledge Source</span>
                  <span className="text-emerald-300 font-semibold mt-0.5 block">📚 {ticket.knowledgeSource}</span>
                </div>
              )}

              <p className="text-xs text-white/70 mb-3">
                Based on your issue description and enterprise troubleshooting guidelines, follow these steps to resolve:
              </p>

              <ol className="space-y-2.5">
                {ticket.ai.suggestedResolution.map((step, index) => (
                  <li
                    key={index}
                    className="flex gap-3 bg-white/5 rounded-xl p-3 text-xs text-white/90 border border-white/5"
                  >
                    <span className="w-5 h-5 shrink-0 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-bold border border-emerald-500/30">
                      {index + 1}
                    </span>
                    <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, "")}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-white/60">Did this resolve your issue?</span>
                <div className="flex gap-2">
                  <button
                    onClick={closeTicket}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                  >
                    ✓ Yes, Solved
                  </button>
                  <button
                    onClick={() => updateTicket(ticket.id, { status: "In Progress" })}
                    className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition"
                  >
                    Need Agent Assistance
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Ticket Description */}
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-base mb-3 text-[#1c2430]">
              Reported Problem Description
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {ticket.description}
            </p>
          </section>

          {/* Activity Timeline */}
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-base mb-5 text-[#1c2430]">
              Ticket Workflow Timeline
            </h2>

            <div className="space-y-4">
              {ticket.timeline?.map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-[#14532d] shrink-0" />
                  <div>
                    <p className="font-semibold text-xs text-[#1c2430]">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {event.description}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar info */}
        <aside className="space-y-5">
          <section className="bg-white border border-[#dfe5e1] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-sm mb-4 text-[#1c2430] uppercase tracking-wide">
              Milestone 1 — AI Classification
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">Category</span>
                <span className="font-semibold text-[#14532d]">{ticket.category}</span>
              </div>

              {ticket.subCategory && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-gray-500">Sub-Category</span>
                  <span className="font-semibold">{ticket.subCategory}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">Severity</span>
                <span className="font-semibold">{ticket.severity || "Medium"}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">Priority Score</span>
                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${priorityColors[ticket.priority] || "bg-slate-600 text-white"}`}>
                  {ticket.priority}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">AI Confidence</span>
                <span className="font-mono font-bold text-emerald-700">
                  {ticket.ai ? `${Math.round(ticket.ai.categoryConfidence * 100)}%` : "94%"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">Assigned Team</span>
                <span className="font-semibold">{ticket.team || "IT Support"}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-gray-500">Assigned Agent</span>
                <span className="font-semibold">{ticket.assignedAgent || "Unassigned"}</span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">SLA Target</span>
                <span className="font-semibold text-amber-700">{ticket.slaHours || 4} hours</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
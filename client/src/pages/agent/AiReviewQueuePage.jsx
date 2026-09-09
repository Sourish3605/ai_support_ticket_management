import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllTickets } from "../../services/ticketService";
import {
  M4_STATUSES,
  M4_STATUS_LABELS,
  getM4Metrics,
  getM4Config,
} from "../../services/m4WorkflowService";

const PRIORITY_CLASSES = {
  Critical: "bg-red-500/20 text-red-300 border-red-500/40",
  P1: "bg-red-500/20 text-red-300 border-red-500/40",
  High: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  P2: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  P3: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Low: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  P4: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

export default function AiReviewQueuePage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState("review"); // "review", "escalated", "waiting", "all"
  const [searchQuery, setSearchQuery] = useState("");
  const [config, setConfig] = useState(() => getM4Config());

  const loadData = () => {
    setTickets(getAllTickets());
    setConfig(getM4Config());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("storage", loadData);
    window.addEventListener("supportpilot_tickets_changed", loadData);
    window.addEventListener("supportpilot_m4_config_changed", loadData);
    return () => {
      window.removeEventListener("storage", loadData);
      window.removeEventListener("supportpilot_tickets_changed", loadData);
      window.removeEventListener("supportpilot_m4_config_changed", loadData);
    };
  }, []);

  const metrics = useMemo(() => getM4Metrics(tickets), [tickets]);

  const reviewQueueTickets = useMemo(() => {
    return tickets.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return (
        s === M4_STATUSES.PENDING_AGENT_REVIEW ||
        s === M4_STATUSES.AI_RESOLUTION_READY ||
        s === "AI_PROCESSING"
      );
    });
  }, [tickets]);

  const escalatedTickets = useMemo(() => {
    return tickets.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return s === M4_STATUSES.ESCALATED || (Array.isArray(t.escalations) && t.escalations.length > 0);
    });
  }, [tickets]);

  const waitingTickets = useMemo(() => {
    return tickets.filter((t) => {
      const s = String(t.status || "").toUpperCase();
      return s === M4_STATUSES.WAITING_FOR_CUSTOMER || s === M4_STATUSES.AWAITING_CUSTOMER_INFO;
    });
  }, [tickets]);

  const currentTabTickets = useMemo(() => {
    let list = [];
    if (activeTab === "review") list = reviewQueueTickets;
    else if (activeTab === "escalated") list = escalatedTickets;
    else if (activeTab === "waiting") list = waitingTickets;
    else list = tickets;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((t) => {
      const num = String(t.ticketNumber || t.id || "").toLowerCase();
      const title = String(t.title || t.subject || "").toLowerCase();
      const desc = String(t.description || "").toLowerCase();
      const cat = String(t.category || "").toLowerCase();
      return num.includes(q) || title.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [activeTab, reviewQueueTickets, escalatedTickets, waitingTickets, tickets, searchQuery]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖🔍</span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Milestone 4 — AI Review & Validation Queue
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Human-in-the-loop review layer. Validate AI suggestions against the 9-point checklist,
            customize responses, or escalate complex/sensitive tickets before customer delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/ai-agent/workbench"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition"
          >
            AI Workbench →
          </Link>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === "review"
              ? "bg-amber-950/70 border-amber-500/80 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Pending Validation
            </span>
            <span className="text-xs">⏳</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            {reviewQueueTickets.length}
          </div>
          <div className="text-[11px] text-amber-200/70 mt-0.5">
            Medium confidence (70-89%) or sensitive
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("escalated")}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === "escalated"
              ? "bg-red-950/70 border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-400/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-300 uppercase tracking-wider">
              Escalated to Specialist
            </span>
            <span className="text-xs">🚨</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-400 mt-1">
            {escalatedTickets.length}
          </div>
          <div className="text-[11px] text-red-200/70 mt-0.5">
            Low confidence (&lt;70%) / complex
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waiting")}
          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
            activeTab === "waiting"
              ? "bg-cyan-950/70 border-cyan-500/80 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400/50"
              : "bg-slate-900 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
              Waiting on Customer
            </span>
            <span className="text-xs">💬</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">
            {waitingTickets.length}
          </div>
          <div className="text-[11px] text-cyan-200/70 mt-0.5">
            Response sent / info requested
          </div>
        </button>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
              AI Resolution Rate
            </span>
            <span className="text-xs">📈</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {metrics.aiResolutionRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Avg CSAT: <strong className="text-amber-300">★ {metrics.avgCsat}</strong> / 5.0
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "review"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm font-black"
                : "text-amber-300/80 hover:text-amber-200 hover:bg-slate-800/60"
            }`}
          >
            <span>⏳ Needs Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 font-black">
              {reviewQueueTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("escalated")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "escalated"
                ? "bg-red-600 text-white shadow-sm font-black"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span>🚨 Escalations</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 font-black">
              {escalatedTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("waiting")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "waiting"
                ? "bg-cyan-600 text-white shadow-sm font-black"
                : "text-slate-300 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <span>💬 Awaiting Customer</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 font-black">
              {waitingTickets.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "all"
                ? "bg-slate-700 text-white shadow-sm font-black"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <span>📋 All Tickets</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 font-black">
              {tickets.length}
            </span>
          </button>
        </div>

        {/* SEARCH */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by ID, subject, customer..."
            className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* QUEUE LIST */}
      <div className="space-y-3">
        {currentTabTickets.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-base font-bold text-white">
              {activeTab === "review"
                ? "No tickets currently pending AI review!"
                : activeTab === "escalated"
                ? "No active escalations in this queue."
                : "No tickets matching current filter."}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              All AI suggestions have either been validated and transmitted, or routed to automated workflows.
            </p>
          </div>
        ) : (
          currentTabTickets.map((ticket) => {
            const conf = Math.round(Number(ticket.confidence || ticket.ai?.confidence || 0.84) * 100);
            const isPendingReview =
              ticket.status === M4_STATUSES.PENDING_AGENT_REVIEW ||
              ticket.status === M4_STATUSES.AI_RESOLUTION_READY;
            const isEscalated = ticket.status === M4_STATUSES.ESCALATED;
            const isWaiting =
              ticket.status === M4_STATUSES.WAITING_FOR_CUSTOMER ||
              ticket.status === M4_STATUSES.AWAITING_CUSTOMER_INFO;
            const priorityClass =
              PRIORITY_CLASSES[ticket.priority] || "bg-slate-500/20 text-slate-300 border-slate-500/40";

            return (
              <div
                key={ticket.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isPendingReview
                    ? "bg-slate-900/90 border-amber-500/40 hover:border-amber-500/70 shadow-sm"
                    : isEscalated
                    ? "bg-slate-900/90 border-red-500/40 hover:border-red-500/70"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* TICKET DETAILS */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/tickets/${ticket.ticketNumber || ticket.id}`}
                      className="font-mono font-bold text-xs text-cyan-400 hover:underline"
                    >
                      {ticket.ticketNumber || ticket.id}
                    </Link>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${priorityClass}`}>
                      {ticket.priority || "Medium"}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                      {ticket.category || "General"}
                    </span>

                    {/* CONFIDENCE PILL */}
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        conf >= 90
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : conf >= 70
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-red-500/20 text-red-300 border-red-500/40"
                      }`}
                      title={`AI Confidence Score: ${conf}%`}
                    >
                      <span>✨</span>
                      <span>{conf}% Conf</span>
                    </span>

                    {/* STATUS PILL */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isPendingReview
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse"
                          : isEscalated
                          ? "bg-red-500/20 text-red-300 border border-red-500/50"
                          : isWaiting
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {M4_STATUS_LABELS[ticket.status] || ticket.status}
                    </span>
                  </div>

                  <Link
                    to={`/tickets/${ticket.ticketNumber || ticket.id}`}
                    className="text-sm font-bold text-white hover:text-cyan-300 block truncate"
                  >
                    {ticket.title || ticket.subject}
                  </Link>

                  <p className="text-xs text-slate-400 line-clamp-1">
                    {ticket.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>Requester: <strong className="text-slate-300">{ticket.customerName || "Customer"}</strong></span>
                    <span>•</span>
                    <span>Assigned: <strong className="text-slate-300">{ticket.assignedAgentName || ticket.assignedAgent || "Unassigned"}</strong></span>
                    {ticket.escalationReason && (
                      <>
                        <span>•</span>
                        <span className="text-red-300">Reason: {ticket.escalationReason}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* ACTION CTA */}
                <div className="shrink-0 flex items-center gap-2 self-stretch md:self-center justify-end">
                  <Link
                    to={`/tickets/${ticket.ticketNumber || ticket.id}?m4_review=true`}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                      isPendingReview
                        ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white ring-1 ring-amber-400/50"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    }`}
                  >
                    <span>{isPendingReview ? "Validate AI Solution" : "Open Details"}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

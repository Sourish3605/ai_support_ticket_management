import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiMessageSquare,
  FiSearch,
  FiX,
  FiCpu,
  FiArrowRight,
  FiActivity,
  FiShield,
  FiInbox,
} from "react-icons/fi";
import { getAllTickets } from "../../services/ticketService";
import { M4_STATUSES, M4_STATUS_LABELS } from "../../services/m4WorkflowService";

const PRIORITY_CONFIG = {
  P1: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  Critical: { label: "P1 – Critical", badge: "bg-red-50 text-red-700 border-red-200" },
  High: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  P2: { label: "P2 – High", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  Medium: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  P3: { label: "P3 – Medium", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  Low: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
  P4: { label: "P4 – Low", badge: "bg-slate-50 text-slate-600 border-slate-200" },
};

export default function AiReviewQueuePage() {
  const [activeTab, setActiveTab] = useState("review"); // review, escalated, waiting, all
  const [searchQuery, setSearchQuery] = useState("");

  const tickets = getAllTickets();

  const reviewQueueTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status === M4_STATUSES.PENDING_AGENT_REVIEW ||
        t.status === M4_STATUSES.AI_RESOLUTION_READY ||
        (t.needsAgentReview && t.status !== "CLOSED" && t.status !== "RESOLVED")
    );
  }, [tickets]);

  const escalatedTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status === M4_STATUSES.ESCALATED ||
        t.assistanceRequested ||
        (t.confidence && t.confidence < 0.7 && t.status !== "CLOSED" && t.status !== "RESOLVED")
    );
  }, [tickets]);

  const waitingTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.status === M4_STATUSES.WAITING_FOR_CUSTOMER ||
        t.status === M4_STATUSES.AWAITING_CUSTOMER_INFO
    );
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
      {/* Page Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            <FiCpu />
            <span>AI Quality Assurance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            AI Review & Validation Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Human-in-the-loop validation layer. Inspect automated AI resolutions against Master Data guidelines before customer delivery.
          </p>
        </div>

        <Link
          to="/ai-agent/workbench"
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          AI Workbench
        </Link>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("review")}
          className={`rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "review"
              ? "border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pending Validation</span>
            <FiClock className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {reviewQueueTickets.length}
          </div>
          <div className="text-[11px] text-blue-600 mt-0.5">Awaiting agent sign-off</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("escalated")}
          className={`rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "escalated"
              ? "border-rose-600 bg-rose-50/40 shadow-xs ring-1 ring-rose-600"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Escalations</span>
            <FiAlertCircle className="text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {escalatedTickets.length}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5">Low confidence / complex</div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waiting")}
          className={`rounded-xl border p-4 text-left transition cursor-pointer ${
            activeTab === "waiting"
              ? "border-amber-600 bg-amber-50/40 shadow-xs ring-1 ring-amber-600"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Awaiting Customer</span>
            <FiMessageSquare className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {waitingTickets.length}
          </div>
          <div className="text-[11px] text-amber-600 mt-0.5">Info requested from user</div>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Auto-Resolution Rate</span>
            <FiActivity className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">94.2%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Knowledge base verified</div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "review", label: "Needs Validation", count: reviewQueueTickets.length },
            { id: "escalated", label: "Escalations", count: escalatedTickets.length },
            { id: "waiting", label: "Awaiting Customer", count: waitingTickets.length },
            { id: "all", label: "All Tickets", count: tickets.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeTab === tab.id ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, customer, category..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <FiX />
            </button>
          )}
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {currentTabTickets.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <FiInbox className="mx-auto text-3xl text-slate-300 mb-2" />
            <h3 className="text-xs font-semibold text-slate-800">
              {activeTab === "review"
                ? "No tickets currently pending AI review"
                : activeTab === "escalated"
                ? "No active escalations in this queue"
                : "No tickets match the search query"}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              All automated solutions have been validated or handled.
            </p>
          </div>
        ) : (
          currentTabTickets.map((ticket) => {
            const conf = Math.round(Number(ticket.confidence || ticket.ai?.confidence || 0.88) * 100);
            const isPendingReview =
              ticket.status === M4_STATUSES.PENDING_AGENT_REVIEW ||
              ticket.status === M4_STATUSES.AI_RESOLUTION_READY;

            return (
              <div
                key={ticket.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="font-mono font-bold text-xs text-blue-600 hover:underline"
                    >
                      #{ticket.ticketNumber || ticket.ticket_number || ticket.id}
                    </Link>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        PRIORITY_CONFIG[ticket.priority]?.badge || "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {PRIORITY_CONFIG[ticket.priority]?.label || ticket.priority || "P3"}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {ticket.category || "General"}
                    </span>
                    <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                      {conf}% Confidence
                    </span>
                  </div>

                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-xs font-bold text-slate-900 hover:text-blue-600 block truncate"
                  >
                    {ticket.title || ticket.subject}
                  </Link>

                  <p className="text-[11px] text-slate-500 line-clamp-1">{ticket.description}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span>
                      Requester: <strong className="text-slate-600">{ticket.customerName || "Customer"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Assigned: <strong className="text-slate-600">{ticket.assignedAgentName || ticket.assignedAgent || "Unassigned"}</strong>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-stretch md:self-center justify-end">
                  <Link
                    to={isPendingReview ? `/tickets/${ticket.id}/validate-ai` : `/tickets/${ticket.id}`}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span>{isPendingReview ? "Open & Validate AI Solution" : "View Details"}</span>
                    <FiArrowRight className="text-xs" />
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

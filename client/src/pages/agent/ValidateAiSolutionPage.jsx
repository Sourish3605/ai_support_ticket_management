import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiZap, FiShield,
  FiClock, FiTag, FiArrowLeft, FiHelpCircle, FiCheck, FiLayers, FiBookOpen,
} from "react-icons/fi";
import {
  getTicketById, fetchTicketByIdApi, updateTicket, updateTicketStatusApi,
} from "../../services/ticketService";
import { useAuth } from "../../context/AuthContext";

const PRIORITY_STYLE = {
  P1: { badge: "bg-red-50 text-red-700 border-red-200", label: "P1 – Critical" },
  P2: { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "P2 – High" },
  P3: { badge: "bg-blue-50 text-blue-700 border-blue-200", label: "P3 – Medium" },
  P4: { badge: "bg-slate-50 text-slate-600 border-slate-200", label: "P4 – Low" },
};

function getPriorityStyle(priority) {
  const p = String(priority || "").toUpperCase();
  if (p.includes("P1") || p.includes("CRITICAL")) return PRIORITY_STYLE.P1;
  if (p.includes("P2") || p.includes("HIGH")) return PRIORITY_STYLE.P2;
  if (p.includes("P4") || p.includes("LOW")) return PRIORITY_STYLE.P4;
  return PRIORITY_STYLE.P3;
}

function getSlaLabel(ticket) {
  if (!ticket) return null;
  const statusStr = String(ticket.status || "").toUpperCase();
  if (statusStr === "RESOLVED" || statusStr === "CLOSED") return { label: "SLA Met", color: "text-emerald-700" };
  const created = ticket.createdAt || ticket.created_at;
  if (!created) return null;
  const p = String(ticket.priority || "").toUpperCase();
  const slaHours = ticket.slaHours || (p.includes("P1") ? 4 : p.includes("P2") ? 8 : p.includes("P4") ? 48 : 24);
  const due = ticket.slaDueAt ? new Date(ticket.slaDueAt).getTime() : new Date(created).getTime() + slaHours * 3600000;
  const diffMins = Math.round((due - Date.now()) / 60000);
  if (diffMins < 0) return { label: "SLA Breached", color: "text-red-700" };
  const h = Math.floor(diffMins / 60); const m = diffMins % 60; const d = Math.floor(h / 24);
  const label = d > 0 ? `${d}d ${h % 24}h remaining` : h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`;
  return { label, color: diffMins < 120 ? "text-amber-600" : "text-emerald-700" };
}

export default function ValidateAiSolutionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState(() => getTicketById(id));
  const [loading, setLoading] = useState(!getTicketById(id));
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionDone, setActionDone] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const local = getTicketById(id);
    if (local) { setTicket(local); setLoading(false); return; }
    setLoading(true);
    fetchTicketByIdApi(id).then((data) => {
      if (cancelled) return;
      if (data) setTicket(data);
      else setError("Ticket not found. It may have been deleted or you may not have permission to view it.");
    }).catch((err) => {
      if (cancelled) return;
      setError(err?.response?.status === 403 ? "You do not have permission to view this ticket." : "Failed to load ticket. Please check your connection.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }
  }, [toast]);

  const aiSteps = useMemo(() => {
    if (!ticket) return [];
    const steps = ticket.ai?.suggestedResolution || ticket.suggestedResolution || ticket.resolution?.solution || null;
    if (Array.isArray(steps) && steps.length > 0) return steps;
    if (typeof steps === "string" && steps.trim()) return [steps];
    return [];
  }, [ticket]);

  const citations = useMemo(() => (!ticket ? [] : ticket.ai?.citations || ticket.citations || []), [ticket]);
  const priorityStyle = getPriorityStyle(ticket?.priority);
  const slaInfo = getSlaLabel(ticket);
  const agentName = user?.name || user?.username || "Support Agent";
  const ticketCode = ticket?.ticketNumber || ticket?.ticket_number || (ticket?.id ? `TKT-${ticket.id}` : `#${id}`);

  const handleResolved = async () => {
    if (!ticket) return;
    try { await updateTicketStatusApi(ticket.id, "RESOLVED"); } catch (_) {}
    const now = new Date().toISOString();
    const updated = updateTicket(ticket.id, {
      status: "RESOLVED", resolvedAt: now,
      resolution: { solution: aiSteps.join("\n") || "AI-validated resolution applied.", resolvedBy: agentName, resolvedAt: now, method: "AI Validation — Agent Confirmed" },
      timelineEvent: { type: "resolved", title: "Ticket Resolved", description: `Agent ${agentName} confirmed AI resolution.` },
    });
    if (updated) setTicket(updated);
    setActionDone("resolved");
    setToast({ type: "success", message: "Ticket resolved and closed successfully." });
    window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed"));
  };

  const handleNeedMoreHelp = async () => {
    if (!ticket) return;
    try { await updateTicketStatusApi(ticket.id, "ESCALATED"); } catch (_) {}
    const updated = updateTicket(ticket.id, {
      status: "ESCALATED",
      timelineEvent: { type: "escalation", title: "Escalated – Needs More Help", description: `Agent ${agentName} escalated – AI solution insufficient.` },
    });
    if (updated) setTicket(updated);
    setActionDone("help");
    setToast({ type: "warning", message: "Ticket escalated. A specialist will be notified." });
    window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed"));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      <p className="text-sm font-semibold text-slate-700">Loading ticket and AI solution data…</p>
      <p className="text-xs text-slate-400">Ticket #{id}</p>
    </div>
  );

  if (error || !ticket) return (
    <div className="max-w-lg mx-auto my-16 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-200 mb-5">
        <FiAlertCircle className="w-7 h-7 text-red-500" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-2">Ticket Not Available</h2>
      <p className="text-xs text-slate-500 leading-relaxed mb-6">{error || `Ticket #${id} could not be found.`}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer">← Go Back</button>
        <Link to="/tickets/ai-review" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">AI Review Queue</Link>
      </div>
    </div>
  );

  if (actionDone === "resolved") return (
    <div className="max-w-lg mx-auto my-16 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 border border-emerald-300 mb-5"><FiCheckCircle className="w-7 h-7 text-emerald-600" /></div>
      <h2 className="text-base font-bold text-emerald-900 mb-2">Ticket Successfully Resolved</h2>
      <p className="text-xs text-emerald-800 leading-relaxed mb-6">Ticket <strong>{ticketCode}</strong> has been marked as resolved.</p>
      <div className="flex gap-2 justify-center">
        <Link to="/tickets/ai-review" className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition">Back to AI Review Queue</Link>
        <Link to="/dashboard" className="px-4 py-2 rounded-xl border border-emerald-400 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition">Dashboard</Link>
      </div>
    </div>
  );

  if (actionDone === "help") return (
    <div className="max-w-lg mx-auto my-16 rounded-2xl border-2 border-amber-300 bg-amber-50 p-10 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 border border-amber-300 mb-5"><FiAlertTriangle className="w-7 h-7 text-amber-600" /></div>
      <h2 className="text-base font-bold text-amber-900 mb-2">Escalated — Needs More Help</h2>
      <p className="text-xs text-amber-800 leading-relaxed mb-6">Ticket <strong>{ticketCode}</strong> has been escalated for specialist review.</p>
      <div className="flex gap-2 justify-center">
        <Link to="/tickets/ai-review" className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition">Back to AI Review Queue</Link>
        <Link to={`/tickets/${ticket.id}`} className="px-4 py-2 rounded-xl border border-amber-400 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition">Full Ticket Details</Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-2xl flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-700" : "bg-amber-700"}`}>
            {toast.type === "success" ? <FiCheckCircle className="w-4 h-4" /> : <FiAlertTriangle className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer">
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
              <FiShield className="w-3.5 h-3.5" /><span>Open & Validate AI Solution — M4 Human-in-the-Loop</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">{ticketCode}</span>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${priorityStyle.badge}`}>{priorityStyle.label}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${String(ticket.status).toUpperCase() === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>{ticket.status}</span>
            </div>
          </div>
        </div>
        <Link to={`/tickets/${ticket.id}`} className="text-xs font-semibold text-slate-600 hover:text-blue-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">Full Ticket Details →</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {/* Customer Issue */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FiTag className="w-4 h-4 text-slate-500" /><h2 className="text-sm font-bold text-slate-900">Customer Issue</h2>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">{ticket.subject || ticket.title || "Support Request"}</h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4 border border-slate-200">{ticket.description || "No description provided."}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { label: "Category", value: ticket.category || "—" },
                { label: "Sub-category", value: ticket.subCategory || ticket.sub_category || "—" },
                { label: "Department", value: ticket.department || "—" },
                { label: "Customer", value: ticket.customerName || ticket.created_by_name || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">{label}</div>
                  <div className="text-xs font-semibold text-slate-800 truncate">{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* AI Steps */}
          <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-white to-indigo-50/20 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700"><FiZap className="w-4 h-4" /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">AI-Generated Resolution Steps</h3>
                  <p className="text-[11px] text-slate-500">RAG-grounded troubleshooting instructions</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-100 text-indigo-800 px-2.5 py-0.5 text-[10px] font-bold">M2 RAG Grounded</span>
            </div>

            {aiSteps.length > 0 ? (
              <div className="space-y-2.5">
                {aiSteps.map((step, i) => (
                  <div key={i} className="flex gap-3 rounded-xl border border-indigo-100 bg-white p-3.5 shadow-xs">
                    <span className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="text-xs text-slate-700 leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                <FiHelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-800 mb-1">AI solution is not available for this ticket.</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">No AI-generated resolution steps found for this ticket. It may not have been processed by the AI pipeline yet, or may require manual specialist review.</p>
                <div className="mt-4 flex gap-2 justify-center">
                  <Link to={`/tickets/${ticket.id}`} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900 transition">Open Full Ticket View</Link>
                </div>
              </div>
            )}

            {citations.length > 0 && (
              <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-2">
                  <FiBookOpen className="w-3.5 h-3.5" /><span>Knowledge Base Citations</span>
                </div>
                {citations.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-indigo-900 bg-white rounded-lg border border-indigo-100 p-2.5">
                    <FiBookOpen className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                    <div><strong>{c.source_title || c.title}</strong>{c.section ? ` (${c.section})` : ""}{c.quote ? <em className="text-slate-600 block mt-0.5">"{c.quote}"</em> : null}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Agent Decision</h3>
            <p className="text-xs text-slate-500 mb-5">Review the AI resolution steps above, then confirm your decision on this ticket.</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleResolved} disabled={!!actionDone} className="flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 transition shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <FiCheck className="w-4 h-4" />Resolved
              </button>
              <button onClick={handleNeedMoreHelp} disabled={!!actionDone} className="flex-1 min-w-[160px] flex items-center justify-center gap-2 rounded-xl border-2 border-amber-400 bg-amber-50 px-5 py-3.5 text-sm font-bold text-amber-800 hover:bg-amber-100 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <FiHelpCircle className="w-4 h-4" />Need More Help
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FiLayers className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-900">Ticket Details</h3>
            </div>
            <dl className="space-y-3 text-xs">
              {[
                { label: "Ticket ID", value: ticketCode, mono: true },
                { label: "Status", value: <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${String(ticket.status).toUpperCase() === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>{ticket.status}</span> },
                { label: "Priority", value: <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${priorityStyle.badge}`}>{priorityStyle.label}</span> },
                { label: "Category", value: ticket.category || "—" },
                { label: "Sub-category", value: ticket.subCategory || ticket.sub_category || "—" },
                { label: "Department", value: ticket.department || "—" },
                { label: "Requester", value: ticket.customerName || "—" },
                { label: "Assigned To", value: ticket.assignedAgentName || ticket.assignedAgent || "Unassigned" },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-slate-400 font-semibold shrink-0">{label}</dt>
                  <dd className={`text-slate-900 font-semibold text-right ${mono ? "font-mono text-[10px]" : ""}`}>{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FiClock className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-bold text-slate-900">SLA Status</h3>
            </div>
            {slaInfo ? (
              <div className={`flex items-center gap-2 text-sm font-bold ${slaInfo.color}`}>
                <FiClock className="w-4 h-4" />{slaInfo.label}
              </div>
            ) : <p className="text-xs text-slate-400">SLA data not available</p>}
            {ticket.slaHours && <p className="text-[11px] text-slate-500">SLA Target: <strong className="text-slate-700">{ticket.slaHours}h</strong></p>}
            <p className="text-[11px] text-slate-400">Created: {ticket.createdAt || ticket.created_at ? new Date(ticket.createdAt || ticket.created_at).toLocaleString() : "—"}</p>
          </section>

          {(ticket.ai?.categoryConfidence || ticket.confidence) && (
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-indigo-100 pb-3">
                <FiZap className="w-4 h-4 text-indigo-600" /><h3 className="text-sm font-bold text-slate-900">AI Confidence</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.round((ticket.ai?.categoryConfidence || ticket.confidence || 0.9) * 100)}%` }} />
                </div>
                <span className="text-sm font-bold text-indigo-700 shrink-0">{Math.round((ticket.ai?.categoryConfidence || ticket.confidence || 0.9) * 100)}%</span>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

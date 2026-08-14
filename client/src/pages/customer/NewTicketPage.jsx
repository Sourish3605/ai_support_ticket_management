import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classifyTicket, createTicket, getCustomerTickets } from "../../services/ticketService";

const initialForm = { subject: "", description: "", category: "", affectedSystem: "", startedWhen: "Today", scope: "Just me", workBlocked: false, urgency: "Medium", workaround: "No", department: "", location: "", assetTag: "", contactPreference: "Email", bestTime: "", attachments: [] };

function Field({ label, children, optional = false }) {
  return <label className="mb-3 block text-xs font-semibold">{label} <span className="font-normal text-[#8b95a1]">{optional ? "(optional)" : "*"}</span>{children}</label>;
}

function Step({ number, title, subtitle, done = false }) {
  return <div className="mb-4 flex gap-3"><div className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold text-white ${done ? "bg-[#15803d]" : "bg-[#14532d]"}`}>{done ? "OK" : number}</div><div><div className="text-[15px] font-bold">{title}</div><div className="text-xs text-[#8b95a1]">{subtitle}</div></div></div>;
}

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem("supportpilot_ticket_draft");
    if (!draft) return initialForm;
    try { return { ...initialForm, ...JSON.parse(draft) }; } catch { return initialForm; }
  });
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => { localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form)); }, [form]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const duplicate = useMemo(() => getCustomerTickets(user.id).find((ticket) => !["Resolved", "Closed"].includes(ticket.status) && form.subject && ticket.subject.toLowerCase().includes(form.subject.split(" ")[0].toLowerCase())), [form.subject, user.id]);
  const preview = useMemo(() => {
    const classification = classifyTicket(form.subject, form.description);
    const category = form.category || classification.category;
    const highImpact = form.workBlocked && ["My team", "My department", "Whole org"].includes(form.scope);
    const severity = highImpact ? "HIGH" : form.workBlocked ? "MEDIUM" : "LOW";
    const completeness = Math.min(1, (form.subject.trim().length / 40) * 0.35 + (form.description.trim().length / 160) * 0.45 + (form.affectedSystem.trim() ? 0.1 : 0) + (form.startedWhen ? 0.1 : 0));
    const confidence = Math.round((classification.confidence * 0.55 + completeness * 0.45) * 100);
    return { category, severity, priority: severity === "HIGH" ? "P2" : severity === "MEDIUM" ? "P3" : "P4", confidence };
  }, [form]);
  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!form.subject.trim()) return setError("Please enter a clear subject.");
    if (form.description.trim().length < 20) return setError("Description must contain at least 20 characters.");
    try { const ticket = createTicket(form, user); localStorage.removeItem("supportpilot_ticket_draft"); navigate(`/portal/tickets/${ticket.id}`); } catch (err) { setError(err.message); }
  };
  const inputClass = "mt-1 w-full rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-xs outline-none focus:border-[#1f7a45]";
  const selectClass = `${inputClass} bg-white`;

  return <div className="mx-auto max-w-[1050px]"><form onSubmit={submit}><div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div>
      {duplicate && <div className="mb-4 rounded-r-lg border border-[#fde68a] border-l-4 border-l-[#b45309] bg-[#fffbeb] p-3"><div className="text-xs font-bold text-[#78350f]">Warning: similar open ticket</div><div className="mt-1 text-[11px] text-[#78350f]">Adding to an existing ticket is usually faster.</div><div className="mt-2 flex items-center justify-between rounded-md border border-[#fde68a] bg-white p-2"><span className="text-xs font-semibold">{duplicate.subject}<small className="block font-mono text-[10px] font-normal text-[#8b95a1]">{duplicate.id} - {duplicate.status}</small></span><button type="button" onClick={() => navigate(`/portal/tickets/${duplicate.id}`)} className="sp-btn sp-btn-secondary px-2 py-1 text-[11px]">Add to this</button></div></div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
      <section className="sp-card mb-3"><div className="sp-card-body"><Step number="1" title="The issue" subtitle="Tell us what is happening" done /><Field label="Subject"><input value={form.subject} onChange={(event) => update("subject", event.target.value)} className={inputClass} placeholder="VPN connection failing on corporate network" /><small className="mt-1 block font-normal text-[#8b95a1]">A clear one-line summary.</small></Field><Field label="Description"><textarea rows="5" value={form.description} onChange={(event) => update("description", event.target.value)} className={inputClass} placeholder="Include the error message, what you tried, and when it started." /><small className="mt-1 block font-normal text-[#8b95a1]">Include the error message, what you tried, and when it started.</small></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Category" optional><select value={form.category} onChange={(event) => update("category", event.target.value)} className={selectClass}><option value="">Not sure - let AI decide</option><option>VPN</option><option>Network</option><option>Access</option><option>Software</option></select></Field><Field label="Affected system" optional><input value={form.affectedSystem} onChange={(event) => update("affectedSystem", event.target.value)} className={inputClass} placeholder="Cisco AnyConnect" /></Field></div><Field label="When did it start?" optional><select value={form.startedWhen} onChange={(event) => update("startedWhen", event.target.value)} className={selectClass}><option>Today</option><option>Just now</option><option>This week</option><option>Recurring</option></select></Field></div></section>
      <section className="sp-card mb-3"><div className="sp-card-body"><Step number="2" title="Impact" subtitle="Two questions that set the priority" done /><Field label="Who is affected?"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{["Just me", "My team", "My department", "Whole org"].map((item) => <button type="button" key={item} onClick={() => update("scope", item)} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${form.scope === item ? "border-[#1f7a45] bg-[#eef4ef] text-[#14532d]" : "border-[#dfe5e1] bg-white"}`}>{item}</button>)}</div><small className="mt-1 block font-normal text-[#8b95a1]">Feeds the priority matrix directly.</small></Field><Field label="Is your work blocked?"><div className="flex gap-2"><button type="button" onClick={() => update("workBlocked", true)} className={`sp-btn flex-1 ${form.workBlocked ? "sp-btn-primary" : "sp-btn-secondary"}`}>Yes, completely</button><button type="button" onClick={() => update("workBlocked", false)} className={`sp-btn flex-1 ${!form.workBlocked ? "sp-btn-primary" : "sp-btn-secondary"}`}>No</button></div></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="How urgent does it feel?" optional><select value={form.urgency} onChange={(event) => update("urgency", event.target.value)} className={selectClass}><option>Normal</option><option>Low</option><option>High</option><option>Critical</option></select></Field><Field label="Workaround available?" optional><select value={form.workaround} onChange={(event) => update("workaround", event.target.value)} className={selectClass}><option>No</option><option>Yes</option><option>Partially</option></select></Field></div></div></section>
      <section className="sp-card"><div className="sp-card-body"><Step number="3" title="Context" subtitle="Mostly filled from your profile" /><div className="grid gap-3 sm:grid-cols-2"><Field label="Department"><input value={form.department || user.department || ""} onChange={(event) => update("department", event.target.value)} className={inputClass} /></Field><Field label="Location / site" optional><input value={form.location} onChange={(event) => update("location", event.target.value)} className={inputClass} placeholder="Chennai - DLF IT Park" /></Field><Field label="Asset tag" optional><input value={form.assetTag} onChange={(event) => update("assetTag", event.target.value)} className={inputClass} placeholder="LT-04821" /></Field><Field label="Preferred contact"><select value={form.contactPreference} onChange={(event) => update("contactPreference", event.target.value)} className={selectClass}><option>Email</option><option>Phone</option><option>Teams</option></select></Field></div></div></section>
      <div className="mt-3 flex gap-2"><button type="submit" className="sp-btn sp-btn-primary flex-1 py-3">Submit ticket</button><button type="button" onClick={() => { localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form)); setDraftSaved(true); }} className="sp-btn sp-btn-secondary">Save draft</button></div>{draftSaved && <div className="mt-2 text-right text-[11px] text-[#15803d]">Draft saved locally.</div>}
    </div>
    <aside className="rounded-xl bg-[#0f2b1d] p-[18px] text-white lg:sticky lg:top-4"><div className="text-[10px] font-bold tracking-[1.8px] text-white/50">AI CLASSIFICATION PREVIEW</div><div className="my-3 text-[10px] text-[#86efac]">Updating as you type</div>{[["Category", preview.category],["Sub-category", "Connection failure"],["Severity", preview.severity],["Priority", preview.priority],["Est. first response", preview.priority === "P2" ? "1 hour" : "4 hours"]].map(([key, value]) => <div className="flex justify-between border-b border-white/10 py-2 text-xs" key={key}><span className="text-white/60">{key}</span><strong>{value}</strong></div>)}<div className="mt-4 flex justify-between text-xs"><span className="text-white/60">Confidence</span><strong>{preview.confidence}%</strong></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${preview.confidence}%` }} /></div><div className="mt-4 font-mono text-[10px] text-white/70">PATH: FAST - 47ms</div><p className="mt-3 text-[10px] leading-relaxed text-white/40">This is a preview only. Final classification runs after you submit and may differ.</p></aside>
+  </div></form></div>;
}

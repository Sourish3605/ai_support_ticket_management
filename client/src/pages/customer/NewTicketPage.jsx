import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { classifyTicket, createTicket, getCustomerTickets } from "../../services/ticketService";
import { api } from "../../services/api";

const initialForm = {
  subject: "",
  description: "",
  category: "",
  subCategory: "",
  priority: "P3",
  severity: "Medium",
  affectedSystem: "",
  startedWhen: "Today",
  scope: "Just me",
  workBlocked: false,
  urgency: "Medium",
  workaround: "No",
  department: "",
  location: "",
  assetTag: "",
  contactPreference: "Email",
  bestTime: "",
  attachments: [],
};

const CATEGORIES_MAP = {
  VPN: ["Connection Failure", "Gateway Timeout", "Certificate Expired", "Client Crash"],
  Network: ["Internet / Wi-Fi", "DNS / Gateway", "Firewall Block", "Slow Bandwidth"],
  Security: ["Phishing Alert", "Malware / Incident", "Unauthorized Access", "Security Policy"],
  Authentication: ["Password Reset", "Login Issue", "MFA / SSO Error", "Account Locked"],
  Hardware: ["Computer/Peripheral", "Printer", "Monitor / Display", "Battery / Charger"],
  Software: ["Application Error", "Crash Loop", "License Expired", "Installation Failure"],
  Email: ["Outlook / Sync", "Mailbox Full", "Delivery Failure", "Calendar Invite"],
  Billing: ["Invoice / Payment", "Subscription Renewal", "Credit Card Failure"],
  General: ["Other", "Inquiry", "Feedback"],
};

function Field({ label, children, optional = false }) {
  return (
    <label className="mb-3 block text-xs font-semibold text-slate-700">
      {label} <span className="font-normal text-slate-400">{optional ? "(optional)" : "*"}</span>
      {children}
    </label>
  );
}

function Step({ number, title, subtitle, done = false }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-bold text-white shadow-sm ${done ? "bg-emerald-600" : "bg-[#0f2b1d]"}`}>
        {done ? "✓" : number}
      </div>
      <div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => {
    const draft = localStorage.getItem("supportpilot_ticket_draft");
    if (!draft) return initialForm;
    try {
      return { ...initialForm, ...JSON.parse(draft) };
    } catch {
      return initialForm;
    }
  });

  const [manualOverrides, setManualOverrides] = useState({
    category: false,
    subCategory: false,
    priority: false,
  });

  const [aiState, setAiState] = useState({
    analyzing: false,
    confidence: 0.94,
    category: "General",
    subCategory: "Other",
    severity: "Medium",
    priority: "P3",
    team: "IT Support",
    classificationPath: "Fast-Path",
    knowledgeSource: "General Corporate Support Guide",
    suggestedResolution: [],
  });

  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const debounceTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form));
  }, [form]);

  // Full-Sentence AI Classification with 400ms Debounce
  useEffect(() => {
    if (!form.subject.trim() && !form.description.trim()) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setAiState((prev) => ({ ...prev, analyzing: true }));
    const currentRequestId = ++requestIdRef.current;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // First try backend AI classification endpoint
        let aiResult = null;
        try {
          const res = await api.post("/support/classify/", {
            subject: form.subject,
            description: form.description,
            scope: form.scope,
            work_blocked: form.workBlocked,
          });
          if (res.data) {
            aiResult = {
              category: res.data.category,
              subCategory: res.data.sub_category,
              severity: res.data.severity,
              priority: res.data.priority,
              confidence: res.data.confidence,
              team: res.data.team,
              classificationPath: res.data.classification_path,
              knowledgeSource: res.data.knowledge_source,
              suggestedResolution: res.data.suggested_resolution,
            };
          }
        } catch {
          // Fallback to local client classifier
          aiResult = classifyTicket(form.subject, form.description, form.scope, form.workBlocked);
        }

        if (currentRequestId !== requestIdRef.current) return;

        if (aiResult) {
          setAiState({
            analyzing: false,
            confidence: aiResult.confidence || 0.94,
            category: aiResult.category || "General",
            subCategory: aiResult.subCategory || "Other",
            severity: aiResult.severity || "Medium",
            priority: aiResult.priority || "P3",
            team: aiResult.team || "IT Support",
            classificationPath: aiResult.classificationPath || "Fast-Path",
            knowledgeSource: aiResult.knowledgeSource || "Corporate IT Guide",
            suggestedResolution: aiResult.suggestedResolution || [],
          });

          // Auto-select dropdown fields unless manually modified
          setForm((curr) => ({
            ...curr,
            category: manualOverrides.category ? curr.category : (aiResult.category || curr.category),
            subCategory: manualOverrides.subCategory ? curr.subCategory : (aiResult.subCategory || curr.subCategory),
            priority: manualOverrides.priority ? curr.priority : (aiResult.priority || curr.priority),
            severity: aiResult.severity || curr.severity,
          }));
        }
      } catch (err) {
        console.warn("AI Classification error:", err);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setAiState((prev) => ({ ...prev, analyzing: false }));
        }
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [form.subject, form.description, form.scope, form.workBlocked]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleManualCategoryChange = (e) => {
    const value = e.target.value;
    setManualOverrides((prev) => ({ ...prev, category: true, subCategory: false }));
    const defaultSub = CATEGORIES_MAP[value]?.[0] || "General";
    setForm((curr) => ({ ...curr, category: value, subCategory: defaultSub }));
  };

  const handleManualSubCategoryChange = (e) => {
    const value = e.target.value;
    setManualOverrides((prev) => ({ ...prev, subCategory: true }));
    update("subCategory", value);
  };

  const handleManualPriorityChange = (e) => {
    const value = e.target.value;
    setManualOverrides((prev) => ({ ...prev, priority: true }));
    update("priority", value);
  };

  // Safe duplicate ticket search on full trimmed query
  const duplicate = useMemo(() => {
    if (!form.subject.trim() || form.subject.trim().length < 6) return null;
    const searchTerms = form.subject.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (!searchTerms.length) return null;

    return getCustomerTickets(user?.id).find((ticket) => {
      if (["Resolved", "Closed"].includes(ticket.status)) return false;
      const subj = ticket.subject.toLowerCase();
      return searchTerms.some((term) => subj.includes(term));
    });
  }, [form.subject, user?.id]);

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!form.subject.trim()) return setError("Please enter a clear subject for your ticket.");
    if (form.description.trim().length < 10) return setError("Description must contain at least 10 characters.");

    try {
      const ticket = createTicket(form, user);
      localStorage.removeItem("supportpilot_ticket_draft");
      navigate(`/portal/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const activeCategory = form.category || aiState.category || "General";
  const availableSubCategories = CATEGORIES_MAP[activeCategory] || CATEGORIES_MAP["General"];

  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";
  const selectClass = `${inputClass} bg-white cursor-pointer`;

  return (
    <div className="mx-auto max-w-[1080px]">
      <form onSubmit={submit}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {duplicate && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-amber-900">⚠️ Existing Open Ticket Detected</div>
                  <button
                    type="button"
                    onClick={() => navigate(`/portal/tickets/${duplicate.id}`)}
                    className="sp-btn sp-btn-secondary px-2.5 py-1 text-[11px]"
                  >
                    View Ticket {duplicate.id}
                  </button>
                </div>
                <div className="mt-1 text-xs text-amber-800">
                  You already have an active ticket matching this topic: <strong className="font-semibold">{duplicate.subject}</strong>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 font-semibold shadow-sm">
                {error}
              </div>
            )}

            {/* Step 1: Issue Details */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="1" title="Issue Summary" subtitle="AI continuously analyzes your full text to categorize and prioritize" done />

                <Field label="Subject">
                  <input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Unable to login to my customer account after resetting my password"
                    required
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Enter your full issue summary.</span>
                    {aiState.analyzing && <span className="text-emerald-700 font-bold animate-pulse">✦ AI Analyzing complete subject...</span>}
                  </div>
                </Field>

                <Field label="Detailed Description">
                  <textarea
                    rows="5"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className={inputClass}
                    placeholder="Describe the exact error message, what system is affected, and any steps already attempted."
                    required
                  />
                </Field>

                {/* Auto-selected Category & Subcategory Dropdowns with Manual Override */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <div className="relative">
                      <select
                        value={form.category || aiState.category}
                        onChange={handleManualCategoryChange}
                        className={selectClass}
                      >
                        {Object.keys(CATEGORIES_MAP).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {manualOverrides.category ? (
                        <span className="absolute right-8 top-3 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Manual</span>
                      ) : (
                        <span className="absolute right-8 top-3 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">✦ AI Auto</span>
                      )}
                    </div>
                  </Field>

                  <Field label="Sub-Category">
                    <div className="relative">
                      <select
                        value={form.subCategory || aiState.subCategory}
                        onChange={handleManualSubCategoryChange}
                        className={selectClass}
                      >
                        {availableSubCategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                      {manualOverrides.subCategory ? (
                        <span className="absolute right-8 top-3 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Manual</span>
                      ) : (
                        <span className="absolute right-8 top-3 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">✦ AI Auto</span>
                      )}
                    </div>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Affected System / Software" optional>
                    <input
                      value={form.affectedSystem}
                      onChange={(e) => update("affectedSystem", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Cisco AnyConnect, SSO Portal"
                    />
                  </Field>
                  <Field label="When did it start?" optional>
                    <select
                      value={form.startedWhen}
                      onChange={(e) => update("startedWhen", e.target.value)}
                      className={selectClass}
                    >
                      <option>Today</option>
                      <option>Just now</option>
                      <option>This week</option>
                      <option>Recurring issue</option>
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            {/* Step 2: Impact & Urgency */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="2" title="Impact & Priority" subtitle="Used to establish SLA response targets" done />

                <Field label="Who is affected?">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["Just me", "My team", "My department", "Whole org"].map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => update("scope", item)}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                          form.scope === item
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Is your work completely blocked?">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => update("workBlocked", true)}
                      className={`sp-btn flex-1 py-2.5 text-xs font-bold transition ${
                        form.workBlocked ? "bg-red-700 text-white shadow" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Yes, completely blocked
                    </button>
                    <button
                      type="button"
                      onClick={() => update("workBlocked", false)}
                      className={`sp-btn flex-1 py-2.5 text-xs font-bold transition ${
                        !form.workBlocked ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      No, partial or normal
                    </button>
                  </div>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Priority Level">
                    <div className="relative">
                      <select
                        value={form.priority}
                        onChange={handleManualPriorityChange}
                        className={selectClass}
                      >
                        <option value="P1">P1 - Critical (SLA: 1 Hour)</option>
                        <option value="P2">P2 - High (SLA: 4 Hours)</option>
                        <option value="P3">P3 - Medium (SLA: 24 Hours)</option>
                        <option value="P4">P4 - Low (SLA: 48 Hours)</option>
                      </select>
                      {manualOverrides.priority ? (
                        <span className="absolute right-8 top-3 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Manual</span>
                      ) : (
                        <span className="absolute right-8 top-3 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">✦ AI Auto</span>
                      )}
                    </div>
                  </Field>

                  <Field label="Workaround available?" optional>
                    <select
                      value={form.workaround}
                      onChange={(e) => update("workaround", e.target.value)}
                      className={selectClass}
                    >
                      <option>No</option>
                      <option>Yes</option>
                      <option>Partially</option>
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            {/* Step 3: Context */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="3" title="Requester Information" subtitle="Pre-filled from your profile" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Department">
                    <input
                      value={form.department || user?.department || "Finance"}
                      onChange={(e) => update("department", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Location / Office" optional>
                    <input
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. DLF IT Park, Chennai"
                    />
                  </Field>
                  <Field label="Asset / Device Tag" optional>
                    <input
                      value={form.assetTag}
                      onChange={(e) => update("assetTag", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. LAP-04821"
                    />
                  </Field>
                  <Field label="Preferred Contact Channel">
                    <select
                      value={form.contactPreference}
                      onChange={(e) => update("contactPreference", e.target.value)}
                      className={selectClass}
                    >
                      <option>Email</option>
                      <option>Phone</option>
                      <option>Microsoft Teams</option>
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                className="sp-btn sp-btn-primary flex-1 py-3.5 text-xs font-bold shadow-md hover:shadow-lg transition"
              >
                Submit Support Ticket
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form));
                  setDraftSaved(true);
                  setTimeout(() => setDraftSaved(false), 3000);
                }}
                className="sp-btn sp-btn-secondary px-5 py-3.5 text-xs font-semibold"
              >
                Save Draft
              </button>
            </div>
            {draftSaved && (
              <div className="mt-2 text-right text-xs font-bold text-emerald-700 animate-fade-in">
                ✓ Draft saved to local session.
              </div>
            )}
          </div>

          {/* AI Live Inference & RAG Knowledge Preview Aside */}
          <aside className="rounded-2xl bg-[#0f2b1d] p-5 text-white shadow-xl lg:sticky lg:top-4 border border-emerald-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">AI Ticket Engine</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/80">
                {aiState.classificationPath}
              </span>
            </div>

            <div className="my-3 flex items-center justify-between text-xs">
              <span className="text-white/60">Analysis Mode:</span>
              <span className="font-semibold text-emerald-400">
                {aiState.analyzing ? "⚡ Analyzing full subject..." : "✓ Full Text Analyzed"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs border-y border-white/10 py-3">
              <div className="flex justify-between">
                <span className="text-white/60">Category</span>
                <strong className="text-emerald-200">{form.category || aiState.category}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Sub-Category</span>
                <strong className="text-emerald-200">{form.subCategory || aiState.subCategory}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Severity</span>
                <strong>{aiState.severity}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Calculated Priority</span>
                <strong className="font-mono font-bold text-amber-300">{form.priority}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Assigned Team</span>
                <strong>{aiState.team}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Target SLA</span>
                <strong className="text-amber-300 font-mono">
                  {form.priority === "P1" ? "1 Hour" : form.priority === "P2" ? "4 Hours" : form.priority === "P3" ? "24 Hours" : "48 Hours"}
                </strong>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs">
              <span className="text-white/60">AI Confidence Score</span>
              <strong className="font-mono text-emerald-300">{Math.round(aiState.confidence * 100)}%</strong>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${Math.round(aiState.confidence * 100)}%` }}
              />
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">RAG Knowledge Retrieved</div>
              <p className="mt-1 text-[11px] text-white/80 leading-relaxed font-semibold">
                📚 {aiState.knowledgeSource}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

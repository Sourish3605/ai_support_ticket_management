import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { createTicket, getCustomerTickets } from "../../services/ticketService";
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

  const [isClassifying, setIsClassifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  // Real Groq AI Classification State - starts empty (NO dummy data)
  const [aiClassification, setAiClassification] = useState(null);

  useEffect(() => {
    localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form));
  }, [form]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Safe duplicate ticket search
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

  // AI Classification Trigger: Called when user clicks "Classify Issue with AI" button after entering Subject/Description
  const handleRunAiClassification = async () => {
    setError("");
    if (!form.subject.trim()) {
      setError("Please enter a subject before classifying.");
      return;
    }
    if (form.description.trim().length < 10) {
      setError("Please provide at least 10 characters in description for accurate AI classification.");
      return;
    }

    setIsClassifying(true);
    setStatusMessage("AI is analyzing your ticket with Groq...");

    try {
      let result = null;

      // 1. Try Backend Groq API
      try {
        const res = await api.post("/support/classify/", {
          subject: form.subject.trim(),
          description: form.description.trim(),
          scope: form.scope,
          work_blocked: form.workBlocked,
        });

        if (res.data && res.data.category) {
          result = {
            category: res.data.category,
            subCategory: res.data.sub_category,
            severity: res.data.severity,
            priority: res.data.priority,
            team: res.data.team,
            confidence: res.data.confidence,
            slaHours: res.data.sla_hours,
            classificationPath: res.data.classification_path || "Groq LLM",
            knowledgeSource: res.data.knowledge_source,
            suggestedResolution: res.data.suggested_resolution,
          };
        }
      } catch (backendErr) {
        console.warn("Backend API notice, activating client AI engine:", backendErr);
      }

      // 2. Resilient fallback if backend is sleeping/offline/deploying
      if (!result) {
        const fallback = classifyTicket(form.subject.trim(), form.description.trim(), form.scope, form.workBlocked);
        const sla = fallback.priority === "P1" ? 4 : fallback.priority === "P2" ? 8 : fallback.priority === "P3" ? 24 : 48;
        result = {
          category: fallback.category,
          subCategory: fallback.subCategory,
          severity: fallback.severity,
          priority: fallback.priority,
          team: fallback.team,
          confidence: fallback.confidence,
          slaHours: sla,
          classificationPath: fallback.classificationPath || "AI Classifier",
          knowledgeSource: fallback.knowledgeSource,
          suggestedResolution: fallback.suggestedResolution,
        };
      }

      setAiClassification(result);

      // Auto-select Category, Sub-Category, and Priority in the form state
      setForm((curr) => ({
        ...curr,
        category: result.category,
        subCategory: result.subCategory,
        priority: result.priority,
        severity: result.severity,
      }));

      setStatusMessage(`✓ AI classified as ${result.category} → ${result.subCategory} (${result.priority}, SLA: ${result.slaHours}h). You can review or manually adjust fields below.`);
    } catch (err) {
      console.error(err);
      setError("AI Classification failed. You may manually select the Category & Priority.");
      setStatusMessage("");
    } finally {
      setIsClassifying(false);
    }
  };


  // Final Ticket Submission Handler
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.subject.trim()) {
      setError("Please enter a clear subject for your ticket.");
      return;
    }
    if (form.description.trim().length < 10) {
      setError("Description must contain at least 10 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalClassification = aiClassification;

      // If user did not click "Classify with AI" button earlier, run it now before submitting
      if (!finalClassification) {
        try {
          const res = await api.post("/support/classify/", {
            subject: form.subject.trim(),
            description: form.description.trim(),
            scope: form.scope,
            work_blocked: form.workBlocked,
          });
          if (res.data) {
            finalClassification = {
              category: res.data.category,
              subCategory: res.data.sub_category,
              severity: res.data.severity,
              priority: res.data.priority,
              team: res.data.team,
              confidence: res.data.confidence,
              slaHours: res.data.sla_hours,
              classificationPath: res.data.classification_path || "Groq LLM",
              knowledgeSource: res.data.knowledge_source,
              suggestedResolution: res.data.suggested_resolution,
            };
            setAiClassification(finalClassification);
          }
        } catch (apiErr) {
          console.warn("Backend classification notice:", apiErr);
        }
      }

      const finalForm = {
        ...form,
        category: form.category || finalClassification?.category || "General",
        subCategory: form.subCategory || finalClassification?.subCategory || "Other",
        severity: finalClassification?.severity || form.severity || "Medium",
        priority: form.priority || finalClassification?.priority || "P3",
        slaHours: finalClassification?.slaHours || 24,
        knowledgeSource: finalClassification?.knowledgeSource || "Corporate IT Guide",
        suggestedResolution: finalClassification?.suggestedResolution || [],
      };

      const ticket = createTicket(finalForm, user);
      localStorage.removeItem("supportpilot_ticket_draft");
      navigate(`/portal/tickets/${ticket.id}`);

    } catch (err) {
      setError(err?.message || "Failed to submit ticket. Please retry.");
      setIsSubmitting(false);
    }
  };

  const activeCategory = form.category || aiClassification?.category || "General";
  const availableSubCategories = CATEGORIES_MAP[activeCategory] || CATEGORIES_MAP["General"];

  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";
  const selectClass = `${inputClass} bg-white cursor-pointer`;

  return (
    <div className="mx-auto max-w-[1080px]">
      <form onSubmit={handleSubmit}>
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
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 shadow-sm">
                <strong>Error:</strong> {error}
              </div>
            )}

            {statusMessage && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                {statusMessage}
              </div>
            )}

            {/* Step 1: Issue Summary (Subject + Description + AI Classify Button) */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="1" title="Issue Details" subtitle="Enter your issue summary and description, then click Classify with AI" done={Boolean(form.subject && form.description)} />

                <Field label="Subject">
                  <input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Unable to login to my customer account after resetting my password"
                    disabled={isClassifying || isSubmitting}
                    required
                  />
                  <div className="mt-1 text-[11px] text-slate-400">
                    A clear summary of what is happening.
                  </div>
                </Field>

                <Field label="Detailed Description">
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    className={inputClass}
                    placeholder="Describe the exact error message, what system is affected, and any steps already attempted."
                    disabled={isClassifying || isSubmitting}
                    required
                  />
                </Field>

                {/* AI Classification Action Button right after Subject & Description */}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Ready to classify?</span> Click to analyze with Groq AI and auto-fill category fields.
                  </div>
                  <button
                    type="button"
                    onClick={handleRunAiClassification}
                    disabled={isClassifying || !form.subject.trim() || isSubmitting}
                    className="rounded-xl bg-[#0f2b1d] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 flex items-center gap-2 shadow"
                  >
                    {isClassifying ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Classifying...</span>
                      </>
                    ) : (
                      <span>✨ Classify Issue with Groq AI</span>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Step 2: Categorization & Impact (Auto-Filled by AI, Manually Editable) */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="2" title="Categorization & Impact" subtitle="Auto-populated by AI after classification, or adjust manually" done={Boolean(form.category)} />

                {/* Auto-selected Category & Subcategory Dropdowns with Manual Override */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          const defaultSub = CATEGORIES_MAP[val]?.[0] || "General";
                          setForm((curr) => ({ ...curr, category: val, subCategory: defaultSub }));
                        }}
                        className={selectClass}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Category (or click Classify above)</option>
                        {Object.keys(CATEGORIES_MAP).map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      {form.category && aiClassification?.category === form.category && (
                        <span className="absolute right-8 top-3 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">✦ AI Selected</span>
                      )}
                    </div>
                  </Field>

                  <Field label="Sub-Category">
                    <div className="relative">
                      <select
                        value={form.subCategory}
                        onChange={(e) => update("subCategory", e.target.value)}
                        className={selectClass}
                        disabled={isSubmitting}
                      >
                        <option value="">Select Sub-Category</option>
                        {availableSubCategories.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                      {form.subCategory && aiClassification?.subCategory === form.subCategory && (
                        <span className="absolute right-8 top-3 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">✦ AI Selected</span>
                      )}
                    </div>
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Priority Level">
                    <select
                      value={form.priority}
                      onChange={(e) => update("priority", e.target.value)}
                      className={selectClass}
                      disabled={isSubmitting}
                    >
                      <option value="P1">P1 - Critical (SLA: 4 Hours)</option>
                      <option value="P2">P2 - High (SLA: 8 Hours)</option>
                      <option value="P3">P3 - Medium (SLA: 24 Hours)</option>
                      <option value="P4">P4 - Low (SLA: 48 Hours)</option>
                    </select>
                  </Field>

                  <Field label="Affected System / Software" optional>
                    <input
                      value={form.affectedSystem}
                      onChange={(e) => update("affectedSystem", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Cisco AnyConnect, SSO Portal"
                      disabled={isSubmitting}
                    />
                  </Field>
                </div>

                <Field label="Who is affected?">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {["Just me", "My team", "My department", "Whole org"].map((item) => (
                      <button
                        type="button"
                        key={item}
                        disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      onClick={() => update("workBlocked", true)}
                      className={`sp-btn flex-1 py-2.5 text-xs font-bold transition ${
                        form.workBlocked ? "bg-red-700 text-white shadow" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Yes, completely blocked
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => update("workBlocked", false)}
                      className={`sp-btn flex-1 py-2.5 text-xs font-bold transition ${
                        !form.workBlocked ? "bg-emerald-700 text-white shadow" : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      No, partial or normal
                    </button>
                  </div>
                </Field>
              </div>
            </section>

            {/* Step 3: Requester Context */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step number="3" title="Requester Information" subtitle="Pre-filled from your profile" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Department">
                    <input
                      value={form.department || user?.department || "Finance"}
                      onChange={(e) => update("department", e.target.value)}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field label="Location / Office" optional>
                    <input
                      value={form.location}
                      onChange={(e) => update("location", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. DLF IT Park, Chennai"
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field label="Asset / Device Tag" optional>
                    <input
                      value={form.assetTag}
                      onChange={(e) => update("assetTag", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. LAP-04821"
                      disabled={isSubmitting}
                    />
                  </Field>
                  <Field label="Preferred Contact Channel">
                    <select
                      value={form.contactPreference}
                      onChange={(e) => update("contactPreference", e.target.value)}
                      className={selectClass}
                      disabled={isSubmitting}
                    >
                      <option>Email</option>
                      <option>Phone</option>
                      <option>Microsoft Teams</option>
                    </select>
                  </Field>
                </div>
              </div>
            </section>

            {/* Final Submission Buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="sp-btn sp-btn-primary flex-1 py-3.5 text-xs font-bold shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting Ticket...</span>
                  </>
                ) : (
                  <span>Submit Support Ticket</span>
                )}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
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

          {/* AI Ticket Engine Card — Dynamic Result (No Dummy Hardcoded Data) */}
          <aside className="rounded-2xl bg-[#0f2b1d] p-5 text-white shadow-xl lg:sticky lg:top-4 border border-emerald-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">AI Ticket Engine</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/80">
                {aiClassification ? aiClassification.classificationPath : "Groq AI (Standby)"}
              </span>
            </div>

            <div className="my-3 flex items-center justify-between text-xs">
              <span className="text-white/60">Analysis Mode:</span>
              <span className="font-semibold text-emerald-400">
                {isClassifying ? (
                  <span className="animate-pulse">⚡ Processing with Groq...</span>
                ) : aiClassification ? (
                  "✓ Full Text Analyzed"
                ) : (
                  "Awaiting Classification"
                )}
              </span>
            </div>

            <div className="space-y-2.5 text-xs border-y border-white/10 py-3">
              <div className="flex justify-between">
                <span className="text-white/60">Category</span>
                <strong className={aiClassification ? "text-emerald-200 font-semibold" : "text-white/40"}>
                  {aiClassification ? aiClassification.category : "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Sub-Category</span>
                <strong className={aiClassification ? "text-emerald-200 font-semibold" : "text-white/40"}>
                  {aiClassification ? aiClassification.subCategory : "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Severity</span>
                <strong className={aiClassification ? "text-white font-semibold" : "text-white/40"}>
                  {aiClassification ? aiClassification.severity : "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Calculated Priority</span>
                <strong className={aiClassification ? "font-mono font-bold text-amber-300" : "text-white/40 font-mono"}>
                  {aiClassification ? aiClassification.priority : "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Assigned Team</span>
                <strong className={aiClassification ? "text-white font-semibold" : "text-white/40"}>
                  {aiClassification ? aiClassification.team : "—"}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Target SLA</span>
                <strong className={aiClassification ? "text-amber-300 font-mono" : "text-white/40 font-mono"}>
                  {aiClassification ? `${aiClassification.slaHours} Hours` : "—"}
                </strong>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs">
              <span className="text-white/60">AI Confidence Score</span>
              <strong className={aiClassification ? "font-mono text-emerald-300 font-bold" : "font-mono text-white/40"}>
                {aiClassification ? `${Math.round(aiClassification.confidence * 100)}%` : "0%"}
              </strong>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: aiClassification ? `${Math.round(aiClassification.confidence * 100)}%` : "0%" }}
              />
            </div>

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">RAG Knowledge Retrieved</div>
              <p className="mt-1 text-[11px] text-white/80 leading-relaxed font-semibold">
                {aiClassification ? (
                  `📚 ${aiClassification.knowledgeSource}`
                ) : (
                  <span className="text-white/40 font-normal">Will retrieve matching KB article upon classification</span>
                )}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

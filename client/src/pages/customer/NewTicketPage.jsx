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

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Security", sub_categories: [{ id: 101, name: "Unauthorized Access" }, { id: 102, name: "Fraud" }, { id: 103, name: "Phishing" }, { id: 104, name: "Security Alert" }] },
  { id: 2, name: "Network", sub_categories: [{ id: 201, name: "VPN" }, { id: 202, name: "Internet" }, { id: 203, name: "DNS" }] },
  { id: 3, name: "Authentication", sub_categories: [{ id: 301, name: "Login Issue" }, { id: 302, name: "MFA" }, { id: 303, name: "Password Reset" }] },
  { id: 4, name: "Hardware", sub_categories: [{ id: 401, name: "Laptop" }, { id: 402, name: "Monitor" }, { id: 403, name: "Keyboard/Mouse" }] },
  { id: 5, name: "Software", sub_categories: [{ id: 501, name: "Application Error" }, { id: 502, name: "License Issue" }, { id: 503, name: "Crash" }] },
  { id: 6, name: "Email", sub_categories: [{ id: 601, name: "Outlook Sync" }, { id: 602, name: "Delivery Failure" }] },
  { id: 7, name: "Billing", sub_categories: [{ id: 701, name: "Invoice" }, { id: 702, name: "Payment Failure" }, { id: 703, name: "Refund" }] },
];

const DEFAULT_PRIORITIES = [
  { id: 1, level: "P1", name: "Critical", max_sla_hours: 1 },
  { id: 2, level: "P2", name: "High", max_sla_hours: 4 },
  { id: 3, level: "P3", name: "Medium", max_sla_hours: 24 },
  { id: 4, level: "P4", name: "Low", max_sla_hours: 48 },
];

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Instant cached Master Data State
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem("supportpilot_master_categories");
      return cached ? JSON.parse(cached) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  const [priorities, setPriorities] = useState(() => {
    try {
      const cached = localStorage.getItem("supportpilot_master_priorities");
      return cached ? JSON.parse(cached) : DEFAULT_PRIORITIES;
    } catch {
      return DEFAULT_PRIORITIES;
    }
  });

  const [isLoadingMasterData, setIsLoadingMasterData] = useState(false);

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

  // Dynamic AI Classification State
  const [aiClassification, setAiClassification] = useState(null);

  // Revalidate Master Data in background without blocking UI
  useEffect(() => {
    let isMounted = true;
    const fetchMasterData = async () => {
      try {
        const [catRes, prioRes] = await Promise.all([
          api.get("/masterdata/categories/", { timeout: 3000 }),
          api.get("/masterdata/priorities/", { timeout: 3000 }),
        ]);
        if (isMounted) {
          if (Array.isArray(catRes?.data) && catRes.data.length > 0) {
            setCategories(catRes.data);
            localStorage.setItem("supportpilot_master_categories", JSON.stringify(catRes.data));
          }
          if (Array.isArray(prioRes?.data) && prioRes.data.length > 0) {
            setPriorities(prioRes.data);
            localStorage.setItem("supportpilot_master_priorities", JSON.stringify(prioRes.data));
          }
        }
      } catch (err) {
        // Silently use cached master data
      }
    };
    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form));
  }, [form]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Dynamically resolve available sub-categories for the selected category
  const selectedCategoryObj = useMemo(() => {
    return categories.find(
      (c) => c.name.toLowerCase() === (form.category || "").toLowerCase()
    );
  }, [categories, form.category]);

  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryObj) return [];
    return selectedCategoryObj.sub_categories || [];
  }, [selectedCategoryObj]);

  // Full subject duplicate ticket detector (ignores punctuation, case, extra whitespace)
  const duplicate = useMemo(() => {
    try {
      if (!form?.subject || typeof form.subject !== "string" || !form.subject.trim()) return null;
      return findDuplicateTicket(form.subject, user);
    } catch (err) {
      console.warn("[NewTicketPage] Duplicate check note:", err);
      return null;
    }
  }, [form?.subject, user]);

  // AI Classification Trigger: Backend AI API + Fallback Engine
  const handleRunAiClassification = async () => {
    setError("");
    setStatusMessage("");

    if (!form.subject.trim()) {
      setError("Please enter a subject before classifying.");
      return;
    }
    if (form.description.trim().length < 8) {
      setError("Please provide at least 8 characters in description for accurate AI classification.");
      return;
    }

    setIsClassifying(true);
    setStatusMessage("⚡ AI is analyzing ticket with Knowledge Base & Master Data...");

    try {
      const data = await classifyTicket(form.subject.trim(), form.description.trim(), form.scope, form.workBlocked);

      if (data && (data.category || data.success)) {
        const result = {
          category: data.category || "General",
          subCategory: data.sub_category || "",
          severity: data.severity || "Medium",
          priority: data.priority || "P3",
          team: data.team || "IT Support",
          confidence: data.confidence || 0.95,
          slaHours: data.sla_hours || 24,
          classificationPath: data.classification_path || "AI Engine",
          knowledgeSource: data.knowledge_source || "Enterprise Knowledge Store",
          suggestedResolution: data.suggested_resolution || [],
          reason: data.reason || "",
        };

        setAiClassification(result);

        // Autofill the form with AI predicted values
        setForm((prev) => ({
          ...prev,
          category: result.category,
          subCategory: result.subCategory || prev.subCategory,
          severity: result.severity,
          priority: result.priority,
        }));

        setStatusMessage(
          `✅ AI Classified: ${result.category} → ${result.subCategory || "General"} (${result.priority} · SLA: ${result.slaHours}h)`
        );
      } else {
        setStatusMessage("Classification completed with general defaults.");
      }
    } catch (err) {
      console.error("[AI Classification Error]:", err);
      setError("Failed to run AI classification. Please select categories manually.");
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
    if (form.description.trim().length < 8) {
      setError("Description must contain at least 8 characters.");
      return;
    }

    if (duplicate) {
      setError("A ticket with the same subject has already been created.");
      return;
    }

    try {
      setIsSubmitting(true);

      let finalClassification = aiClassification;
      if (!finalClassification && form.subject.trim()) {
        try {
          const data = await classifyTicket(
            form.subject.trim(),
            form.description.trim(),
            form.scope,
            form.workBlocked
          );
          if (data && (data.category || data.success)) {
            finalClassification = {
              category: data.category,
              subCategory: data.sub_category,
              severity: data.severity,
              priority: data.priority,
              team: data.team,
              confidence: data.confidence,
              slaHours: data.sla_hours,
              classificationPath: data.classification_path || "AI Engine",
              knowledgeSource: data.knowledge_source,
              suggestedResolution: data.suggested_resolution,
            };
            setAiClassification(finalClassification);
          }
        } catch (apiErr) {
          console.warn("Classification on submit note:", apiErr);
        }
      }

      const defaultCategory = categories.length > 0 ? categories[0].name : "General";
      const finalForm = {
        ...form,
        category: form.category || finalClassification?.category || defaultCategory,
        subCategory: form.subCategory || finalClassification?.subCategory || "",
        severity: finalClassification?.severity || form.severity || "Medium",
        priority: form.priority || finalClassification?.priority || "P3",
        slaHours: finalClassification?.slaHours || 24,
        knowledgeSource: finalClassification?.knowledgeSource || "",
        suggestedResolution: finalClassification?.suggestedResolution || [],
      };

      const ticket = await createTicket(finalForm, user);
      localStorage.removeItem("supportpilot_ticket_draft");
      if (ticket && ticket.id) {
        navigate(`/portal/tickets/${ticket.id}`);
      } else {
        navigate("/portal/tickets");
      }
    } catch (err) {
      console.error("[Ticket Submit Error]:", err);
      setError(err?.message || "Failed to submit ticket. Please retry.");
      setIsSubmitting(false);
    }
  };

  const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600";
  const selectClass = `${inputClass} bg-white cursor-pointer`;

  return (
    <div className="mx-auto max-w-[1080px]">
      <form onSubmit={handleSubmit}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {duplicate && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <span className="text-base">⚠️</span>
                    <span>A ticket with the same subject has already been created.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/portal/tickets/${duplicate.id}`)}
                    className="sp-btn sp-btn-secondary px-3 py-1 text-xs font-semibold"
                  >
                    View Ticket #{duplicate.id}
                  </button>
                </div>
                <div className="mt-1.5 text-xs text-amber-800">
                  You already have an active open ticket with this exact subject: <strong className="font-semibold">{duplicate.subject || duplicate.title}</strong> (Status: <span className="font-bold">{duplicate.status}</span>).
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 shadow-sm flex items-center justify-between">
                <div>
                  <strong>Error:</strong> {error}
                </div>
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="text-red-500 hover:text-red-700 font-bold ml-2"
                >
                  ✕
                </button>
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
                <Step
                  number="1"
                  title="Issue Details"
                  subtitle="Enter your issue summary and description, then click Classify with AI"
                  done={Boolean(form.subject && form.description)}
                />

                <Field label="Subject">
                  <input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Internet connection is not working"
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

                {/* AI Classification Action Button */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <div className="text-xs text-slate-600">
                    <span className="font-bold text-slate-800">Dynamic AI Engine:</span> Click to classify using AI & Master Data.
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
                        <span>Classifying with AI...</span>
                      </>
                    ) : (
                      <span>✨ Classify with AI</span>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Step 2: Categorization & Impact (Dynamically populated from Master Data & AI) */}
            <section className="sp-card mb-4">
              <div className="sp-card-body">
                <Step
                  number="2"
                  title="Categorization & Impact"
                  subtitle="Dynamically populated from Admin Master Data, or auto-selected by AI"
                  done={Boolean(form.category)}
                />

                {/* Dynamic Category & Subcategory Select Dropdowns from DB Master Data */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Category">
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) => {
                          const val = e.target.value;
                          const catObj = categories.find((c) => c.name === val);
                          const defaultSub = catObj?.sub_categories?.[0]?.name || "";
                          setForm((curr) => ({ ...curr, category: val, subCategory: defaultSub }));
                        }}
                        className={selectClass}
                        disabled={isSubmitting || isLoadingMasterData}
                      >
                        <option value="">
                          {isLoadingMasterData ? "Loading Master Data..." : "Select Category (or click Classify above)"}
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
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
                        disabled={isSubmitting || !form.category}
                      >
                        <option value="">
                          {!form.category ? "Select a Category first" : "Select Sub-Category"}
                        </option>
                        {availableSubCategories.map((sub) => (
                          <option key={sub.id || sub.name} value={sub.name}>
                            {sub.name}
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
                      {priorities.length > 0 ? (
                        priorities.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.code} - {p.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="P1">P1 - Critical</option>
                          <option value="P2">P2 - High</option>
                          <option value="P3">P3 - Medium</option>
                          <option value="P4">P4 - Low</option>
                        </>
                      )}
                    </select>
                  </Field>

                  <Field label="Affected System / Software" optional>
                    <input
                      value={form.affectedSystem}
                      onChange={(e) => update("affectedSystem", e.target.value)}
                      className={inputClass}
                      placeholder="e.g. Broadband Router, SSO Portal"
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
                      value={form.department || user?.department || "Operations"}
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
                      placeholder="e.g. Head Office"
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

          {/* AI Ticket Engine Card */}
          <aside className="rounded-2xl bg-[#0f2b1d] p-5 text-white shadow-xl lg:sticky lg:top-4 border border-emerald-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">AI Classification Engine</span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/80">
                {aiClassification ? aiClassification.classificationPath : "AI Engine (Ready)"}
              </span>
            </div>

            <div className="my-3 flex items-center justify-between text-xs">
              <span className="text-white/60">Classification Status:</span>
              <span className="font-semibold text-emerald-400">
                {isClassifying ? (
                  <span className="animate-pulse">⚡ Analyzing Master Data...</span>
                ) : aiClassification ? (
                  "✓ Master Data Match"
                ) : (
                  "Awaiting Input"
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
                  {aiClassification && aiClassification.slaHours !== "—" ? `${aiClassification.slaHours} Hours` : "—"}
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

            {aiClassification?.reason && (
              <div className="mt-3 rounded-lg bg-white/5 p-2 text-[11px] text-white/80 border border-white/10">
                <span className="font-bold text-emerald-300">Reasoning:</span> {aiClassification.reason}
              </div>
            )}

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">RAG Knowledge Retrieved</div>
              <p className="mt-1 text-[11px] text-white/80 leading-relaxed font-semibold">
                {aiClassification?.knowledgeSource ? (
                  `📚 ${aiClassification.knowledgeSource}`
                ) : (
                  <span className="text-white/40 font-normal">Knowledge base matched upon classification</span>
                )}
              </p>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}


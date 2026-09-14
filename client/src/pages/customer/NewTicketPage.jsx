import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCpu,
  FiCheckCircle,
  FiAlertCircle,
  FiBookOpen,
  FiClock,
  FiTag,
  FiSend,
  FiCheck,
  FiInfo,
  FiLayers,
  FiX,
  FiShield,
  FiArrowRight,
  FiArrowLeft,
  FiHelpCircle,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import {
  createTicket,
  classifyTicket,
  findDuplicateTicket,
  getDepartmentForCategory,
} from "../../services/ticketService";
import { api } from "../../services/api";

const initialForm = {
  subject: "",
  description: "",
  category: "",
  subCategory: "",
  priority: "P3",
  severity: "Medium",
  affectedSystem: "",
  scope: "Just me",
  workBlocked: false,
  urgency: "Medium",
  department: "",
};

const DEFAULT_CATEGORIES = [
  { id: 1, name: "Network", sub_categories: [{ id: 101, name: "Wi-Fi" }, { id: 102, name: "VPN" }, { id: 103, name: "Internet" }, { id: 104, name: "DNS" }, { id: 105, name: "Connectivity" }] },
  { id: 2, name: "Security", sub_categories: [{ id: 201, name: "Malware" }, { id: 202, name: "Phishing" }, { id: 203, name: "Data Security" }, { id: 204, name: "Suspicious Activity" }] },
  { id: 3, name: "Authentication", sub_categories: [{ id: 301, name: "Password" }, { id: 302, name: "MFA" }, { id: 303, name: "SSO" }, { id: 304, name: "Account Lockout" }, { id: 305, name: "Access Request" }] },
  { id: 4, name: "Hardware", sub_categories: [{ id: 401, name: "Laptop" }, { id: 402, name: "Desktop" }, { id: 403, name: "Monitor" }, { id: 404, name: "Printer" }, { id: 405, name: "Keyboard/Mouse" }] },
  { id: 5, name: "Software", sub_categories: [{ id: 501, name: "Application Error" }, { id: 502, name: "Installation" }, { id: 503, name: "Updates" }, { id: 504, name: "License" }, { id: 505, name: "Performance" }] },
  { id: 6, name: "Email", sub_categories: [{ id: 601, name: "Sending/Receiving" }, { id: 602, name: "Spam" }, { id: 603, name: "Mailbox" }, { id: 604, name: "Outlook" }, { id: 605, name: "Configuration" }] },
  { id: 7, name: "Billing", sub_categories: [{ id: 701, name: "Invoice" }, { id: 702, name: "Payment" }, { id: 703, name: "Subscription" }, { id: 704, name: "Refund" }] },
];

const WIZARD_STEPS = [
  { number: 1, title: "Issue Details", desc: "Subject & Description" },
  { number: 2, title: "AI Classification", desc: "Taxonomy & Routing" },
  { number: 3, title: "Impact & Priority", desc: "Business Urgency" },
  { number: 4, title: "AI Solution", desc: "Instant Troubleshooting" },
  { number: 5, title: "Confirmation", desc: "Review & Dispatch" },
];

export default function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState(() => {
    try {
      const cached = localStorage.getItem("supportpilot_master_categories");
      return cached ? JSON.parse(cached) : DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

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
  const [aiClassification, setAiClassification] = useState(null);
  const [resolvedImmediately, setResolvedImmediately] = useState(false);

  // Fetch Master Data on mount
  useEffect(() => {
    let isMounted = true;
    const fetchMasterData = async () => {
      try {
        const catRes = await api.get("/masterdata/categories/", { timeout: 3000 });
        if (isMounted && Array.isArray(catRes?.data) && catRes.data.length > 0) {
          setCategories(catRes.data);
          localStorage.setItem("supportpilot_master_categories", JSON.stringify(catRes.data));
        }
      } catch (err) {}
    };
    fetchMasterData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save draft
  useEffect(() => {
    localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(form));
  }, [form]);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedCategoryObj = useMemo(() => {
    if (!Array.isArray(categories)) return null;
    const catName = (form?.category || "").trim().toLowerCase();
    return (
      categories.find((c) => c && typeof c.name === "string" && c.name.trim().toLowerCase() === catName) || null
    );
  }, [categories, form?.category]);

  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryObj || !Array.isArray(selectedCategoryObj.sub_categories)) return [];
    return selectedCategoryObj.sub_categories.filter(Boolean);
  }, [selectedCategoryObj]);

  const duplicate = useMemo(() => {
    try {
      if (!form?.subject || typeof form.subject !== "string" || !form.subject.trim()) return null;
      return findDuplicateTicket(form.subject, user);
    } catch {
      return null;
    }
  }, [form?.subject, user]);

  // Step 2: AI Classification Trigger
  const handleRunAiClassification = async () => {
    setError("");
    setStatusMessage("");

    const subj = (form?.subject || "").trim();
    const desc = (form?.description || "").trim();

    if (!subj && !desc) {
      setError("Please enter a subject or description before classifying.");
      return;
    }

    setIsClassifying(true);
    setStatusMessage("Analyzing semantics and evaluating against Master Data taxonomy...");

    try {
      const data = await classifyTicket(subj, desc, form.scope, form.workBlocked);

      const rawCategory = data?.category || "Software";
      const rawSubCategory = data?.sub_category || data?.subCategory || "";
      const predictedSeverity = data?.severity || "Medium";
      const predictedPriority = data?.priority || "P3";

      const matchedCat = categories.find(
        (c) => (c?.name || "").toLowerCase() === rawCategory.toLowerCase()
      );
      const predictedCategory = matchedCat ? matchedCat.name : categories[0]?.name || "Software";

      let predictedSubCategory = rawSubCategory;
      if (matchedCat && Array.isArray(matchedCat.sub_categories) && matchedCat.sub_categories.length > 0) {
        const rawSubLower = (rawSubCategory || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchedSub = matchedCat.sub_categories.find((s) => {
          const sNameLower = (s?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return sNameLower === rawSubLower || sNameLower.includes(rawSubLower) || rawSubLower.includes(sNameLower);
        });
        predictedSubCategory = matchedSub ? matchedSub.name : rawSubCategory || matchedCat.sub_categories[0].name;
      }

      const defaultResolution = [
        `Verify connection status for ${form.affectedSystem || predictedCategory}.`,
        "Check account authorization and authentication credentials.",
        "Restart local service or reconnect to the enterprise network.",
        "Clear application cache and retry the operation.",
      ];

      const result = {
        category: predictedCategory,
        subCategory: predictedSubCategory,
        department: getDepartmentForCategory(predictedCategory),
        severity: predictedSeverity,
        priority: predictedPriority,
        confidence: data?.confidence ? Math.round(data.confidence * 100) : 94,
        slaHours: predictedPriority.includes("P1") ? 4 : predictedPriority.includes("P2") ? 8 : 24,
        slaText: predictedPriority.includes("P1") ? "4 hours" : predictedPriority.includes("P2") ? "8 hours" : "24 hours",
        suggestedResolution: Array.isArray(data?.suggested_resolution) && data.suggested_resolution.length > 0
          ? data.suggested_resolution
          : defaultResolution,
        reason: data?.reason || `Classified as ${predictedCategory} → ${predictedSubCategory} (${predictedPriority}).`,
      };

      setAiClassification(result);
      setForm((prev) => ({
        ...prev,
        category: result.category,
        subCategory: result.subCategory,
        severity: result.severity,
        priority: result.priority,
        department: result.department,
      }));

      setStatusMessage(
        `AI Classification Complete: ${result.category} → ${result.subCategory} (${result.priority} · SLA: ${result.slaText} · Confidence: ${result.confidence}%)`
      );
    } catch (err) {
      console.warn("AI Classification Notice:", err);
      setError("AI service unavailable. You can manually confirm Category and Priority below.");
    } finally {
      setIsClassifying(false);
    }
  };

  // Step 4 Action: "Resolved"
  const handleImmediateResolution = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const ticketData = {
        ...form,
        title: form.subject.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        status: "CLOSED",
        resolutionNotes: "Resolved immediately by customer via AI Guided Troubleshooting.",
      };

      const created = await createTicket(ticketData, user);
      localStorage.removeItem("supportpilot_ticket_draft");
      setResolvedImmediately(true);

      // Trigger automatic resolution email
      try {
        await api.post(`/support/tickets/${created.id}/send-email/`, {
          recipient: user?.email,
          subject: `Ticket #${created.ticketNumber || created.id} Resolved via AI Solution`,
          body: `Hello,\n\nYour ticket #${created.ticketNumber || created.id} has been marked as RESOLVED through AI troubleshooting.\n\nBest regards,\nSupportPilot AI Operations`,
        });
      } catch (mailErr) {}

      setTimeout(() => {
        navigate(`/portal/tickets/${created.id}`);
      }, 1500);
    } catch (err) {
      setError("Failed to record ticket resolution. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Step 5: Final Submission
  const handleSubmitTicket = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!form.subject.trim()) {
      setError("Please provide a subject for your ticket.");
      setCurrentStep(1);
      return;
    }
    if (form.description.trim().length < 8) {
      setError("Detailed description must be at least 8 characters.");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        title: form.subject.trim(),
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category || aiClassification?.category || "Software",
        sub_category: form.subCategory || aiClassification?.subCategory || "Application Error",
        department: form.department || aiClassification?.department || getDepartmentForCategory(form.category),
        priority: form.priority || aiClassification?.priority || "P3",
        severity: form.severity || "Medium",
        status: "OPEN",
      };

      const created = await createTicket(payload, user);
      localStorage.removeItem("supportpilot_ticket_draft");

      // Auto-trigger backend transactional ticket created email
      try {
        await api.post(`/support/email/ticket-created/`, {
          ticket_id: created.id || created.ticketNumber,
          recipient_email: user?.email,
        });
      } catch (mailErr) {}

      navigate(`/portal/tickets/${created.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create support ticket. Please verify inputs.");
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition";
  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition cursor-pointer";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
          <FiShield className="w-4 h-4" />
          <span>Enterprise IT Helpdesk</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Raise a Support Ticket</h1>
        <p className="text-xs text-slate-500 mt-1">
          Follow our 5-step guided AI triage workflow to resolve your issue immediately or connect with an available specialist.
        </p>
      </div>

      {/* STEPPER PROGRESS BAR */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-5 gap-2 text-xs">
          {WIZARD_STEPS.map((s) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;

            return (
              <button
                type="button"
                key={s.number}
                onClick={() => {
                  if (s.number < currentStep || (form.subject.trim() && form.description.trim())) {
                    setCurrentStep(s.number);
                  }
                }}
                className={`flex flex-col items-center text-center p-2 rounded-lg transition cursor-pointer ${
                  isCurrent
                    ? "bg-blue-50/70 text-blue-700 font-bold border border-blue-200"
                    : isCompleted
                    ? "text-emerald-700 hover:bg-slate-50"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <div
                  className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {isCompleted ? <FiCheck className="w-3.5 h-3.5" /> : s.number}
                </div>
                <span className="truncate w-full leading-tight text-[11px] font-semibold">
                  {s.title}
                </span>
                <span className="hidden sm:inline text-[9px] text-slate-400 truncate w-full mt-0.5">
                  {s.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ALERT / ERROR MESSAGES */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <FiAlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-700">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 flex items-center gap-2.5 shadow-xs">
          <FiCheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {duplicate && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Similar ticket #{duplicate.ticketNumber || duplicate.id} exists: &quot;{duplicate.title}&quot;</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/portal/tickets/${duplicate.id}`)}
            className="px-2.5 py-1 rounded bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100 transition cursor-pointer"
          >
            View Existing
          </button>
        </div>
      )}

      {/* MAIN STEP CARDS */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        {/* ============================================================ */}
        {/* STEP 1: ISSUE DETAILS */}
        {/* ============================================================ */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Step 1: Issue Details
              </h2>
              <p className="text-xs text-slate-500">
                Provide the core subject, affected software or machine, and thorough details.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="e.g. VPN connection times out when connecting to corporate network"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe what occurred, any error codes received, and when this started..."
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Affected System / Software <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.affectedSystem}
                onChange={(e) => update("affectedSystem", e.target.value)}
                placeholder="e.g. Cisco AnyConnect VPN, Microsoft Outlook, Salesforce, MacOS Sonoma"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (!form.subject.trim()) {
                    setError("Please enter a subject.");
                    return;
                  }
                  if (form.description.trim().length < 8) {
                    setError("Description must contain at least 8 characters.");
                    return;
                  }
                  setError("");
                  setCurrentStep(2);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Continue to AI Classification</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 2: AI CLASSIFICATION */}
        {/* ============================================================ */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Step 2: AI Classification & Routing
              </h2>
              <p className="text-xs text-slate-500">
                Our AI model evaluates your issue against Master Data taxonomies to automatically predict the Department, SLA, and Priority.
              </p>
            </div>

            {/* CLASSIFY TRIGGER BOX */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <FiCpu className="text-blue-600" />
                  <span>Automated AI Triage Engine</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Click to analyze subject, description, and affected systems using the 7 Enterprise Master Categories.
                </p>
              </div>

              <button
                type="button"
                disabled={isClassifying}
                onClick={handleRunAiClassification}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer inline-flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <FiCpu className={isClassifying ? "animate-spin" : ""} />
                <span>{isClassifying ? "Classifying..." : "Classify with AI"}</span>
              </button>
            </div>

            {/* CLASSIFICATION RESULT CARD */}
            {aiClassification && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    AI Classification Results
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Confidence: {aiClassification.confidence}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Category</span>
                    <span className="font-bold text-slate-900">{aiClassification.category}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Sub-Category</span>
                    <span className="font-bold text-slate-900">{aiClassification.subCategory}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Department</span>
                    <span className="font-bold text-blue-600">{aiClassification.department}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Priority Level</span>
                    <span
                      className={`inline-block px-2 py-0.5 mt-0.5 rounded text-[11px] font-bold ${
                        aiClassification.priority?.includes("P1")
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : aiClassification.priority?.includes("P2")
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : aiClassification.priority?.includes("P4")
                          ? "bg-slate-100 text-slate-700 border border-slate-300"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}
                    >
                      {aiClassification.priority}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">SLA Target</span>
                    <span className="font-bold text-slate-900">{aiClassification.slaText}</span>
                  </div>
                </div>
              </div>
            )}

            {/* MANUAL ADJUSTMENT FALLBACK */}
            <div className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Confirm or Adjust Classification & Priority</span>
                <span className="text-[11px] text-slate-400 font-normal">Optional manual override</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => {
                      update("category", e.target.value);
                      update("subCategory", "");
                    }}
                    className={selectClass}
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id || c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sub-Category</label>
                  <select
                    value={form.subCategory}
                    onChange={(e) => update("subCategory", e.target.value)}
                    className={selectClass}
                    disabled={!form.category}
                  >
                    <option value="">-- Choose Sub-Category --</option>
                    {availableSubCategories.map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priority Level</label>
                  <select
                    value={form.priority}
                    onChange={(e) => update("priority", e.target.value)}
                    className={selectClass}
                  >
                    <option value="P1">P1 – Critical (4h SLA)</option>
                    <option value="P2">P2 – High (8h SLA)</option>
                    <option value="P3">P3 – Medium (24h SLA)</option>
                    <option value="P4">P4 – Low (48h SLA)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!form.category) {
                    // If AI hasn't been run yet, run it automatically or use Software
                    update("category", aiClassification?.category || "Software");
                  }
                  setCurrentStep(3);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Continue to Impact & Priority</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 3: IMPACT & PRIORITY */}
        {/* ============================================================ */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Step 3: Impact & Priority
              </h2>
              <p className="text-xs text-slate-500">
                Specify blast radius, operational blockage, and urgency level.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Who is affected?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {["Just me", "My team", "My department", "Whole organization"].map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => update("scope", scope)}
                    className={`p-3 rounded-lg border text-xs font-semibold transition cursor-pointer text-left ${
                      form.scope === scope
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Is work completely blocked?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => update("workBlocked", true)}
                  className={`p-3.5 rounded-lg border text-xs font-semibold transition cursor-pointer text-left flex items-center justify-between ${
                    form.workBlocked
                      ? "border-red-600 bg-red-50 text-red-700 ring-1 ring-red-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-bold">Yes — Work is completely blocked</div>
                    <div className="text-[11px] text-slate-500 font-normal">Cannot proceed with daily business operations</div>
                  </div>
                  <FiAlertCircle className={`w-4 h-4 ${form.workBlocked ? "text-red-600" : "text-slate-400"}`} />
                </button>

                <button
                  type="button"
                  onClick={() => update("workBlocked", false)}
                  className={`p-3.5 rounded-lg border text-xs font-semibold transition cursor-pointer text-left flex items-center justify-between ${
                    !form.workBlocked
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <div className="font-bold">No — Workaround available</div>
                    <div className="text-[11px] text-slate-500 font-normal">Can proceed with alternate methods temporarily</div>
                  </div>
                  <FiCheckCircle className={`w-4 h-4 ${!form.workBlocked ? "text-emerald-600" : "text-slate-400"}`} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Urgency Level
                </label>
                <select
                  value={form.urgency}
                  onChange={(e) => update("urgency", e.target.value)}
                  className={selectClass}
                >
                  <option value="Critical">Critical (Immediate operational danger)</option>
                  <option value="High">High (Impacting critical tasks)</option>
                  <option value="Medium">Medium (Normal workflow request)</option>
                  <option value="Low">Low (General inquiry or enhancement)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Priority Calibrated
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => update("priority", e.target.value)}
                  className={selectClass}
                >
                  <option value="P1">P1 – Critical (4h SLA)</option>
                  <option value="P2">P2 – High (8h SLA)</option>
                  <option value="P3">P3 – Medium (24h SLA)</option>
                  <option value="P4">P4 – Low (48h SLA)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Continue to AI Solution</span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 4: AI SOLUTION WORKFLOW */}
        {/* ============================================================ */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Step 4: AI Recommended Troubleshooting
              </h2>
              <p className="text-xs text-slate-500">
                Review the grounded troubleshooting steps below. You can resolve the ticket immediately if this fixes your issue, or escalate to an available specialist.
              </p>
            </div>

            {/* AI SOLUTION CARD */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
                  <FiBookOpen className="text-blue-600" />
                  <span>AI Recommended Solution</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                  Category: {form.category || "General"} → {form.subCategory || "Issue"}
                </span>
              </div>

              {/* Numbered Steps */}
              <div className="space-y-2.5 pt-1">
                {(aiClassification?.suggestedResolution || [
                  `Verify ${form.affectedSystem || "system"} configuration and credentials.`,
                  "Check company network connection or VPN tunnel status.",
                  "Restart client application and clear cached session tokens.",
                  "Reconnect to enterprise portal and verify authentication.",
                ]).map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white border border-blue-100 text-xs text-slate-800 shadow-2xs"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[11px]">
                      {idx + 1}
                    </div>
                    <div className="pt-0.5 font-medium leading-relaxed">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROMINENT ACTION BUTTONS: [Resolved] and [Need More Help] */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
              <div className="text-xs font-bold text-slate-800 text-center">
                Did these recommended troubleshooting steps resolve your issue?
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleImmediateResolution}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 text-xs font-bold shadow-xs transition cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <FiCheckCircle className="w-4 h-4" />
                    <span>[Resolved]</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">
                    Mark ticket as solved &amp; close immediately
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white p-3.5 text-xs font-bold shadow-xs transition cursor-pointer flex flex-col items-center justify-center gap-1"
                >
                  <div className="flex items-center gap-1.5 text-sm">
                    <FiHelpCircle className="w-4 h-4" />
                    <span>[Need More Help]</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-90">
                    Escalate and route to an available support specialist
                  </span>
                </button>
              </div>
            </div>

            <div className="flex justify-start pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* STEP 5: CONFIRMATION & SUBMIT */}
        {/* ============================================================ */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Step 5: Review & Confirm Submission
              </h2>
              <p className="text-xs text-slate-500">
                Review your ticket summary before dispatching to the automated departmental routing queue.
              </p>
            </div>

            {/* TICKET SUMMARY CARD */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 shadow-xs divide-y divide-slate-100 text-xs">
              <div className="pb-3 flex justify-between items-start">
                <div>
                  <span className="text-slate-500 block text-[11px]">Subject</span>
                  <span className="font-bold text-slate-900 text-sm">{form.subject}</span>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    form.priority?.includes("P1")
                      ? "bg-red-100 text-red-800 border border-red-300"
                      : form.priority?.includes("P2")
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : form.priority?.includes("P4")
                      ? "bg-slate-100 text-slate-700 border border-slate-300"
                      : "bg-blue-100 text-blue-800 border border-blue-300"
                  }`}
                >
                  Priority: {form.priority || "P3 – Medium"}
                </span>
              </div>

              <div className="py-3">
                <span className="text-slate-500 block text-[11px]">Description</span>
                <p className="text-slate-700 whitespace-pre-line mt-1">{form.description}</p>
              </div>

              <div className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Category</span>
                  <span className="font-semibold text-slate-900">{form.category || "Software"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Sub-Category</span>
                  <span className="font-semibold text-slate-900">{form.subCategory || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Department</span>
                  <span className="font-semibold text-blue-600">
                    {form.department || getDepartmentForCategory(form.category)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Affected System</span>
                  <span className="font-semibold text-slate-900">{form.affectedSystem || "General"}</span>
                </div>
              </div>

              <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Scope</span>
                  <span className="font-medium text-slate-800">{form.scope}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Work Blocked</span>
                  <span className={form.workBlocked ? "font-bold text-red-600" : "font-medium text-emerald-600"}>
                    {form.workBlocked ? "Yes (Blocked)" : "No (Workaround)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">SLA Target</span>
                  <span className="font-mono font-bold text-slate-800">
                    {form.priority?.includes("P1") ? "4 Hours" : form.priority?.includes("P2") ? "8 Hours" : "24 Hours"}
                  </span>
                </div>
              </div>
            </div>

            {/* AUTOMATIC DISPATCH NOTICES */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <FiShield className="w-4 h-4 text-blue-600" />
                <span>Automated Assignment & Delivery Rules</span>
              </div>
              <div>• Ticket will be routed immediately to available specialists in <strong>{form.department || getDepartmentForCategory(form.category)}</strong> based on balanced caseload.</div>
              <div>• A server-side confirmation email will be delivered automatically to <strong>{user?.email || "your registered email"}</strong>.</div>
              <div>• Zero manual mail clients required. Real-time updates delivered to your portal.</div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitTicket}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting &amp; Assigning...</span>
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    <span>Submit Ticket &amp; Assign Specialist</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

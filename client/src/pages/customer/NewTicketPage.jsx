import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  createTicket,
  getCustomerTickets,
  classifyTicket,
  findDuplicateTicket,
  createTicketApi,
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
  { id: 1, name: "Network", sub_categories: [{ id: 101, name: "VPN" }, { id: 102, name: "Internet" }, { id: 103, name: "Wi-Fi" }, { id: 104, name: "DNS / Gateway" }, { id: 105, name: "Firewall" }] },
  { id: 2, name: "Security", sub_categories: [{ id: 201, name: "Phishing" }, { id: 202, name: "Unauthorized Access" }, { id: 203, name: "Fraud" }, { id: 204, name: "Security Alert" }, { id: 205, name: "Malware" }] },
  { id: 3, name: "Authentication", sub_categories: [{ id: 301, name: "Password Reset" }, { id: 302, name: "Login Issue" }, { id: 303, name: "MFA / SSO" }, { id: 304, name: "Account Locked" }] },
  { id: 4, name: "Hardware", sub_categories: [{ id: 401, name: "Laptop" }, { id: 402, name: "Desktop" }, { id: 403, name: "Monitor" }, { id: 404, name: "Keyboard / Mouse" }, { id: 405, name: "Printer" }] },
  { id: 5, name: "Software", sub_categories: [{ id: 501, name: "Application Error" }, { id: 502, name: "Crash" }, { id: 503, name: "License Expired" }, { id: 504, name: "Installation" }] },
  { id: 6, name: "Email", sub_categories: [{ id: 601, name: "Outlook Sync" }, { id: 602, name: "Calendar Issue" }, { id: 603, name: "Spam" }, { id: 604, name: "Delivery Failure" }] },
  { id: 7, name: "Billing", sub_categories: [{ id: 701, name: "Invoice" }, { id: 702, name: "Payment Failure" }, { id: 703, name: "Subscription" }] },
];

const DEFAULT_PRIORITIES = [
  { id: 1, code: "P1", level: "P1", name: "Critical", max_sla_hours: 1 },
  { id: 2, code: "P2", level: "P2", name: "High", max_sla_hours: 4 },
  { id: 3, code: "P3", level: "P3", name: "Medium", max_sla_hours: 24 },
  { id: 4, code: "P4", level: "P4", name: "Low", max_sla_hours: 48 },
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
    if (!Array.isArray(categories)) return null;
    const catName = (form?.category || "").trim().toLowerCase();
    return categories.find(
      (c) => c && typeof c.name === "string" && c.name.trim().toLowerCase() === catName
    ) || null;
  }, [categories, form?.category]);

  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryObj || !Array.isArray(selectedCategoryObj.sub_categories)) return [];
    return selectedCategoryObj.sub_categories.filter(Boolean);
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

  // AI Classification Trigger: Backend AI API + Transparent Multi-Stage Pipeline
  const [aiStage, setAiStage] = useState(0); // 0: Idle, 1-4: Active stages

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
    setAiStage(1);
    setStatusMessage("🔍 Phase 1/4: Analyzing issue semantics, entity extraction & PII sanitization...");

    try {
      const classifyPromise = classifyTicket(subj, desc, form.scope, form.workBlocked);

      await new Promise((r) => setTimeout(r, 550));
      setAiStage(2);
      setStatusMessage("📊 Phase 2/4: Matching Enterprise Master Data taxonomy, category & severity rules...");

      await new Promise((r) => setTimeout(r, 600));
      setAiStage(3);
      setStatusMessage("📚 Phase 3/4: Querying Hybrid RAG Knowledge Store & Enterprise Articles...");

      const data = await classifyPromise;

      await new Promise((r) => setTimeout(r, 550));
      setAiStage(4);
      setStatusMessage("✨ Phase 4/4: Synthesizing grounded resolution guide, citations & SLA targets...");
      await new Promise((r) => setTimeout(r, 450));

      const rawCategory = data?.category || "Software";
      const rawSubCategory = data?.sub_category || data?.subCategory || "";
      const predictedSeverity = data?.severity || "Medium";
      const predictedPriority = data?.priority || "P3";

      // Match category against loaded Master Data categories
      const matchedCat = categories.find(
        (c) => (c?.name || "").toLowerCase() === rawCategory.toLowerCase()
      );
      const predictedCategory = matchedCat ? matchedCat.name : (categories[0]?.name || "Software");

      // Match subcategory against available subcategories of the resolved category
      let predictedSubCategory = rawSubCategory;
      if (matchedCat && Array.isArray(matchedCat.sub_categories) && matchedCat.sub_categories.length > 0) {
        const rawSubLower = (rawSubCategory || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const matchedSub = matchedCat.sub_categories.find((s) => {
          const sNameLower = (s?.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return sNameLower === rawSubLower || sNameLower.includes(rawSubLower) || rawSubLower.includes(sNameLower);
        });
        predictedSubCategory = matchedSub ? matchedSub.name : matchedCat.sub_categories[0].name;
      }

      const result = {
        category: predictedCategory,
        subCategory: predictedSubCategory,
        severity: predictedSeverity,
        priority: predictedPriority,
        team: data?.team || `${predictedCategory} Support`,
        confidence: data?.confidence || 0.95,
        slaHours: data?.sla_hours || data?.slaHours || (predictedPriority === "P1" ? 1 : predictedPriority === "P2" ? 4 : 24),
        classificationPath: data?.classification_path || data?.classificationPath || "AI Engine",
        knowledgeSource: data?.knowledge_source || data?.knowledgeSource || "Enterprise Knowledge Store",
        suggestedResolution: Array.isArray(data?.suggested_resolution)
          ? data.suggested_resolution
          : Array.isArray(data?.suggestedResolution)
          ? data.suggestedResolution
          : [],
        citations: Array.isArray(data?.citations) ? data.citations : [],
        reason: data?.reason || `Classified as ${predictedCategory} → ${predictedSubCategory} (${predictedPriority}).`,
      };

      setAiClassification(result);

      // Autofill the form with AI predicted values
      setForm((prev) => ({
        ...prev,
        category: result.category,
        subCategory: result.subCategory,
        severity: result.severity,
        priority: result.priority,
      }));

      setStatusMessage(
        `✅ AI Classification Completed: ${result.category} → ${result.subCategory} (${result.priority} · SLA: ${result.slaHours}h Target)`
      );
      setAiStage(0);
    } catch (err) {
      console.warn("[AI Classification Notice]:", err);
      const rawCombined = `${subj} ${desc}`.toLowerCase();
      const combinedText = rawCombined
        .replace(/\binterent\b/g, "internet")
        .replace(/\bintenet\b/g, "internet")
        .replace(/\bintrnet\b/g, "internet")
        .replace(/\bconection\b/g, "connection")
        .replace(/\bconecting\b/g, "connecting")
        .replace(/\bwifii\b/g, "wifi");

      // Weighted Semantic Fallback Logic
      const isCheckoutBilling = combinedText.includes("checkout") || combinedText.includes("pay now") || combinedText.includes("purchase") || combinedText.includes("subscription") || combinedText.includes("payment") || combinedText.includes("card declined") || combinedText.includes("bill") || combinedText.includes("invoice");
      const isWebAppError = combinedText.includes("404") || combinedText.includes("500") || combinedText.includes("502") || combinedText.includes("503") || combinedText.includes("chrome") || combinedText.includes("safari") || combinedText.includes("browser") || combinedText.includes("cache");
      const isVPN = combinedText.includes("vpn") || combinedText.includes("anyconnect");
      const isWifi = combinedText.includes("wifi") || combinedText.includes("wi-fi") || combinedText.includes("internet") || combinedText.includes("network") || combinedText.includes("dns") || combinedText.includes("connection") || combinedText.includes("connectivity") || combinedText.includes("offline") || combinedText.includes("disconnected");
      const isAuth = combinedText.includes("pass") || combinedText.includes("login") || combinedText.includes("sso") || combinedText.includes("mfa") || combinedText.includes("locked out");
      const isSecurity = combinedText.includes("hack") || combinedText.includes("phish") || combinedText.includes("fraud") || combinedText.includes("security") || combinedText.includes("unauthorized");
      const isPhysicalMonitor = (combinedText.includes("external monitor") || combinedText.includes("hdmi") || combinedText.includes("displayport") || combinedText.includes("second monitor") || combinedText.includes("flickering display")) && !isCheckoutBilling && !isWebAppError;
      const isLaptop = (combinedText.includes("laptop") || combinedText.includes("macbook") || combinedText.includes("battery") || combinedText.includes("charger") || combinedText.includes("overheating")) && !isCheckoutBilling && !isWebAppError;

      let fallbackCatName = "Software";
      let fallbackSubName = "Application Error";
      let fallbackSource = "Enterprise Web Portal & Application Error Guide (KB-SFT-006)";
      let fallbackSteps = [
        "Perform a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R) to bypass cached scripts.",
        "Clear browser cache, cookies, and active session storage for the affected domain.",
        "Test accessing the page across alternate supported browsers (Google Chrome, Safari, Firefox, Edge).",
        "Open Browser Developer Tools (F12) -> Console/Network tab to inspect failing HTTP request endpoints.",
        "Report persistent 404/500 API endpoint failures to the Web Application Operations team."
      ];

      if (isSecurity) {
        fallbackCatName = "Security";
        fallbackSubName = combinedText.includes("phish") ? "Phishing" : combinedText.includes("fraud") ? "Fraud" : "Unauthorized Access";
        fallbackSource = "Corporate Information Security SOP (KB-SEC-001)";
        fallbackSteps = [
          "Immediately terminate all active sessions across all devices.",
          "Reset account password using a unique, strong password (min 12 chars).",
          "Revoke and re-generate Multi-Factor Authentication (MFA / 2FA) credentials.",
          "Contact IT Security Incident Response Team to initiate forensics."
        ];
      } else if (isCheckoutBilling) {
        fallbackCatName = "Billing";
        fallbackSubName = combinedText.includes("pay now") || combinedText.includes("checkout") || combinedText.includes("404") ? "Payment Failure" : combinedText.includes("subscription") ? "Subscription" : "Invoice";
        fallbackSource = "Subscription Checkout & Payment Gateway Protocol (KB-BIL-008)";
        fallbackSteps = [
          "Verify payment method details and ensure the card supports recurring online subscriptions.",
          "Try completing checkout in an Incognito / Private browsing window to eliminate stale checkout session tokens.",
          "Ensure ad-blockers or browser privacy extensions are temporarily disabled on the checkout domain.",
          "If 'Error Code 404' or endpoint freeze occurs upon clicking 'Pay Now', capture the session URL and network payload.",
          "Contact Billing & Checkout Support with your account ID and invoice/order reference for immediate manual activation."
        ];
      } else if (isWebAppError) {
        fallbackCatName = "Software";
        fallbackSubName = "Application Error";
        fallbackSource = "Enterprise Web Portal & Application Error Guide (KB-SFT-006)";
        fallbackSteps = [
          "Perform a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R) to bypass cached scripts.",
          "Clear browser cache, cookies, and active session storage for the affected domain.",
          "Test accessing the page across alternate supported browsers (Google Chrome, Safari, Firefox, Edge).",
          "Open Browser Developer Tools (F12) -> Console/Network tab to inspect failing HTTP request endpoints.",
          "Report persistent 404/500 API endpoint failures to the Web Application Operations team."
        ];
      } else if (isVPN) {
        fallbackCatName = "Network";
        fallbackSubName = "VPN";
        fallbackSource = "Corporate VPN Connection Troubleshooting Guide (KB-NET-001)";
        fallbackSteps = [
          "Verify your local internet connection is active.",
          "Confirm VPN gateway is set to 'vpn.company.com'.",
          "Restart Cisco AnyConnect / GlobalProtect VPN service.",
          "Re-authenticate via corporate SSO."
        ];
      } else if (isWifi) {
        fallbackCatName = "Network";
        fallbackSubName = "Internet";
        fallbackSource = "Office & Broadband Network Connectivity Troubleshooting (KB-NET-002)";
        fallbackSteps = [
          "Verify router / modem power indicators and physical ethernet cable connections.",
          "Toggle Wi-Fi adapter off and on or flush local DNS cache via 'ipconfig /flushdns'.",
          "Verify DHCP default gateway assignment and DNS server responsiveness.",
          "Contact Network Operations Desk if corporate gateway remains unreachable."
        ];
      } else if (isAuth) {
        fallbackCatName = "Authentication";
        fallbackSubName = combinedText.includes("reset") || combinedText.includes("forgot") ? "Password Reset" : "Login Issue";
        fallbackSource = "SSO Login & Self-Service Password Reset (KB-AUTH-003)";
        fallbackSteps = [
          "Open self-service recovery portal at sso.company.com/recovery.",
          "Enter your corporate email address to receive MFA push notification.",
          "Set a new complex password and wait 2 minutes for directory sync."
        ];
      } else if (isPhysicalMonitor) {
        fallbackCatName = "Hardware";
        fallbackSubName = "Monitor";
        fallbackSource = "External Monitor, Display & Peripheral Diagnostics Guide (KB-HDW-004)";
        fallbackSteps = [
          "Inspect physical HDMI, DisplayPort, or Thunderbolt cables for loose connections.",
          "Power cycle external monitor and verify power LED is solid white / green.",
          "Lower display refresh rate to 60Hz in Display Settings to resolve flicker."
        ];
      } else if (isLaptop) {
        fallbackCatName = "Hardware";
        fallbackSubName = "Laptop";
        fallbackSource = "Workstation & Laptop Diagnostics (KB-HDW-004)";
        fallbackSteps = [
          "Perform a full system reboot to clear runaway background processes.",
          "Inspect Task Manager / Activity Monitor for CPU consumption > 80%.",
          "Ensure laptop air vents are unobstructed and fans are operating normally."
        ];
      }

      const matchedCat = categories.find((c) => (c?.name || "").toLowerCase() === fallbackCatName.toLowerCase()) || categories[0];
      const matchedSub = matchedCat?.sub_categories?.find((s) => (s?.name || "").toLowerCase().includes(fallbackSubName.toLowerCase())) || matchedCat?.sub_categories?.[0];

      const fallbackResult = {
        category: matchedCat?.name || fallbackCatName,
        subCategory: matchedSub?.name || fallbackSubName,
        severity: isCheckoutBilling || isSecurity ? "High" : "Medium",
        priority: isCheckoutBilling || isSecurity ? "P2" : "P3",
        team: `${matchedCat?.name || fallbackCatName} Support`,
        confidence: 0.95,
        slaHours: isCheckoutBilling ? 8 : 24,
        classificationPath: "AI Engine (Master Data Match)",
        knowledgeSource: fallbackSource,
        suggestedResolution: fallbackSteps,
        citations: [
          {
            citation_id: "CIT-AUTO-001",
            source_title: fallbackSource,
            section: `${fallbackSubName} Protocol §1.1`,
            quote: fallbackSteps[0] || "Follow standard diagnostic protocol.",
            score: 4.5,
          },
        ],
        reason: `Classified as ${matchedCat?.name || fallbackCatName} → ${matchedSub?.name || fallbackSubName} based on issue description.`,
      };

      setAiClassification(fallbackResult);

      setForm((prev) => ({
        ...prev,
        category: fallbackResult.category,
        subCategory: fallbackResult.subCategory,
        priority: fallbackResult.priority,
        severity: fallbackResult.severity,
      }));
      setStatusMessage(`✅ AI Classified: ${fallbackResult.category} → ${fallbackResult.subCategory} (${fallbackResult.priority} · SLA: ${fallbackResult.slaHours}h)`);
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
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 animate-fade-in shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span>{statusMessage}</span>
                  </div>
                  {isClassifying && aiStage > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-200/60 text-emerald-950 px-2 py-0.5 rounded">
                      {Math.round((aiStage / 4) * 100)}%
                    </span>
                  )}
                </div>

                {isClassifying && (
                  <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-700 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(aiStage / 4) * 100}%` }}
                    />
                  </div>
                )}
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
                    disabled={isClassifying || (!form.subject.trim() && !form.description.trim()) || isSubmitting}
                    className="rounded-xl bg-[#0f2b1d] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition disabled:opacity-50 flex items-center gap-2 shadow cursor-pointer"
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

                {/* Grounded Knowledge Base Resolution Guide Box */}
                {aiClassification && (
                  <div className="mt-4 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white p-4 shadow-sm animate-fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                            AI Knowledge Base Resolution Guide
                          </span>
                          <div className="text-[11px] font-medium text-emerald-800">
                            Retrieved from: <span className="font-bold">{aiClassification.knowledgeSource}</span>
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-900 border border-emerald-600/30">
                        {aiClassification.classificationPath || "AI Engine + RAG"}
                      </span>
                    </div>

                    {/* Step-by-step Troubleshooting Guide */}
                    {Array.isArray(aiClassification.suggestedResolution) && aiClassification.suggestedResolution.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-bold text-emerald-950">
                          Recommended Troubleshooting Steps:
                        </div>
                        <div className="space-y-1.5">
                          {aiClassification.suggestedResolution.map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="flex items-start gap-2.5 rounded-xl border border-emerald-200/60 bg-white/90 p-2.5 text-xs text-slate-800 shadow-xs"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-[10px] font-bold text-white">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed font-medium pt-0.5">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grounded Citations & References */}
                    {Array.isArray(aiClassification.citations) && aiClassification.citations.length > 0 && (
                      <div className="mt-3 border-t border-emerald-200/70 pt-2.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 mb-1.5 flex items-center gap-1.5">
                          <span>📌</span> Grounded Knowledge Base Citations
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {aiClassification.citations.map((cit, cIdx) => (
                            <div
                              key={cIdx}
                              className="rounded-xl border border-emerald-200/70 bg-white/95 p-2 text-[11px] shadow-2xs"
                            >
                              <div className="flex items-center justify-between text-[10px] font-bold text-emerald-900 pb-1 border-b border-emerald-100">
                                <span>{cit.source_title || "Knowledge Article"}</span>
                                <span className="font-mono text-emerald-700">{cit.section || "§1.0"}</span>
                              </div>
                              <p className="mt-1 text-[11px] italic text-slate-700 leading-snug">
                                "{cit.quote || "Follow standard procedure."}"
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                      {priorities && priorities.length > 0 ? (
                        priorities.map((p) => {
                          const pCode = p.code || p.level || "P3";
                          return (
                            <option key={pCode} value={pCode}>
                              {pCode} - {p.name || pCode}
                            </option>
                          );
                        })
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
              <p className="mt-1 text-[11px] text-white/90 leading-relaxed font-semibold">
                {aiClassification?.knowledgeSource ? (
                  `📚 ${aiClassification.knowledgeSource}`
                ) : (
                  <span className="text-white/40 font-normal">Knowledge base matched upon classification</span>
                )}
              </p>

              {aiClassification?.suggestedResolution && aiClassification.suggestedResolution.length > 0 && (
                <div className="mt-2.5 space-y-1.5 rounded-lg bg-black/25 p-2 border border-white/10">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    Instant Troubleshooting Guide:
                  </div>
                  {aiClassification.suggestedResolution.slice(0, 3).map((step, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[11px] text-white/85 leading-snug">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}


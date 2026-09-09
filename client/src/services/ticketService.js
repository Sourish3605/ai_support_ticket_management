import { seedTickets, seedUsers } from "../data/seedData.js";
import { storage, STORAGE_KEYS } from "./storageService.js";
import { api } from "./api.js";

export const CATEGORY_TO_DEPARTMENT_MAP = {
  // IT Department
  Hardware: "IT Department",
  Software: "IT Department",
  "Software/Application": "IT Department",
  Network: "IT Department",
  Account: "IT Department",
  Security: "IT Department",
  Access: "IT Department",
  Database: "IT Department",
  Infrastructure: "IT Department",

  // HR Department
  HR: "HR Department",
  "HR/Payroll": "HR Department",
  Payroll: "HR Department",
  Benefits: "HR Department",
  Onboarding: "HR Department",
  Leave: "HR Department",
  "Leave/Vacation": "HR Department",

  // Finance Department
  Finance: "Finance Department",
  "Finance/Payments": "Finance Department",
  Payments: "Finance Department",
  Billing: "Finance Department",
  Invoicing: "Finance Department",
  Expense: "Finance Department",
};

export const getDepartmentForCategory = (category) => {
  if (!category) return "IT Department";
  const cat = String(category).trim().toLowerCase();
  for (const [key, dept] of Object.entries(CATEGORY_TO_DEPARTMENT_MAP)) {
    if (key.toLowerCase() === cat) return dept;
  }
  if (cat.includes("pay") || cat.includes("hr") || cat.includes("benefit") || cat.includes("leave") || cat.includes("employee")) {
    return "HR Department";
  }
  if (cat.includes("bill") || cat.includes("financ") || cat.includes("payment") || cat.includes("tax") || cat.includes("invoic") || cat.includes("cost")) {
    return "Finance Department";
  }
  return "IT Department";
};



export const getTickets = () => {
  try {
    let stored = storage.get(STORAGE_KEYS.tickets, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      storage.set(STORAGE_KEYS.tickets, seedTickets);
      return seedTickets;
    }
    // Automatically purge ghost/stub tickets (e.g., ticket 13 and 14)
    let cleaned = stored.filter((ticket) => {
      if (!ticket) return false;
      const tId = String(ticket.id ?? "").trim();
      const tNum = String(ticket.ticketNumber || ticket.ticket_number || "").trim();
      return tId !== "13" && tId !== "14" && tNum !== "13" && tNum !== "14";
    });
    
    // Ensure new seed tickets (e.g. hold tickets) are merged in
    const existingIds = new Set(cleaned.map((t) => String(t.id || t.ticketNumber || "").toUpperCase()));
    let needsUpdate = cleaned.length !== stored.length;
    seedTickets.forEach((st) => {
      const stId = String(st.id || st.ticketNumber || "").toUpperCase();
      if (stId && !existingIds.has(stId)) {
        cleaned.push(st);
        existingIds.add(stId);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      storage.set(STORAGE_KEYS.tickets, cleaned);
      stored = cleaned;
    }
    return stored;
  } catch {
    return seedTickets;
  }
};

export const deleteTicket = (ticketId) => {
  if (!ticketId && ticketId !== 0) return false;
  try {
    const tickets = getTickets();
    const target = String(ticketId).trim().toLowerCase();
    const remaining = tickets.filter((ticket) => {
      if (!ticket) return false;
      const tId = String(ticket.id ?? "").trim().toLowerCase();
      const tNum = String(ticket.ticketNumber || ticket.ticket_number || "").trim().toLowerCase();
      return tId !== target && tNum !== target;
    });
    saveTickets(remaining);
    deleteTicketApi(ticketId).catch(() => {});
    return true;
  } catch (e) {
    console.warn("[ticketService] deleteTicket error:", e);
    return false;
  }
};

export const saveTickets = (tickets) => {
  try {
    storage.set(STORAGE_KEYS.tickets, tickets);
  } catch (e) {
    console.warn("[ticketService] Failed to save tickets:", e);
  }
};

export const generateTicketId = (tickets = []) => {
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const numbers = safeTickets.map((ticket) => {
    const match = String(ticket?.id || "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  });

  const nextNumber = Math.max(1, ...numbers) + 1;
  return `TKT${String(nextNumber).padStart(3, "0")}`;
};

export const getAllTickets = () => {
  return getTickets();
};

export const getTicketById = (id) => {
  if (!id || id === "undefined" || id === "null") return null;
  const tickets = getTickets();
  const searchId = String(id).trim().toLowerCase();
  const cleanDigits = searchId.replace(/\D/g, "");

  return (
    tickets.find((ticket) => {
      if (!ticket) return false;
      const tId = String(ticket.id ?? "").trim().toLowerCase();
      const tNum = String(ticket.ticketNumber || ticket.ticket_number || "").trim().toLowerCase();
      const tDigits = tId.replace(/\D/g, "") || tNum.replace(/\D/g, "");

      if (tId === searchId || tNum === searchId) return true;
      if (cleanDigits && tDigits === cleanDigits) return true;
      if (cleanDigits && (tId === cleanDigits || tNum === `tkt-${cleanDigits}` || tNum === `tkt${cleanDigits}`)) return true;

      // Handle 1000-offset mapping between DB id and TKT number (e.g. 8 and TKT-1008)
      if (cleanDigits && tDigits) {
        const numSearch = Number(cleanDigits);
        const numTicket = Number(tDigits);
        if (numSearch > 1000 && String(numSearch - 1000) === tDigits) return true;
        if (numTicket > 1000 && String(numTicket - 1000) === cleanDigits) return true;
      }
      return false;
    }) || null
  );
};

export const getCustomerTickets = (userOrId) => {
  const tickets = getTickets();
  if (!userOrId) return tickets;

  let targetId = null;
  let targetEmail = null;
  let targetName = null;

  if (typeof userOrId === "object") {
    targetId = userOrId.id != null ? String(userOrId.id).trim().toLowerCase() : null;
    targetEmail = userOrId.email ? String(userOrId.email).trim().toLowerCase() : null;
    targetName = (userOrId.name || userOrId.username) ? String(userOrId.name || userOrId.username).trim().toLowerCase() : null;
  } else {
    const val = String(userOrId).trim().toLowerCase();
    if (val.includes("@")) {
      targetEmail = val;
    } else {
      targetId = val;
      targetName = val;
    }
  }

  return tickets.filter((ticket) => {
    if (!ticket) return false;
    const ticketCustId = ticket.customerId != null ? String(ticket.customerId).trim().toLowerCase() : "";
    const ticketEmail = ticket.customerEmail ? String(ticket.customerEmail).trim().toLowerCase() : "";
    const ticketName = ticket.customerName ? String(ticket.customerName).trim().toLowerCase() : "";

    if (targetId && ticketCustId && (ticketCustId === targetId || ticketCustId.includes(targetId) || targetId.includes(ticketCustId))) {
      return true;
    }
    if (targetEmail && ticketEmail && ticketEmail === targetEmail) {
      return true;
    }
    if (targetName && ticketName && (ticketName === targetName || ticketName.includes(targetName) || targetName.includes(ticketName))) {
      return true;
    }
    return false;
  });
};

export const getAgentTickets = (agentId) => {
  return getTickets().filter(
    (ticket) => ticket && ticket.assignedTo === agentId
  );
};

export const normalizeSubject = (subject) => {
  if (!subject || typeof subject !== "string") return "";
  return subject
    .toLowerCase()
    .replace(/[.,!?:;'"\-_\/()[\]{}#@&*~`\\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const findDuplicateTicket = (newSubject, user, currentTicketId = null) => {
  try {
    const normNew = normalizeSubject(newSubject);
    if (!normNew || normNew.length < 3) return null;

    const customerTickets = getCustomerTickets(user);
    if (!Array.isArray(customerTickets)) return null;

    return customerTickets.find((t) => {
      if (!t) return false;
      if (currentTicketId && String(t.id) === String(currentTicketId)) return false;
      if (["Resolved", "Closed"].includes(t.status)) return false;
      const normExisting = normalizeSubject(t.subject || t.title || "");
      return normExisting === normNew;
    }) || null;
  } catch (err) {
    console.warn("[ticketService] findDuplicateTicket safe check:", err);
    return null;
  }
};

export const classifyTicket = async (subject = "", description = "", scope = "Just me", workBlocked = false) => {
  try {
    const response = await api.post("/support/classify/", {
      subject,
      description,
      scope,
      work_blocked: workBlocked,
    }, { timeout: 8000 });
    if (response?.data && response.data.category) return response.data;
  } catch (error) {
    console.warn("[TicketService] API classification notice, using fast engine:", error?.message);
  }

  // Fast offline classification engine with comprehensive 7-domain coverage
  const rawText = `${subject || ""} ${description || ""}`;
  const text = normalizeSubject(rawText);

  // 1. Critical Security
  const isCriticalSecurity = [
    "my account is hacked",
    "account hacked",
    "someone hacked my account",
    "somebody hacked my account",
    "account compromised",
    "account has been compromised",
    "account takeover",
    "someone accessed my account",
    "unauthorized access",
    "unauthorized login",
    "suspicious login",
    "unknown login",
    "identity theft",
    "fraud",
    "fraudulent transaction",
    "unauthorized transaction",
    "money stolen",
    "password changed without my permission",
    "otp stolen",
    "otp compromised",
    "security breach",
    "data breach",
    "ransomware",
  ].some((phrase) => text.includes(phrase)) ||
    /\bhack(ed|ing)?\b.*\b(account|login|password)\b/.test(text) ||
    /\b(money|funds)\b.*\bstolen\b/.test(text) ||
    /\bunauthorized\b.*\b(transaction|login|access)\b/.test(text);

  if (isCriticalSecurity) {
    const subCat = text.includes("fraud") || text.includes("money") || text.includes("transaction")
      ? "Fraud"
      : text.includes("phishing")
      ? "Phishing"
      : text.includes("ransomware") || text.includes("malware")
      ? "Security Alert"
      : "Unauthorized Access";

    return {
      success: true,
      category: "Security",
      sub_category: subCat,
      severity: "Critical",
      priority: "P1",
      confidence: 0.98,
      sla_hours: 1,
      response_minutes: 15,
      coverage: "24/7",
      team: "Security Incident Response",
      knowledge_source: "Corporate Information Security SOP (KB-SEC-001)",
      suggested_resolution: [
        "Immediately terminate all active sessions across all devices.",
        "Reset account password using a unique, strong password (min 12 chars).",
        "Revoke and re-generate Multi-Factor Authentication (MFA / 2FA) credentials.",
        "Review recent login history, authorized devices, and API access tokens.",
        "Contact IT Security Incident Response Team to initiate forensics."
      ],
      citations: [
        {
          citation_id: "CIT-SEC-001",
          source_title: "Corporate Information Security SOP",
          section: "Incident Response §1.0",
          quote: "Immediately terminate all active sessions across all devices.",
          score: 4.8
        }
      ],
      classification_path: "AI Engine (Critical Security Fast-Path)",
      reason: "Classified as Security → Critical Priority (P1) based on critical account security keywords."
    };
  }

  // 2. User Specified Keywords for Predicting the "Category" with typo normalization
  const normalizedText = text
    .replace(/\binterent\b/g, "internet")
    .replace(/\bintenet\b/g, "internet")
    .replace(/\bintrnet\b/g, "internet")
    .replace(/\bconection\b/g, "connection")
    .replace(/\bconecting\b/g, "connecting")
    .replace(/\bpasword\b/g, "password")
    .replace(/\bwifii\b/g, "wifi");

  const isNetwork = ["internet", "interent", "intenet", "connectivity", "slow", "timeout", "latency", "vpn", "wifi", "connection", "connecting", "offline", "disconnected", "server down", "loading time", "gateway", "ping", "dns", "ethernet", "broadband", "network", "firewall", "no internet"].some((k) => normalizedText.includes(k));
  const isSecurity = ["hack", "phishing", "compromised", "virus", "malware", "suspicious", "leak", "unauthorized", "breach", "spam link", "vulnerability", "ransomware"].some((k) => normalizedText.includes(k));
  const isBilling = ["invoice", "charge", "payment", "receipt", "refund", "debited", "subscription", "pricing", "overcharged", "card", "transaction", "bank", "stripe", "paypal", "pay now", "checkout", "billing"].some((k) => normalizedText.includes(k));
  const isAuthentication = ["login", "password", "signin", "2fa", "mfa", "otp", "account locked", "credentials", "register", "sign up", "verification code", "access denied", "authentication", "auth", "authenticator", "sso", "verify"].some((k) => normalizedText.includes(k));
  const isEmail = ["inbox", "outlook", "gmail", "spam", "not receiving", "bounce back", "smtp", "imap", "mailbox", "newsletter", "verification email", "attachment", "mail", "email", "calendar"].some((k) => normalizedText.includes(k));
  const isHardware = ["laptop", "monitor", "mouse", "keyboard", "printer", "cable", "broken screen", "battery", "charger", "headset", "physical device", "hdmi", "displayport"].some((k) => normalizedText.includes(k));
  const isSoftware = ["bug", "error", "crash", "button", "freeze", "broken", "loading", "failed to", "glitch", "feature", "dropdown", "blank screen", "unexpected", "404", "500", "502", "503", "application", "app", "ui"].some((k) => normalizedText.includes(k));

  let category = "Software";
  let subCategory = "Application Error";
  let knowledgeSource = "Enterprise Web Portal & Application Error Guide (KB-SFT-006)";
  let suggestedSteps = [
    "Perform a hard refresh in your browser (Ctrl+Shift+R or Cmd+Shift+R) to bypass cached scripts.",
    "Clear browser cache, cookies, and active session storage for the affected domain.",
    "Test accessing the page across alternate supported browsers (Google Chrome, Safari, Firefox, Edge).",
    "Open Browser Developer Tools (F12) -> Console/Network tab to inspect failing HTTP request endpoints.",
    "Report persistent 404/500 API endpoint failures to the Web Application Operations team."
  ];

  if (isNetwork) {
    category = "Network";
    subCategory = normalizedText.includes("vpn") ? "VPN" : normalizedText.includes("wifi") ? "Wi-Fi" : normalizedText.includes("dns") || normalizedText.includes("gateway") ? "DNS / Gateway" : normalizedText.includes("firewall") ? "Firewall" : "Internet";
    knowledgeSource = subCategory === "VPN" ? "Corporate VPN Troubleshooting Guide (KB-NET-001)" : "Network Infrastructure & Gateway Troubleshooting (KB-NET-002)";
    suggestedSteps = [
      "Check your physical network cable (Ethernet) or verify Wi-Fi signal indicator.",
      "Restart your local network adapter or toggle Wi-Fi OFF and ON.",
      "Flush local DNS cache (ipconfig /flushdns or sudo dscacheutil -flushcache).",
      "Power cycle your router/modem and wait 60 seconds before reconnecting.",
      "Contact Network Operations Desk if wide-area ISP connectivity remains down."
    ];
  } else if (isSecurity) {
    category = "Security";
    subCategory = text.includes("phish") ? "Phishing" : text.includes("virus") || text.includes("malware") ? "Malware" : "Unauthorized Access";
    knowledgeSource = "SecOps Security Guidelines v3.4 (KB-SEC-002)";
    suggestedSteps = [
      "Do NOT click any links or download attachments from the suspicious message.",
      "Use the 'Report Phishing' button in Outlook to submit headers to SecOps.",
      "If you entered credentials, change your corporate password immediately via SSO portal.",
      "Disconnect your machine from Wi-Fi if unauthorized downloads occurred.",
      "SecOps will review message telemetry and quarantine threat vectors."
    ];
  } else if (isBilling) {
    category = "Billing";
    subCategory = text.includes("subscription") || text.includes("pricing") ? "Subscription" : text.includes("invoice") || text.includes("refund") || text.includes("overcharged") ? "Invoice" : "Payment Failure";
    knowledgeSource = "Subscription Checkout & Payment Gateway Protocol (KB-BIL-008)";
    suggestedSteps = [
      "Verify payment method details and ensure the card supports recurring online subscriptions.",
      "Try completing checkout in an Incognito / Private browsing window to eliminate stale session tokens.",
      "Ensure ad-blockers or browser privacy extensions are temporarily disabled on the checkout domain.",
      "If 'Error Code 404' occurs upon clicking 'Pay Now', capture the session URL and network payload.",
      "Contact Billing & Checkout Support with your account ID and invoice/order reference for immediate activation."
    ];
  } else if (isAuthentication) {
    category = "Authentication";
    subCategory = text.includes("password") || text.includes("reset password") ? "Password Reset" : text.includes("account locked") || text.includes("locked") ? "Account Locked" : text.includes("2fa") || text.includes("mfa") || text.includes("otp") ? "MFA / SSO" : "Login Issue";
    knowledgeSource = "SSO Login & Self-Service Password Reset (KB-AUTH-001)";
    suggestedSteps = [
      "Verify corporate username and email format (username@company.com).",
      "Check authenticator app time-sync and approve pending MFA notifications.",
      "Clear browser cookies, cache, and active sessions in incognito mode.",
      "Contact IT Support Desk if your account is locked due to consecutive failed attempts."
    ];
  } else if (isNetwork) {
    category = "Network";
    subCategory = text.includes("vpn") ? "VPN" : text.includes("wifi") ? "Wi-Fi" : text.includes("dns") || text.includes("gateway") ? "DNS / Gateway" : "Internet";
    knowledgeSource = "Corporate VPN Troubleshooting Guide (KB-NET-001)";
    suggestedSteps = [
      "Verify your local internet connection is active by loading a public webpage.",
      "Confirm the VPN server address matches 'vpn.company.com' in your client profile.",
      "Restart the Cisco AnyConnect / GlobalProtect VPN service.",
      "Check that port 443 and UDP 500/4500 are not restricted on your network.",
      "Clear cached VPN credentials and re-authenticate via company SSO."
    ];
  } else if (isEmail) {
    category = "Email";
    subCategory = text.includes("spam") ? "Spam" : text.includes("bounce") || text.includes("not receiving") ? "Delivery Failure" : text.includes("calendar") ? "Calendar Issue" : "Outlook Sync";
    knowledgeSource = "Outlook Sync & Mailbox Recovery Guide (KB-EML-006)";
    suggestedSteps = [
      "Verify Outlook connection status shows 'Connected to Microsoft Exchange'.",
      "Perform Send/Receive All Folders (F9) to force mailbox synchronization.",
      "Disable third-party COM add-ins and restart Outlook in Safe Mode.",
      "Re-build Outlook cached OST profile if synchronization errors persist."
    ];
  } else if (isHardware) {
    category = "Hardware";
    subCategory = text.includes("monitor") || text.includes("broken screen") ? "Monitor" : text.includes("mouse") || text.includes("keyboard") ? "Keyboard / Mouse" : text.includes("printer") ? "Printer" : "Laptop";
    knowledgeSource = "Hardware Lifecycle & Asset Support Desk (KB-HDW-004)";
    suggestedSteps = [
      "Inspect physical HDMI / DisplayPort / Thunderbolt cable connections.",
      "Power cycle the external monitor and verify input source channel.",
      "Check display resolution and refresh rate settings in system preferences.",
      "Update graphics display drivers or test with an alternate cable/dock."
    ];
  } else if (isSoftware) {
    category = "Software";
    subCategory = text.includes("crash") ? "Crash" : text.includes("license") ? "License Expired" : text.includes("install") ? "Installation" : "Application Error";
  }

  // -------------------------------------------------------------
  // 3. User Specified Keywords for Predicting the "Priority"
  // -------------------------------------------------------------
  const isP1 = [
    "down for everyone", "broken for everyone", "cannot access at all",
    "stopping work", "global outage", "all users", "completely down",
    "emergency", "ransomware", "data breach", "production down", "system down"
  ].some((k) => text.includes(k)) || (workBlocked && scope === "Entire department") || category === "Security";

  const hasP3Indicators = [
    "slow", "slowness", "lagging", "delay", "annoying", "sometimes",
    "intermittent", "workaround", "minor", "incorrectly", "not showing", "latency", "loading slowly"
  ].some((k) => text.includes(k));

  const hasP4Indicators = [
    "typo", "spelling", "color", "font", "alignment", "ui",
    "update text", "question", "how do i", "request", "suggestion", "future update"
  ].some((k) => text.includes(k));

  const hasP2Blockers = workBlocked || [
    "cannot login", "payment failed", "unable to", "important feature",
    "multiple users", "pay now", "checkout page", "error 404", "error 500", "locked out",
    "major", "broken", "stuck", "failed", "regression"
  ].some((k) => text.includes(k));

  let priority = "P3";
  let severity = "Medium";

  if (isP1) {
    priority = "P1";
    severity = "Critical";
  } else if (hasP2Blockers && !(hasP3Indicators && !workBlocked)) {
    priority = "P2";
    severity = "High";
  } else if (hasP4Indicators && !hasP2Blockers && !isP1) {
    priority = "P4";
    severity = "Low";
  } else if (hasP3Indicators) {
    priority = "P3";
    severity = "Medium";
  } else {
    priority = "P3";
    severity = "Medium";
  }

  const slaHours = priority === "P1" ? 1 : priority === "P2" ? 4 : priority === "P3" ? 24 : 48;

  return {
    success: true,
    category,
    sub_category: subCategory,
    severity,
    priority,
    confidence: 0.95,
    sla_hours: slaHours,
    response_minutes: priority === "P1" ? 15 : priority === "P2" ? 30 : 60,
    coverage: priority === "P1" || priority === "P2" ? "24/7" : "Business Hours",
    team: `${category} Support`,
    knowledge_source: knowledgeSource,
    suggested_resolution: suggestedSteps,
    citations: [
      {
        citation_id: `CIT-${category.toUpperCase().slice(0, 3)}-001`,
        source_title: knowledgeSource,
        section: "Standard Troubleshooting §1.0",
        quote: suggestedSteps[0] || "Follow standard troubleshooting guidelines.",
        score: 4.2
      }
    ],
    classification_path: "AI Engine (Standard Rules)",
    reason: `Classified as ${category} → ${subCategory} (${priority}).`
  };
};


const getSLAHours = (priority) => {
  switch (priority) {
    case "P1":
    case "High":
    case "Critical":
      return 4;
    case "P2":
      return 8;
    case "P3":
    case "Medium":
      return 24;
    case "P4":
    case "Low":
      return 48;
    default:
      return 24;
  }
};

const getAvailableAgent = (team = "IT Support") => {
  const users = storage.get(
    STORAGE_KEYS.users,
    seedUsers
  );

  const agents = users.filter(
    (user) =>
      ["agent", "Agent", "Engineer", "Lead"].includes(user.role) &&
      user.status === "Active"
  );

  if (!agents.length) {
    return null;
  }

  const tickets = getTickets();

  const counts = agents.map((agent) => {
    const activeTickets = tickets.filter(
      (ticket) =>
        ticket.assignedTo === agent.id &&
        !["Resolved", "Closed"].includes(ticket.status)
    ).length;

    return {
      agent,
      activeTickets,
    };
  });

  counts.sort(
    (a, b) => a.activeTickets - b.activeTickets
  );

  return counts[0].agent;
};

export const createTicket = async (form, user) => {
  const tickets = getTickets();
  const ticketId = generateTicketId(tickets);

  const rawSubject = form.subject || form.title || "Support Request";
  const rawDesc = form.description || "";

  let classification = form.aiClassification || null;
  if (!classification || !classification.category || classification.category === "—") {
    try {
      classification = await classifyTicket(
        rawSubject,
        rawDesc,
        form.scope || "Just me",
        Boolean(form.workBlocked)
      );
    } catch (e) {
      console.warn("[TicketService] Classification error during createTicket:", e);
    }
  }

  const category = form.category || classification?.category || "General";
  const subCategory = form.subCategory || classification?.subCategory || "General";
  const department = form.department || getDepartmentForCategory(category);
  const severity = form.severity || classification?.severity || "Medium";
  const priority = form.priority || classification?.priority || "P3";
  const slaHours = form.slaHours || classification?.slaHours || getSLAHours(priority);

  const createdAt = new Date();
  const slaDueAt = new Date(
    createdAt.getTime() +
      slaHours * 60 * 60 * 1000
  );

  const customerId = user?.id ? String(user.id) : "USR-003";
  const customerName = user?.name || user?.username || "Customer";
  const customerEmail = user?.email || (user?.username?.includes("@") ? user.username : `${user?.username || "customer"}@gmail.com`);

  // Persist directly to Django backend
  let backendTicket = null;
  try {
    const res = await api.post("/tickets/", {
      subject: rawSubject,
      title: rawSubject,
      description: rawDesc,
      category,
      department,
      sub_category: subCategory,
      severity,
      priority,
      attachment: form.attachments?.[0] || null,
    });
    if (res?.data) {
      backendTicket = res.data;
    }
  } catch (err) {
    try {
      const res = await api.post("/support/tickets/", {
        subject: rawSubject,
        title: rawSubject,
        description: rawDesc,
        category,
        department,
        sub_category: subCategory,
        severity,
        priority,
      });
      if (res?.data) backendTicket = res.data;
    } catch (e2) {
      console.warn("[TicketService] Backend create ticket error, using offline store:", err.message);
    }
  }

  const finalId = backendTicket?.id != null ? backendTicket.id : ticketId;
  const finalTicketNumber = backendTicket?.ticket_number || backendTicket?.ticketNumber || (typeof finalId === "number" ? `TKT-${1000 + finalId}` : ticketId);

  // Auto-assign available regular agent if backend didn't already stamp assignment
  const autoAssigned = (!backendTicket?.assigned_to && !backendTicket?.assignedAgentName)
    ? autoAssignDepartmentAgent(department, category)
    : null;

  const ticket = {
    id: finalId,
    ticketNumber: finalTicketNumber,
    ticket_number: finalTicketNumber,
    title: rawSubject,
    subject: rawSubject,
    description: rawDesc,
    category,
    subCategory,
    severity,
    priority,
    status: backendTicket?.status || (autoAssigned ? "ASSIGNED" : "OPEN"),

    customerId: backendTicket?.customerId != null ? backendTicket.customerId : customerId,
    customerName: backendTicket?.customerName || customerName,
    customerEmail: backendTicket?.customerEmail || customerEmail,

    department: backendTicket?.department || department,
    location: form.location || "",
    assetTag: form.assetTag || "",
    affectedSystem: form.affectedSystem || "",
    startedWhen: form.startedWhen || "Today",
    scope: form.scope || "Just me",
    workBlocked: form.workBlocked || false,
    urgency: form.urgency || "Medium",
    workaround: form.workaround || "No",
    contactPreference: form.contactPreference || "Email",
    bestTime: form.bestTime || "",
    attachments: form.attachments || [],

    assignedTo: backendTicket?.assigned_to || autoAssigned?.id || null,
    assignedAgent: backendTicket?.assignedAgentName || backendTicket?.assignedAgent || autoAssigned?.name || "Unassigned",
    assignedAgentName: backendTicket?.assignedAgentName || backendTicket?.assignedAgent || autoAssigned?.name || "Unassigned",
    assignedAgentId: backendTicket?.assignedAgentId || backendTicket?.assigned_to || autoAssigned?.id || null,
    assignedAgentDepartment: backendTicket?.assignedAgentDepartment || autoAssigned?.rawDepartment || null,
    assignedAgentTitle: backendTicket?.assignedAgentTitle || autoAssigned?.title || null,
    assignedAgentAvailability: backendTicket?.assignedAgentAvailability || autoAssigned?.availabilityStatus || null,
    team: classification?.team || "Support",

    createdAt: backendTicket?.created_at || backendTicket?.createdAt || createdAt.toISOString(),
    updatedAt: backendTicket?.updated_at || backendTicket?.updatedAt || createdAt.toISOString(),
    slaHours,
    slaDueAt: slaDueAt.toISOString(),

    knowledgeRetrieved: true,
    knowledgeSource: form.knowledgeSource || classification?.knowledgeSource || "Enterprise Knowledge Store",

    ai: {
      categoryConfidence: form.confidence || classification?.confidence || 0.95,
      severityConfidence: Math.min(0.96, (form.confidence || classification?.confidence || 0.95) - 0.04),
      classificationPath: form.classificationPath || classification?.classificationPath || "AI Engine",
      severity,
      suggestedResolution: form.suggestedResolution || classification?.suggestedResolution || [
        "Review instructions in knowledge base documentation.",
        "Check network and system connectivity status.",
        "Restart affected application or hardware device.",
        "Contact IT administrator if the issue persists."
      ],
    },

    timeline: [
      {
        id: Date.now(),
        type: "created",
        title: "Ticket created",
        description: "Submitted and ingested into SupportPilot queue.",
        timestamp: createdAt.toISOString(),
      },
      {
        id: Date.now() + 1,
        type: "classified",
        title: "AI Classified & Categorized",
        description: `Predicted Category: ${category}, Severity: ${severity}, Priority: ${priority}.`,
        timestamp: new Date(createdAt.getTime() + 1000).toISOString(),
      },
      {
        id: Date.now() + 2,
        type: "rag",
        title: "AI Automated Resolution Guide Ready",
        description: `Knowledge retrieved from: ${classification?.knowledgeSource || "Enterprise Knowledge Store"}.`,
        timestamp: new Date(createdAt.getTime() + 2000).toISOString(),
      },
    ],

    comments: [],
    replies: backendTicket?.replies || [],
  };

  const remaining = tickets.filter((t) => t && String(t.id) !== String(ticket.id) && String(t.ticketNumber) !== String(ticket.ticketNumber));
  remaining.unshift(ticket);
  saveTickets(remaining);

  return ticket;
};

export const updateTicket = (
  ticketId,
  updates
) => {
  const tickets = getTickets();
  const searchId = String(ticketId).trim().toLowerCase();
  const cleanDigits = searchId.replace(/\D/g, "");

  let index = tickets.findIndex((t) => {
    if (!t) return false;
    const tId = String(t.id || "").trim().toLowerCase();
    const tNum = String(t.ticketNumber || t.ticket_number || "").trim().toLowerCase();
    const tDigits = tId.replace(/\D/g, "") || tNum.replace(/\D/g, "");
    return (
      tId === searchId ||
      tNum === searchId ||
      (cleanDigits && tDigits === cleanDigits) ||
      (tId && searchId.includes(tId))
    );
  });

  if (index === -1) {
    console.warn(`[ticketService] Ticket ${ticketId} not found, skipping ghost creation.`);
    return null;
  }

  const ticket = tickets[index];

  const newTimeline = [...(ticket.timeline || [])];

  if (updates.timelineEvent) {
    newTimeline.push({
      id: Date.now(),
      ...updates.timelineEvent,
      timestamp: new Date().toISOString(),
    });
  } else if (
    updates.status &&
    updates.status !== ticket.status
  ) {
    newTimeline.push({
      id: Date.now(),
      type: "status",
      title: `Ticket moved to ${updates.status}`,
      description: getStatusDescription(updates.status),
      timestamp: new Date().toISOString(),
    });
  }

  const updatedTicket = {
    ...ticket,
    ...updates,
    timeline: newTimeline,
    updatedAt: new Date().toISOString(),
  };

  delete updatedTicket.timelineEvent;

  tickets[index] = updatedTicket;
  saveTickets(tickets);

  // Sync status to backend API safely
  if (updates.status) {
    updateTicketStatusApi(ticketId, updates.status).catch((e) => {
      console.warn("[ticketService] updateTicketStatusApi notice:", e?.message);
    });
  }

  return updatedTicket;
};

const getStatusDescription = (status) => {
  switch (status) {
    case "NEW":
    case "Open":
      return "Your ticket is received and queued for review.";
    case "CLASSIFIED":
      return "AI has completed category, severity, and priority scoring.";
    case "AI_RESOLUTION_READY":
      return "AI has generated contextual troubleshooting steps from the knowledge base.";
    case "In Progress":
      return "An agent is actively working on your ticket.";
    case "Pending":
      return "Waiting for customer response or external verification.";
    case "Resolved":
      return "Issue has been verified and marked as resolved.";
    case "Closed":
      return "This ticket is closed.";
    default:
      return "Ticket status was updated.";
  }
};

export const addComment = (
  ticketId,
  comment
) => {
  const ticket = getTicketById(ticketId);

  const newComment = {
    id: comment.id || Date.now(),
    ...comment,
    timestamp: comment.timestamp || comment.created_at || new Date().toISOString(),
  };

  if (!ticket) {
    return newComment;
  }

  const existingComments = Array.isArray(ticket.comments) ? ticket.comments : [];
  const comments = [...existingComments, newComment];

  // Only sync to backend if not already dispatched by an API call
  if (!comment._skipBackendSync) {
    try {
      api.post(`/tickets/${ticketId}/reply/`, {
        message: comment.message || comment.text || "",
        attachment: comment.attachment || null,
        is_internal: Boolean(comment.is_internal || comment.isInternal),
      }).catch(() => {
        api.post(`/support/tickets/${ticketId}/reply/`, {
          message: comment.message || comment.text || "",
        }).catch(() => {});
      });
    } catch (e) {}
  }

  return updateTicket(ticketId, {
    comments,
  });
};

/* =====================================================
   REST API DIRECT CLIENT METHODS
===================================================== */

export const createTicketApi = async (formData) => {
  try {
    const category = formData.category || "General";
    const department = formData.department || getDepartmentForCategory(category);
    const res = await api.post("/tickets/", {
      subject: formData.subject || formData.title,
      title: formData.subject || formData.title,
      description: formData.description,
      category,
      department,
      priority: formData.priority,
      severity: formData.severity,
      attachment: formData.attachment || null,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[ticketService] Direct API create error, using offline store:", err.message);
  }
  return null;
};

export const fetchMyTicketsApi = async () => {
  try {
    const res = await api.get("/tickets/my/");
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch (err) {
    console.warn("[ticketService] fetchMyTicketsApi notice:", err.message);
  }
  return null;
};

export const fetchAgentTicketsApi = async (params = {}) => {
  try {
    const res = await api.get("/agent/tickets/", { params });
    if (res?.data && Array.isArray(res.data)) {
      return res.data.map((t) => {
        const agName = t.assignedAgent || t.assignedAgentName;
        const cleanAgName = agName && agName !== "Unassigned" ? agName : null;
        return {
          ...t,
          assignedAgent: cleanAgName,
          assignedAgentName: cleanAgName,
          assignedAgentId: t.assignedAgentId ?? t.assigned_to ?? null,
        };
      });
    }
  } catch (err) {
    console.warn("[ticketService] fetchAgentTicketsApi notice:", err.message);
  }
  return null;
};

export const fetchTicketByIdApi = async (id) => {
  try {
    const res = await api.get(`/tickets/${id}/`);
    if (res?.data) {
      const t = res.data;
      const agName = t.assignedAgent || t.assignedAgentName;
      const cleanAgName = agName && agName !== "Unassigned" ? agName : null;
      const processedTicket = {
        ...t,
        assignedAgent: cleanAgName,
        assignedAgentName: cleanAgName,
        assignedAgentId: t.assignedAgentId ?? t.assigned_to ?? null,
      };

      // Cache into local storage so offline/subsequent lookups work seamlessly
      try {
        const stored = getTickets();
        const existsIndex = stored.findIndex(
          (item) =>
            String(item.id) === String(processedTicket.id) ||
            String(item.ticketNumber || item.ticket_number) === String(processedTicket.ticket_number || processedTicket.ticketNumber)
        );
        if (existsIndex >= 0) {
          stored[existsIndex] = { ...stored[existsIndex], ...processedTicket };
          saveTickets([...stored]);
        } else {
          saveTickets([processedTicket, ...stored]);
        }
      } catch (cacheErr) {
        console.warn("[ticketService] Cache ticket update error:", cacheErr);
      }

      return processedTicket;
    }
  } catch (err) {
    if (err?.response?.status === 403) {
      throw err;
    }
    console.warn("[ticketService] fetchTicketByIdApi notice:", err.message);
  }
  return null;
};

export const autoAssignTicketsApi = async (ticketId = null) => {
  try {
    const endpoint = ticketId ? `/tickets/${ticketId}/auto-assign/` : "/tickets/auto-assign/";
    const res = await api.post(endpoint, ticketId ? { ticket_id: ticketId } : {});
    return res?.data;
  } catch (err) {
    console.warn("[ticketService] autoAssignTicketsApi notice:", err.message);
    return null;
  }
};

export const updateTicketStatusApi = async (id, newStatus) => {
  try {
    const res = await api.patch(`/tickets/${id}/status/`, { status: newStatus });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[ticketService] updateTicketStatusApi notice:", err.message);
  }
  return null;
};

export const fetchUsersApi = async () => {
  try {
    const res = await api.get("/users/");
    if (res?.data && Array.isArray(res.data)) {
      return res.data.filter((u) => !isUserDeleted(u));
    }
  } catch (err) {
    console.warn("[ticketService] fetchUsersApi notice:", err.message);
  }
  return [];
};

export const fetchAgentsApi = async (params = {}) => {
  try {
    const res = await api.get("/agent/list/", { params });
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data.filter((a) => !isUserDeleted(a));
    }
  } catch (err) {
    console.warn("[ticketService] fetchAgentsApi notice:", err.message);
  }
  let agents = seedUsers.filter((u) => ["Agent", "Support Agent", "Employee"].includes(u.role) && !isUserDeleted(u));
  if (params.department) {
    const deptQuery = params.department.toLowerCase().replace(" department", "").trim();
    agents = agents.filter((a) => (a.department || "").toLowerCase().includes(deptQuery));
  }
  return agents.filter((a) => !isUserDeleted(a));
};

export const updateAgentAvailabilityApi = async (status, agentId = null, agentEmail = null) => {
  try {
    const url = agentId ? `/agent/${agentId}/availability/` : `/agent/availability/`;
    const res = await api.patch(url, {
      availability_status: status,
      agent_id: agentId,
      email: agentEmail,
    });
    return res?.data || { availability_status: status };
  } catch (err) {
    console.warn("[ticketService] updateAgentAvailabilityApi fallback:", err.message);
    return { availability_status: status };
  }
};

export const syncTicketToBackendApi = async (localTicket) => {
  if (!localTicket) return null;
  try {
    const rawSubject = localTicket.title || localTicket.subject || "Support Ticket";
    const rawDesc = localTicket.description || localTicket.subject || "Issue reported by customer";
    const res = await api.post("/tickets/", {
      subject: rawSubject,
      title: rawSubject,
      description: rawDesc,
      category: localTicket.category || "General",
      sub_category: localTicket.subCategory || localTicket.sub_category || "General",
      severity: localTicket.severity || "Medium",
      priority: localTicket.priority || "P3",
      attachment: localTicket.attachment || null,
    });
    if (res?.data) {
      const backendTicket = res.data;
      const stored = getTickets();
      const idx = stored.findIndex(
        (t) =>
          t &&
          (String(t.id) === String(localTicket.id) ||
            String(t.ticketNumber) === String(localTicket.ticketNumber || localTicket.ticket_number))
      );
      if (idx >= 0) {
        stored[idx] = {
          ...stored[idx],
          ...backendTicket,
          id: backendTicket.id,
          ticketNumber: backendTicket.ticket_number,
          ticket_number: backendTicket.ticket_number,
        };
        saveTickets(stored);
      }
      return backendTicket;
    }
  } catch (err) {
    console.warn("[ticketService] syncTicketToBackendApi error:", err?.message);
  }
  return null;
};

export const addTicketReplyApi = async (id, message, attachment = null, isInternal = false) => {
  if (!id || !message) return null;

  try {
    let res = null;
    try {
      res = await api.post(`/tickets/${id}/reply/`, {
        message,
        attachment,
        is_internal: isInternal,
      });
    } catch (postErr) {
      // If 404 Not Found, ticket might only exist locally in browser storage
      if (postErr?.response?.status === 404) {
        const localTicket = getTicketById(id);
        if (localTicket) {
          const synced = await syncTicketToBackendApi(localTicket);
          if (synced) {
            const newLookup = synced.ticket_number || synced.id;
            res = await api.post(`/tickets/${newLookup}/reply/`, {
              message,
              attachment,
              is_internal: isInternal,
            });
          }
        }
      }
      if (!res) throw postErr;
    }

    if (res?.data) {
      const reply = res.data;
      try {
        addComment(id, {
          id: reply.id,
          author: reply.author_name,
          authorRole: reply.author_role,
          message: reply.message,
          attachment: reply.attachment,
          timestamp: reply.created_at,
          created_at: reply.created_at,
          _skipBackendSync: true,
        });
      } catch (e) {}
      return res.data;
    }
  } catch (err) {
    console.warn("[ticketService] addTicketReplyApi notice:", err.message);
  }
  return null;
};

export const assignTicketApi = async (id, agentId = null, agentName = null) => {
  try {
    const res = await api.patch(`/tickets/${id}/assign/`, {
      agent_id: agentId,
      agent_name: agentName,
    });
    if (res?.data) {
      updateTicket(id, {
        assigned_to: res.data.assigned_to,
        assignedAgent: res.data.assignedAgentName || agentName,
        assignedAgentName: res.data.assignedAgentName || agentName,
        assignedAgentId: res.data.assignedAgentId || agentId,
        assignedAgentDepartment: res.data.assignedAgentDepartment || null,
        assignedAgentTitle: res.data.assignedAgentTitle || null,
        assignedAgentAvailability: res.data.assignedAgentAvailability || null,
        status: res.data.status || "ASSIGNED",
      });
      return res.data;
    }
  } catch (err) {
    console.warn("[ticketService] assignTicketApi notice:", err.message);
    const errorMsg = err?.response?.data?.error || err?.response?.data?.detail || err.message;
    throw new Error(errorMsg);
  }
  return null;
};

export const deleteTicketApi = async (id) => {
  try {
    const res = await api.delete(`/tickets/${id}/`);
    return res?.data || true;
  } catch (err) {
    console.warn("[ticketService] deleteTicketApi notice:", err?.message);
    return false;
  }
};

export const isTeamLeadAgent = (userOrAgent) => {
  if (!userOrAgent) return false;
  if (userOrAgent.isTeamLead === true || userOrAgent.is_team_lead === true) return true;
  const role = String(userOrAgent.role || "").toLowerCase();
  if (role.includes("lead") || role.includes("manager") || role.includes("admin") || role.includes("supervisor")) return true;
  const title = String(userOrAgent.title || "").toLowerCase();
  if (title.includes("lead") || title.includes("manager") || title.includes("supervisor") || title.includes("director") || title.includes("head")) return true;
  const email = String(userOrAgent.email || "").toLowerCase().trim();
  if (email === "agent@gmail.com" || email === "admin@gmail.com" || email === "manager@gmail.com" || email.startsWith("agent@") || email.startsWith("lead@")) return true;
  const username = String(userOrAgent.username || "").toLowerCase().trim();
  if (username === "agent" || username === "admin" || username === "manager") return true;
  return false;
};

export const autoAssignDepartmentAgent = (departmentName, category = null) => {
  const allAgents = getDepartmentAgentsList();

  // Normalize target department
  let targetDept = "IT";
  const raw = String(departmentName || "").toLowerCase();
  if (raw.includes("hr") || raw.includes("human") || raw.includes("payroll")) targetDept = "HR";
  else if (raw.includes("fin") || raw.includes("pay") || raw.includes("bill")) targetDept = "Finance";
  else targetDept = "IT";

  // Filter department agents
  const deptAgents = allAgents.filter((ag) => ag.department === targetDept);

  // STRICT RULE: Exclude Team Leads and Admins/Managers from automatic assignment
  const regularAgents = deptAgents.filter((ag) => !isTeamLeadAgent(ag));

  // Filter for available agents only
  const availableAgents = regularAgents.filter((ag) => {
    const status = (ag.availabilityStatus || ag.availability_status || "AVAILABLE").toUpperCase();
    return status === "AVAILABLE";
  });

  // If no regular agents are available, return null (ticket stays Unassigned for manager review)
  if (availableAgents.length === 0) {
    return null;
  }

  // Workload balancing across available regular agents
  const allTickets = getTickets();
  const candidatesWithCounts = availableAgents.map((ag) => {
    const activeTicketCount = allTickets.filter((t) => {
      if (!t) return false;
      const isClosed = ["resolved", "closed", "auto_resolved"].includes(String(t.status || "").toLowerCase());
      if (isClosed) return false;
      const assigned = String(t.assignedTo || t.assignedAgentId || t.assignedAgent || "").toLowerCase();
      return (
        assigned === String(ag.id).toLowerCase() ||
        assigned === String(ag.email).toLowerCase() ||
        assigned === String(ag.name).toLowerCase()
      );
    }).length;
    return { agent: ag, count: activeTicketCount };
  });

  // Sort by lowest active tickets
  candidatesWithCounts.sort((a, b) => a.count - b.count);
  return candidatesWithCounts[0].agent;
};

export const getDeletedUserIdentifiers = () => {
  const list = storage.get(STORAGE_KEYS.deletedUsers, []);
  if (!Array.isArray(list)) return new Set();
  const set = new Set();
  list.forEach((item) => {
    if (item != null) {
      set.add(String(item).toLowerCase().trim());
    }
  });
  return set;
};

export const isUserDeleted = (userOrIdentifier) => {
  if (!userOrIdentifier) return false;
  const deletedSet = getDeletedUserIdentifiers();
  if (typeof userOrIdentifier === "object") {
    const id = userOrIdentifier.id != null ? String(userOrIdentifier.id).toLowerCase().trim() : "";
    const email = userOrIdentifier.email ? String(userOrIdentifier.email).toLowerCase().trim() : "";
    const username = userOrIdentifier.username ? String(userOrIdentifier.username).toLowerCase().trim() : "";
    if (id && deletedSet.has(id)) return true;
    if (email && deletedSet.has(email)) return true;
    if (username && deletedSet.has(username)) return true;
    return false;
  }
  return deletedSet.has(String(userOrIdentifier).toLowerCase().trim());
};

export const deleteUserEverywhere = async (userOrIdOrEmail) => {
  let targetId = null;
  let targetEmail = null;
  let targetUsername = null;
  let targetName = null;

  if (typeof userOrIdOrEmail === "object" && userOrIdOrEmail !== null) {
    targetId = userOrIdOrEmail.id != null ? String(userOrIdOrEmail.id).trim() : null;
    targetEmail = userOrIdOrEmail.email ? String(userOrIdOrEmail.email).trim() : null;
    targetUsername = userOrIdOrEmail.username ? String(userOrIdOrEmail.username).trim() : null;
    targetName = userOrIdOrEmail.name ? String(userOrIdOrEmail.name).trim() : null;
  } else {
    const val = String(userOrIdOrEmail).trim();
    if (val.includes("@")) {
      targetEmail = val;
    } else if (/^\d+$/.test(val) || val.startsWith("USR-")) {
      targetId = val;
    } else {
      targetUsername = val;
    }
  }

  // Find matching user in storage to get complete details
  const storedUsers = storage.get(STORAGE_KEYS.users, []);
  const matched = storedUsers.find((u) => {
    if (!u) return false;
    const uId = u.id != null ? String(u.id).toLowerCase() : "";
    const uEmail = u.email ? String(u.email).toLowerCase() : "";
    const uUser = u.username ? String(u.username).toLowerCase() : "";
    if (targetId && uId === targetId.toLowerCase()) return true;
    if (targetEmail && uEmail === targetEmail.toLowerCase()) return true;
    if (targetUsername && uUser === targetUsername.toLowerCase()) return true;
    return false;
  });

  if (matched) {
    targetId = targetId || matched.id;
    targetEmail = targetEmail || matched.email;
    targetUsername = targetUsername || matched.username;
    targetName = targetName || matched.name;
  }

  // 1. Call Backend API to permanently delete user in Django database
  const deleteKey = targetId || targetEmail || targetUsername;
  if (deleteKey) {
    try {
      await api.delete(`/users/${encodeURIComponent(deleteKey)}/`);
    } catch (apiErr) {
      try {
        await api.delete(`/auth/users/${encodeURIComponent(deleteKey)}/`);
      } catch (e2) {
        console.warn("[ticketService] Backend delete user notice:", apiErr.message);
      }
    }
  }

  // 2. Add all identifiers to STORAGE_KEYS.deletedUsers so they are permanently ignored
  const currentDeleted = storage.get(STORAGE_KEYS.deletedUsers, []);
  const updatedDeletedSet = new Set(currentDeleted.map((x) => String(x).toLowerCase().trim()));
  if (targetId) updatedDeletedSet.add(String(targetId).toLowerCase().trim());
  if (targetEmail) updatedDeletedSet.add(String(targetEmail).toLowerCase().trim());
  if (targetUsername) updatedDeletedSet.add(String(targetUsername).toLowerCase().trim());
  if (targetName) updatedDeletedSet.add(String(targetName).toLowerCase().trim());
  storage.set(STORAGE_KEYS.deletedUsers, Array.from(updatedDeletedSet));

  // 3. Remove user from STORAGE_KEYS.users
  const updatedUsers = storedUsers.filter((u) => {
    if (!u) return false;
    const uId = u.id != null ? String(u.id).toLowerCase() : "";
    const uEmail = u.email ? String(u.email).toLowerCase() : "";
    const uUser = u.username ? String(u.username).toLowerCase() : "";
    if (targetId && uId === targetId.toLowerCase()) return false;
    if (targetEmail && uEmail === targetEmail.toLowerCase()) return false;
    if (targetUsername && uUser === targetUsername.toLowerCase()) return false;
    return true;
  });
  storage.set(STORAGE_KEYS.users, updatedUsers);

  // 4. Unassign any tickets assigned to this deleted user
  const tickets = getTickets();
  let ticketsModified = false;
  const cleanedTickets = tickets.map((t) => {
    if (!t) return t;
    const assignedId = String(t.assignedTo || t.assignedAgentId || "").toLowerCase();
    const assignedName = String(t.assignedAgent || t.assignedAgentName || "").toLowerCase();
    const isAssignedToUser = (
      (targetId && (assignedId === targetId.toLowerCase() || assignedName.includes(targetId.toLowerCase()))) ||
      (targetEmail && (assignedId === targetEmail.toLowerCase() || assignedName.includes(targetEmail.toLowerCase()))) ||
      (targetUsername && (assignedId === targetUsername.toLowerCase() || assignedName.includes(targetUsername.toLowerCase()))) ||
      (targetName && assignedName === targetName.toLowerCase())
    );

    if (isAssignedToUser) {
      ticketsModified = true;
      return {
        ...t,
        assignedTo: null,
        assignedAgent: "Unassigned",
        assignedAgentName: "Unassigned",
        assignedAgentId: null,
        assignedAgentDepartment: null,
        assignedAgentTitle: null,
        assignedAgentAvailability: null,
        status: ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status) ? t.status : "OPEN",
      };
    }
    return t;
  });

  if (ticketsModified) {
    saveTickets(cleanedTickets);
  }

  // 5. Broadcast global events so all components, sidebars, switchers and manager queues instantly update
  window.dispatchEvent(new CustomEvent("supportpilot_users_changed", { detail: updatedUsers }));
  window.dispatchEvent(new CustomEvent("supportpilot_user_deleted", { detail: { id: targetId, email: targetEmail, username: targetUsername, name: targetName } }));
  window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: cleanedTickets }));

  return { success: true, deleted: { id: targetId, email: targetEmail, username: targetUsername } };
};

export const getDepartmentAgentsList = () => {
  const users = storage.get(STORAGE_KEYS.users, seedUsers);
  const deletedSet = getDeletedUserIdentifiers();

  // Combine seedUsers with stored users to ensure all agents are present
  const userMap = new Map();

  seedUsers.forEach((u) => {
    if (isUserDeleted(u)) return;
    const r = String(u.role || "").toLowerCase();
    if (r === "agent" || r.includes("agent") || r.includes("engineer") || r.includes("lead") || r === "admin") {
      userMap.set(u.email.toLowerCase(), { ...u });
    }
  });

  if (Array.isArray(users)) {
    users.forEach((u) => {
      if (!u || !u.email || isUserDeleted(u)) return;
      const r = String(u.role || "").toLowerCase();
      if (r === "agent" || r.includes("agent") || r.includes("engineer") || r.includes("lead") || r === "admin") {
        const key = u.email.toLowerCase();
        const existing = userMap.get(key) || {};
        userMap.set(key, { ...existing, ...u });
      }
    });
  }

  const deptColors = {
    IT: { badge: "IT", color: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40", avatar: "bg-gradient-to-br from-blue-600 to-cyan-500" },
    HR: { badge: "HR", color: "bg-purple-500/20 text-purple-300 border-purple-400/40", avatar: "bg-gradient-to-br from-purple-600 to-pink-500" },
    Finance: { badge: "FIN", color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40", avatar: "bg-gradient-to-br from-emerald-600 to-teal-500" },
    Admin: { badge: "ADMIN", color: "bg-amber-500/20 text-amber-300 border-amber-400/40", avatar: "bg-gradient-to-br from-amber-500 to-orange-600" },
  };

  return Array.from(userMap.values())
    .filter((u) => u.status !== "Inactive" && !isUserDeleted(u))
    .map((u) => {
      let dept = "IT";
      const rawDept = String(u.department || "").toLowerCase();
      const rawRole = String(u.role || "").toLowerCase();
      if (rawRole === "admin" || rawDept.includes("admin")) {
        dept = "Admin";
      } else if (rawDept.includes("hr") || rawDept.includes("human") || rawDept.includes("payroll")) {
        dept = "HR";
      } else if (rawDept.includes("fin") || rawDept.includes("pay") || rawDept.includes("bill")) {
        dept = "Finance";
      } else {
        dept = "IT";
      }

      const conf = deptColors[dept] || deptColors.IT;
      const isLead = isTeamLeadAgent(u);

      return {
        id: u.id,
        name: u.name || u.username || "Support Agent",
        email: u.email,
        role: u.role || (dept === "Admin" ? "Admin" : "Agent"),
        department: dept,
        rawDepartment: u.department || (dept === "Admin" ? "System Administration" : `${dept} Department`),
        title: u.title || (dept === "Admin" ? "System Administrator" : `${dept} Support Specialist`),
        specialty: u.specialty || u.title || u.team || (dept === "Admin" ? "Full System & Security Access" : `${dept} Operations`),
        deptBadge: conf.badge,
        badgeColor: conf.color,
        avatarBg: conf.avatar,
        availabilityStatus: u.availabilityStatus || u.availability_status || "AVAILABLE",
        isTeamLead: isLead,
        is_team_lead: isLead,
      };
    });
};




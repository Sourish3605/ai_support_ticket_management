import { seedTickets, seedUsers } from "../data/seedData.js";
import { storage, STORAGE_KEYS } from "./storageService.js";
import { api } from "./api.js";



export const getTickets = () => {
  try {
    return storage.get(STORAGE_KEYS.tickets, seedTickets) || seedTickets;
  } catch {
    return seedTickets;
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

  return tickets.find((ticket) => {
    if (!ticket) return false;
    const tId = String(ticket.id || "").trim().toLowerCase();
    const tNum = String(ticket.ticketNumber || ticket.ticket_number || "").trim().toLowerCase();
    const tDigits = tId.replace(/\D/g, "") || tNum.replace(/\D/g, "");

    return (
      tId === searchId ||
      tNum === searchId ||
      (cleanDigits && tDigits === cleanDigits) ||
      (tId && searchId.includes(tId))
    );
  }) || null;
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
  const severity = form.severity || classification?.severity || "Medium";
  const priority = form.priority || classification?.priority || "P3";
  const slaHours = form.slaHours || classification?.slaHours || getSLAHours(priority);

  const createdAt = new Date();
  const slaDueAt = new Date(
    createdAt.getTime() +
      slaHours * 60 * 60 * 1000
  );

  // Automatic assignment
  const agent = getAvailableAgent(classification?.team);

  const customerId = user?.id ? String(user.id) : "USR-003";
  const customerName = user?.name || user?.username || "Customer";
  const customerEmail = user?.email || (user?.username?.includes("@") ? user.username : `${user?.username || "customer"}@gmail.com`);

  const ticket = {
    id: ticketId,
    title: rawSubject,
    subject: rawSubject,
    description: rawDesc,
    category,
    subCategory,
    severity,
    priority,
    status: "AI_RESOLUTION_READY",

    customerId,
    customerName,
    customerEmail,

    department: form.department || user?.department || "IT support",
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

    assignedTo: agent?.id || null,
    assignedAgent: agent?.name || "Unassigned",
    team: agent?.team || classification?.team || "IT Support",

    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
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

      ...(agent
        ? [
            {
              id: Date.now() + 3,
              type: "assigned",
              title: "Ticket assigned",
              description: `Assigned to ${agent.name} (${classification?.team || "IT Support"}).`,
              timestamp: new Date(createdAt.getTime() + 3000).toISOString(),
            },
          ]
        : []),
    ],

    comments: [],
  };

  tickets.unshift(ticket);
  saveTickets(tickets);

  // Asynchronously persist ticket to backend PostgreSQL database
  try {
    api.post("/support/tickets/", {
      title: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      sub_category: ticket.subCategory,
      severity: ticket.severity,
      priority: ticket.priority,
      department: ticket.department || "IT support",
      scope: ticket.scope || "Just me",
      work_blocked: Boolean(ticket.workBlocked),
      customer_email: ticket.customerEmail,
      customer_name: ticket.customerName,
    }).then((res) => {
      if (res?.data?.id) {
        console.log(`[DB Sync] Ticket #${res.data.id} persisted to PostgreSQL database.`);
      }
    }).catch((syncErr) => {
      console.warn("[DB Sync Notice] Backend database sync:", syncErr?.message);
    });
  } catch (e) {
    console.warn("[DB Sync Error]:", e);
  }

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

  const ticket = index !== -1 ? tickets[index] : { id: ticketId, status: "NEW", ...updates };

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

  if (index !== -1) {
    tickets[index] = updatedTicket;
  } else {
    tickets.unshift(updatedTicket);
  }
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

  if (!ticket) {
    throw new Error("Ticket not found");
  }

  const comments = [
    ...ticket.comments,
    {
      id: Date.now(),
      ...comment,
      timestamp: new Date().toISOString(),
    },
  ];

  // Also push to backend if available
  try {
    api.post(`/tickets/${ticketId}/reply/`, {
      message: comment.message || comment.text || "",
      attachment: comment.attachment || null,
      is_internal: Boolean(comment.is_internal || comment.isInternal),
    }).catch(() => {
      // Fallback endpoint
      api.post(`/support/tickets/${ticketId}/reply/`, {
        message: comment.message || comment.text || "",
      }).catch(() => {});
    });
  } catch (e) {}

  return updateTicket(ticketId, {
    comments,
  });
};

/* =====================================================
   REST API DIRECT CLIENT METHODS
===================================================== */

export const createTicketApi = async (formData) => {
  try {
    const res = await api.post("/tickets/", {
      subject: formData.subject || formData.title,
      title: formData.subject || formData.title,
      description: formData.description,
      category: formData.category,
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
    if (res?.data && Array.isArray(res.data)) return res.data;
  } catch (err) {
    console.warn("[ticketService] fetchAgentTicketsApi notice:", err.message);
  }
  return null;
};

export const fetchTicketByIdApi = async (id) => {
  try {
    const res = await api.get(`/tickets/${id}/`);
    if (res?.data) return res.data;
  } catch (err) {
    if (err?.response?.status === 403) {
      throw err;
    }
    console.warn("[ticketService] fetchTicketByIdApi notice:", err.message);
  }
  return null;
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

export const addTicketReplyApi = async (id, message, attachment = null, isInternal = false) => {
  try {
    const res = await api.post(`/tickets/${id}/reply/`, {
      message,
      attachment,
      is_internal: isInternal,
    });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[ticketService] addTicketReplyApi notice:", err.message);
  }
  return null;
};

export const assignTicketApi = async (id, agentId = null) => {
  try {
    const res = await api.patch(`/tickets/${id}/assign/`, { agent_id: agentId });
    if (res?.data) return res.data;
  } catch (err) {
    console.warn("[ticketService] assignTicketApi notice:", err.message);
  }
  return null;
};


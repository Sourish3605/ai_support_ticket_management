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
  return tickets.find(
    (ticket) => String(ticket.id || "").trim().toLowerCase() === searchId
  ) || null;
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

  // 2. Domain Categorization
  const isPhishing = text.includes("phishing") || text.includes("scam") || text.includes("malware") || text.includes("suspicious email") || text.includes("virus");
  const isVPN = text.includes("vpn") || text.includes("anyconnect") || text.includes("globalprotect") || text.includes("cisco vpn");
  const isWifi = text.includes("wifi") || text.includes("wi-fi") || text.includes("internet") || text.includes("network") || text.includes("dns") || text.includes("broadband") || text.includes("ethernet") || text.includes("router");
  const isPasswordReset = text.includes("reset password") || text.includes("forgot password") || text.includes("change password") || text.includes("password expired");
  const isAuth = text.includes("password") || text.includes("login") || text.includes("signin") || text.includes("sso") || text.includes("mfa") || text.includes("authenticator") || text.includes("locked out");
  const isMonitor = text.includes("monitor") || text.includes("screen") || text.includes("display") || text.includes("flicker") || text.includes("hdmi");
  const isPeripherals = text.includes("keyboard") || text.includes("mouse") || text.includes("printer") || text.includes("headset") || text.includes("dock") || text.includes("webcam");
  const isHardware = isMonitor || isPeripherals || text.includes("laptop") || text.includes("desktop") || text.includes("pc") || text.includes("macbook") || text.includes("battery") || text.includes("charger") || text.includes("overheating");
  const isEmail = text.includes("email") || text.includes("outlook") || text.includes("mailbox") || text.includes("exchange") || text.includes("calendar") || text.includes("inbox") || text.includes("mail sync");
  const isBilling = text.includes("billing") || text.includes("invoice") || text.includes("payment") || text.includes("credit card") || text.includes("refund") || text.includes("subscription") || text.includes("charge") || text.includes("receipt");
  const isSoftware = text.includes("software") || text.includes("app") || text.includes("crash") || text.includes("crashing") || text.includes("bug") || text.includes("license") || text.includes("install") || text.includes("update failed") || text.includes("freeze") || text.includes("error message");

  let category = "Software";
  let subCategory = "Application Error";
  let knowledgeSource = "Software Packaging & Application Support (KB-SFT-005)";
  let suggestedSteps = [
    "Force-close all instances of the application using Task Manager / Activity Monitor.",
    "Clear local application cache files in %LOCALAPPDATA% or ~/Library/Caches.",
    "Check Company Portal / Software Center for pending application updates.",
    "Run the built-in application repair wizard from installed programs.",
    "Reboot your computer and relaunch the application as Administrator."
  ];

  if (isPhishing) {
    category = "Security";
    subCategory = "Phishing";
    knowledgeSource = "SecOps Security Guidelines v3.4 (KB-SEC-002)";
    suggestedSteps = [
      "Do NOT click any links or download attachments from the suspicious message.",
      "Use the 'Report Phishing' button in Outlook to submit headers to SecOps.",
      "If you entered credentials, change your corporate password immediately via SSO portal.",
      "Disconnect your machine from Wi-Fi if unauthorized downloads occurred.",
      "SecOps will review message telemetry and quarantine threat vectors."
    ];
  } else if (isVPN) {
    category = "Network";
    subCategory = "VPN";
    knowledgeSource = "Corporate VPN Troubleshooting Guide (KB-NET-001)";
    suggestedSteps = [
      "Verify your local internet connection is active by loading a public webpage.",
      "Confirm the VPN server address matches 'vpn.company.com' in your client profile.",
      "Restart the Cisco AnyConnect / GlobalProtect VPN service.",
      "Check that port 443 and UDP 500/4500 are not restricted on your network.",
      "Clear cached VPN credentials and re-authenticate via company SSO."
    ];
  } else if (isWifi) {
    category = "Network";
    subCategory = "Internet";
    knowledgeSource = "Network Operations Service Desk (KB-NET-002)";
    suggestedSteps = [
      "Verify router / modem power indicators and physical ethernet cable connections.",
      "Toggle Wi-Fi adapter off and on or flush local DNS cache via 'ipconfig /flushdns'.",
      "Verify DHCP default gateway assignment and DNS server responsiveness.",
      "Check if the ISP or local broadband provider is experiencing an area-wide outage.",
      "Contact the Network Operations Team if corporate gateway remains unreachable."
    ];
  } else if (isPasswordReset || (isAuth && text.includes("password"))) {
    category = "Authentication";
    subCategory = "Password Reset";
    knowledgeSource = "SSO Login & Self-Service Password Reset (KB-AUTH-003)";
    suggestedSteps = [
      "Navigate to the self-service portal: sso.company.com/recovery.",
      "Enter your corporate email address to receive an MFA verification push.",
      "Follow the on-screen prompts to set a new 12+ character complex password.",
      "Wait 2 minutes for directory synchronization across corporate services.",
      "Log in to your workstation with the new password."
    ];
  } else if (isAuth) {
    category = "Authentication";
    subCategory = "Login Issue";
    knowledgeSource = "SSO Login & Self-Service Password Reset (KB-AUTH-001)";
    suggestedSteps = [
      "Verify corporate username and email format (username@company.com).",
      "Check authenticator app time-sync and approve pending MFA notifications.",
      "Clear browser cookies, cache, and active sessions in incognito mode.",
      "Contact IT Support Desk if your account is locked due to consecutive failed attempts."
    ];
  } else if (isMonitor) {
    category = "Hardware";
    subCategory = "Monitor";
    knowledgeSource = "Hardware Lifecycle & Asset Support Desk (KB-HDW-004)";
    suggestedSteps = [
      "Inspect physical HDMI / DisplayPort / Thunderbolt cable connections.",
      "Power cycle the external monitor and verify input source channel.",
      "Check display resolution and refresh rate settings in system preferences.",
      "Update graphics display drivers or test with an alternate cable/dock."
    ];
  } else if (isPeripherals) {
    category = "Hardware";
    subCategory = "Keyboard / Mouse";
    knowledgeSource = "Hardware Lifecycle & Asset Support Desk (KB-HDW-004)";
    suggestedSteps = [
      "Disconnect and reconnect the USB peripheral device to an alternate port.",
      "Check battery charge and Bluetooth pairing status if wireless.",
      "Reinstall device drivers via Device Manager / System Information.",
      "Test device on another workstation to isolate hardware failure."
    ];
  } else if (isHardware) {
    category = "Hardware";
    subCategory = "Laptop";
    knowledgeSource = "Hardware Lifecycle & Asset Support Desk (KB-HDW-004)";
    suggestedSteps = [
      "Perform a full restart to flush system RAM and pending updates.",
      "Check Task Manager for runaway background processes consuming > 80% CPU.",
      "Verify the device has at least 15 GB free disk space on the primary drive.",
      "Inspect charger cable, power brick, and battery health telemetry.",
      "Run hardware diagnostics utility via Dell Command / Apple Diagnostics."
    ];
  } else if (isEmail) {
    category = "Email";
    subCategory = "Outlook Sync";
    knowledgeSource = "Messaging & Collaboration Services (KB-EML-006)";
    suggestedSteps = [
      "Verify Outlook status shows 'Connected to Microsoft Exchange' in the status bar.",
      "Toggle Outlook into Work Offline mode, wait 10 seconds, then reconnect.",
      "Run Outlook in Safe Mode (outlook.exe /safe) to disable conflicting add-ins.",
      "Rebuild the local Outlook data file (.OST) via Account Settings.",
      "Check Office 365 webmail (outlook.office.com) to verify cloud mailbox health."
    ];
  } else if (isBilling) {
    category = "Billing";
    subCategory = "Invoice";
    knowledgeSource = "Finance & Accounts Operations (KB-BIL-007)";
    suggestedSteps = [
      "Verify billing entity details and PO reference numbers on the disputed invoice.",
      "Cross-reference billing statement with ERP purchase orders and payment gateways.",
      "If payment failed, check credit card expiration date and bank merchant authorization.",
      "Submit receipt and transaction reference to the Finance Accounts team."
    ];
  } else if (isSoftware) {
    category = "Software";
    subCategory = text.includes("crash") ? "Crash" : text.includes("license") ? "License Expired" : "Application Error";
    knowledgeSource = "Software Packaging & Application Support (KB-SFT-005)";
  } else {
    // General fallback defaults to Network or Software based on connectivity words
    if (text.includes("slow") || text.includes("down") || text.includes("cannot connect") || text.includes("unable to connect")) {
      category = "Network";
      subCategory = "Internet";
    } else {
      category = "Software";
      subCategory = "Application Error";
    }
  }

  const isCritical = text.includes("emergency") || text.includes("ransomware") || text.includes("outage") || text.includes("all users") || text.includes("production down");
  const isUrgent = isCritical || text.includes("urgent") || text.includes("cannot work") || text.includes("completely blocked") || workBlocked;
  
  const priority = isCritical ? "P1" : isUrgent ? "P2" : "P3";
  const severity = isCritical ? "Critical" : isUrgent ? "High" : "Medium";
  const slaHours = priority === "P1" ? 1 : priority === "P2" ? 4 : 24;

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

  const index = tickets.findIndex(
    (ticket) => ticket.id === ticketId
  );

  if (index === -1) {
    throw new Error("Ticket not found");
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

  return updateTicket(ticketId, {
    comments,
  });
};

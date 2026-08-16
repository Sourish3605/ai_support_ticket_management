import { seedTickets, seedUsers } from "../data/seedData";
import { storage, STORAGE_KEYS } from "./storageService";

const getTickets = () => {
  return storage.get(
    STORAGE_KEYS.tickets,
    seedTickets
  );
};

const saveTickets = (tickets) => {
  storage.set(STORAGE_KEYS.tickets, tickets);
};

const generateTicketId = (tickets) => {
  const numbers = tickets
    .map((ticket) => {
      const match = ticket.id.match(/\d+/);
      return match ? Number(match[0]) : 0;
    });

  const nextNumber = Math.max(1, ...numbers) + 1;
  return `TKT${String(nextNumber).padStart(3, "0")}`;
};

const KNOWLEDGE_BASE = [
  {
    category: "VPN",
    title: "Corporate VPN Troubleshooting Guide (KB-NET-001)",
    steps: [
      "1. Verify your local internet connection is active.",
      "2. Confirm the VPN server address matches 'vpn.company.com'.",
      "3. Restart the Cisco AnyConnect / VPN client service.",
      "4. Check that your local network/firewall allows UDP ports 500/4500.",
      "5. Clear cached VPN credentials and re-authenticate via company SSO.",
    ],
  },
  {
    category: "Network",
    title: "Office & Remote Network Connectivity Guide (KB-NET-002)",
    steps: [
      "1. Disconnect and reconnect to the corporate Wi-Fi (Enterprise SSID).",
      "2. Flush DNS cache (ipconfig /flushdns or dscacheutil -flushcache).",
      "3. Verify IP assignment via DHCP gateway.",
      "4. Restart the network adapter from system network settings.",
    ],
  },
  {
    category: "Security",
    title: "Security Threat Isolation & Incident Response (KB-SEC-001)",
    steps: [
      "1. Disconnect device from corporate network/Wi-Fi immediately.",
      "2. Do not open or forward suspicious attachments or links.",
      "3. Change corporate SSO password from a secondary trusted device.",
      "4. SecOps is notified to quarantine endpoint and inspect telemetry.",
    ],
  },
  {
    category: "Authentication",
    title: "SSO Login & Self-Service Password Reset (KB-AUTH-003)",
    steps: [
      "1. Open self-service recovery at sso.company.com/recovery.",
      "2. Approve the push notification sent to your registered authenticator app.",
      "3. Set a new password meeting corporate complexity standards (12+ chars).",
      "4. Wait 2 minutes for directory synchronization across active sessions.",
    ],
  },
  {
    category: "Hardware",
    title: "Workstation Performance & Thermal Diagnostics (KB-HDW-004)",
    steps: [
      "1. Perform a full system reboot to clear runaway background processes.",
      "2. Inspect Task Manager / Activity Monitor for CPU consumption > 80%.",
      "3. Ensure the laptop vents are unobstructed and clean.",
      "4. Run Apple Diagnostics / Dell Command hardware scan on boot.",
    ],
  },
  {
    category: "Software",
    title: "Application Crash Recovery & Cache Clearing (KB-SFT-005)",
    steps: [
      "1. Force-close all instances of the application using Task Manager.",
      "2. Clear local application cache files from user appdata folder.",
      "3. Check Software Center / Company Portal for pending updates.",
      "4. Run built-in application repair wizard and restart workstation.",
    ],
  },
  {
    category: "Email",
    title: "Outlook Sync & Mailbox Recovery Guide (KB-EML-006)",
    steps: [
      "1. Verify Outlook status bar indicates 'Connected to Exchange'.",
      "2. Toggle 'Work Offline' off and on to force a reconnection handshake.",
      "3. Run Outlook in Safe Mode (outlook.exe /safe) to isolate add-in issues.",
      "4. Rebuild the local OST data file via Account Settings.",
    ],
  },
];

export const classifyTicket = (subject = "", description = "", scope = "Just me", workBlocked = false) => {
  const text = `${subject} ${description}`.toLowerCase();

  let category = "General";
  let subCategory = "Other";
  let confidence = 0.78;
  let team = "IT Support";

  if (text.includes("vpn") || text.includes("anyconnect") || text.includes("tunnel") || text.includes("globalprotect")) {
    category = "VPN";
    subCategory = "Connection Failure";
    confidence = 0.96;
    team = "Network Team";
  } else if (text.includes("network") || text.includes("wifi") || text.includes("wi-fi") || text.includes("internet") || text.includes("dns") || text.includes("connectivity")) {
    category = "Network";
    subCategory = "Internet / Wi-Fi";
    confidence = 0.93;
    team = "Network Team";
  } else if (text.includes("phishing") || text.includes("ransomware") || text.includes("malware") || text.includes("breach") || text.includes("unauthorized") || text.includes("hacked")) {
    category = "Security";
    subCategory = text.includes("phishing") ? "Phishing Alert" : "Malware / Incident";
    confidence = 0.97;
    team = "Security Team";
  } else if (text.includes("password") || text.includes("login") || text.includes("locked") || text.includes("sso") || text.includes("mfa") || text.includes("account")) {
    category = "Authentication";
    subCategory = text.includes("password") ? "Password Reset" : "Login Issue";
    confidence = 0.95;
    team = "IT Support";
  } else if (text.includes("laptop") || text.includes("desktop") || text.includes("macbook") || text.includes("monitor") || text.includes("printer") || text.includes("keyboard") || text.includes("hardware") || text.includes("battery") || text.includes("overheating")) {
    category = "Hardware";
    subCategory = text.includes("printer") ? "Printer" : "Computer/Peripheral";
    confidence = 0.92;
    team = "Hardware Team";
  } else if (text.includes("outlook") || text.includes("email") || text.includes("mailbox") || text.includes("calendar")) {
    category = "Email";
    subCategory = "Outlook / Sync";
    confidence = 0.91;
    team = "IT Support";
  } else if (text.includes("software") || text.includes("application") || text.includes("crash") || text.includes("license") || text.includes("error code") || text.includes("install")) {
    category = "Software";
    subCategory = "Application Error";
    confidence = 0.90;
    team = "Software Team";
  } else if (text.includes("payment") || text.includes("billing") || text.includes("invoice") || text.includes("charge")) {
    category = "Billing";
    subCategory = "Invoice / Payment";
    confidence = 0.91;
    team = "Finance";
  }

  // Severity Prediction
  const isCritical = text.includes("ransomware") || text.includes("breach") || text.includes("outage") || text.includes("system down") || (workBlocked && ["Whole org", "My department"].includes(scope));
  const isHigh = text.includes("vpn") || text.includes("cannot login") || text.includes("locked") || workBlocked || scope === "My team";
  const isMedium = text.includes("error") || text.includes("slow") || text.includes("freeze") || text.includes("crash");

  const severity = isCritical ? "Critical" : isHigh ? "High" : isMedium ? "Medium" : "Low";

  // Priority Scoring (P1, P2, P3, P4)
  const priority = severity === "Critical" ? "P1" : severity === "High" ? (scope === "Whole org" ? "P1" : "P2") : severity === "Medium" ? "P3" : "P4";

  // Milestone 2 RAG Knowledge Retrieval
  const kbMatch = KNOWLEDGE_BASE.find((k) => k.category.toLowerCase() === category.toLowerCase()) || KNOWLEDGE_BASE[0];

  return {
    category,
    subCategory,
    severity,
    priority,
    confidence,
    team,
    classificationPath: confidence >= 0.90 ? "Fast-Path" : "LLM",
    knowledgeSource: kbMatch.title,
    suggestedResolution: kbMatch.steps,
  };
};

const getSLAHours = (priority) => {
  switch (priority) {
    case "P1":
    case "High":
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

export const createTicket = (form, user) => {
  const tickets = getTickets();
  const ticketId = generateTicketId(tickets);

  const classification = classifyTicket(
    form.subject,
    form.description,
    form.scope || "Just me",
    Boolean(form.workBlocked)
  );

  const category = form.category || classification.category;
  const severity = classification.severity;
  const priority = classification.priority;
  const slaHours = getSLAHours(priority);

  const createdAt = new Date();
  const slaDueAt = new Date(
    createdAt.getTime() +
      slaHours * 60 * 60 * 1000
  );

  // Automatic assignment
  const agent = getAvailableAgent(classification.team);

  const ticket = {
    id: ticketId,
    subject: form.subject,
    description: form.description,
    category,
    subCategory: classification.subCategory,
    severity,
    priority,
    status: "AI_RESOLUTION_READY",

    customerId: user?.id || "USR-001",
    customerName: user?.name || user?.username || "Employee",
    customerEmail: user?.email || "employee@company.com",

    department: form.department || user?.department || "Finance",
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
    team: agent?.team || classification.team,

    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    slaHours,
    slaDueAt: slaDueAt.toISOString(),

    knowledgeRetrieved: true,
    knowledgeSource: classification.knowledgeSource,

    ai: {
      categoryConfidence: classification.confidence,
      severityConfidence: Math.min(0.96, classification.confidence - 0.04),
      classificationPath: classification.classificationPath,
      severity,
      suggestedResolution: classification.suggestedResolution,
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
        title: "AI Classified (Milestone 1)",
        description: `Predicted Category: ${category}, Severity: ${severity}, Priority: ${priority}.`,
        timestamp: new Date(createdAt.getTime() + 1000).toISOString(),
      },
      {
        id: Date.now() + 2,
        type: "rag",
        title: "AI Resolution Ready (Milestone 2)",
        description: `Knowledge retrieved from: ${classification.knowledgeSource}.`,
        timestamp: new Date(createdAt.getTime() + 2000).toISOString(),
      },
      ...(agent
        ? [
            {
              id: Date.now() + 3,
              type: "assigned",
              title: "Ticket assigned",
              description: `Assigned to ${agent.name} (${classification.team}).`,
              timestamp: new Date(createdAt.getTime() + 3000).toISOString(),
            },
          ]
        : []),
    ],

    comments: [],
  };

  tickets.unshift(ticket);
  saveTickets(tickets);

  return ticket;
};

export const getAllTickets = () => {
  return getTickets();
};

export const getTicketById = (id) => {
  const tickets = getTickets();
  return tickets.find(
    (ticket) => ticket.id === id
  );
};

export const getCustomerTickets = (customerId) => {
  const tickets = getTickets();
  if (!customerId) return tickets;
  return tickets.filter(
    (ticket) => ticket.customerId === customerId
  );
};

export const getAgentTickets = (agentId) => {
  return getTickets().filter(
    (ticket) =>
      ticket.assignedTo === agentId
  );
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

  const updatedTicket = {
    ...ticket,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (
    updates.status &&
    updates.status !== ticket.status
  ) {
    updatedTicket.timeline = [
      ...ticket.timeline,
      {
        id: Date.now(),
        type: "status",
        title: `Ticket moved to ${updates.status}`,
        description: getStatusDescription(updates.status),
        timestamp: new Date().toISOString(),
      },
    ];
  }

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

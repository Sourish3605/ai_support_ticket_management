import { seedTickets, seedUsers } from "../data/seedData.js";
import { storage, STORAGE_KEYS } from "./storageService.js";
import { api } from "./api.js";



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

export const classifyTicket = async (subject = "", description = "", scope = "Just me", workBlocked = false) => {
  try {
    const response = await api.post("/support/classify/", {
      subject,
      description,
      scope,
      work_blocked: workBlocked,
    });
    return response.data;
  } catch (error) {
    console.error("[TicketService] AI classification error:", error);
    return {
      success: false,
      error: error?.response?.data?.error || "AI classification service is temporarily unavailable.",
    };
  }
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

export const createTicket = async (form, user) => {
  const tickets = getTickets();
  const ticketId = generateTicketId(tickets);

  const classification = await classifyTicket(
    form.subject,
    form.description,
    form.scope || "Just me",
    Boolean(form.workBlocked)
  );

  const category = form.category || classification.category;
  const subCategory = form.subCategory || classification.subCategory;
  const severity = form.severity || classification.severity;
  const priority = form.priority || classification.priority;
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
    subCategory,
    severity,
    priority,
    status: "AI_RESOLUTION_READY",


    customerId: user?.id || "USR-004",
    customerName: user?.name || user?.username || "devipriya",
    customerEmail: user?.email || "devipriya@gmail.com",

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
    team: agent?.team || classification.team,

    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
    slaHours,
    slaDueAt: slaDueAt.toISOString(),

    knowledgeRetrieved: true,
    knowledgeSource: form.knowledgeSource || classification.knowledgeSource,

    ai: {
      categoryConfidence: form.confidence || classification.confidence,
      severityConfidence: Math.min(0.96, (form.confidence || classification.confidence) - 0.04),
      classificationPath: form.classificationPath || classification.classificationPath,
      severity,
      suggestedResolution: form.suggestedResolution || classification.suggestedResolution,
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
      customer_email: ticket.customerEmail || "devipriya@gmail.com",
      customer_name: ticket.customerName || "devipriya",
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

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
      const number = Number(
        ticket.id.replace("TK-", "")
      );

      return Number.isNaN(number) ? 0 : number;
    });

  const nextNumber = Math.max(1000, ...numbers) + 1;

  return `TK-${nextNumber}`;
};

const classifyTicket = (subject, description) => {
  const text = `${subject} ${description}`.toLowerCase();

  if (
    text.includes("password") ||
    text.includes("login") ||
    text.includes("account") ||
    text.includes("access")
  ) {
    return {
      category: "Account",
      confidence: 0.94,
    };
  }

  if (
    text.includes("payment") ||
    text.includes("billing") ||
    text.includes("invoice")
  ) {
    return {
      category: "Billing",
      confidence: 0.91,
    };
  }

  if (
    text.includes("server") ||
    text.includes("network") ||
    text.includes("vpn") ||
    text.includes("software") ||
    text.includes("error")
  ) {
    return {
      category: "Technical",
      confidence: 0.93,
    };
  }

  return {
    category: "General",
    confidence: 0.78,
  };
};

const calculatePriority = (form) => {
  if (
    form.workBlocked === true &&
    form.scope === "Whole org"
  ) {
    return "High";
  }

  if (
    form.workBlocked === true &&
    ["My team", "My department"].includes(form.scope)
  ) {
    return "High";
  }

  if (form.workBlocked === true) {
    return "Medium";
  }

  if (form.urgency === "Critical") {
    return "High";
  }

  if (form.urgency === "High") {
    return "Medium";
  }

  return "Low";
};

const getSLAHours = (priority) => {
  switch (priority) {
    case "High":
      return 4;

    case "Medium":
      return 8;

    case "Low":
      return 24;

    default:
      return 24;
  }
};

const getAvailableAgent = () => {
  const users = storage.get(
    STORAGE_KEYS.users,
    seedUsers
  );

  const agents = users.filter(
    (user) =>
      ["Agent", "Engineer", "Lead"].includes(user.role) &&
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
    form.description
  );

  const priority = calculatePriority(form);

  const slaHours = getSLAHours(priority);

  const createdAt = new Date();

  const slaDueAt = new Date(
    createdAt.getTime() +
      slaHours * 60 * 60 * 1000
  );

  // Automatic assignment
  const agent = getAvailableAgent();

  const ticket = {
    id: ticketId,

    subject: form.subject,
    description: form.description,

    category:
      form.category || classification.category,

    categoryHint: form.category || null,

    priority,

    status: "Open",

    customerId: user.id,
    customerName: user.name,
    customerEmail: user.email,

    department: form.department || user.department,
    location: form.location || "",
    assetTag: form.assetTag || "",

    affectedSystem:
      form.affectedSystem || "",

    startedWhen:
      form.startedWhen || "",

    scope: form.scope || "Just me",

    workBlocked:
      form.workBlocked || false,

    urgency:
      form.urgency || "Medium",

    workaround:
      form.workaround || "No",

    contactPreference:
      form.contactPreference || "Email",

    bestTime:
      form.bestTime || "",

    attachments:
      form.attachments || [],

    assignedTo: agent?.id || null,
    assignedAgent: agent?.name || "Unassigned",

    team: agent?.team || "L1 Support",

    createdAt:
      createdAt.toISOString(),

    updatedAt:
      createdAt.toISOString(),

    slaHours,

    slaDueAt:
      slaDueAt.toISOString(),

    ai: {
      categoryConfidence:
        classification.confidence,

      priorityConfidence: 0.89,

      classificationPath:
        classification.confidence > 0.9
          ? "Fast-Path"
          : "LLM",

      severity: priority,

      suggestedResolution: [
        "Verify the reported issue.",
        "Check the affected system.",
        "Review relevant knowledge base articles.",
        "Apply the recommended resolution.",
        "Confirm the issue is resolved with the customer.",
      ],
    },

    timeline: [
      {
        id: Date.now(),
        type: "created",
        title: "Ticket created",
        description:
          "Your support request was submitted successfully.",
        timestamp:
          createdAt.toISOString(),
      },

      ...(agent
        ? [
            {
              id: Date.now() + 1,
              type: "assigned",
              title: "Ticket assigned",
              description:
                `Assigned to ${agent.name}.`,
              timestamp:
                createdAt.toISOString(),
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
  return getTickets().filter(
    (ticket) =>
      ticket.customerId === customerId
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
        description:
          getStatusDescription(
            updates.status
          ),
        timestamp:
          new Date().toISOString(),
      },
    ];
  }

  tickets[index] = updatedTicket;

  saveTickets(tickets);

  return updatedTicket;
};

const getStatusDescription = (status) => {
  switch (status) {
    case "Open":
      return "Your ticket is waiting to be worked on.";

    case "In Progress":
      return "An agent is currently working on your issue.";

    case "Pending":
      return "We are waiting for additional information.";

    case "Resolved":
      return "The support team has marked this issue as resolved.";

    case "Closed":
      return "This ticket has been closed.";

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
      timestamp:
        new Date().toISOString(),
    },
  ];

  return updateTicket(ticketId, {
    comments,
  });
};
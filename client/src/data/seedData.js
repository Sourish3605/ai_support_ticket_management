export const seedUsers = [
  {
    id: "USR-001",
    name: "Devi Priya",
    email: "employee@supportpilot.com",
    role: "Employee",
    department: "Computer Science",
    team: "Employees",
    status: "Active",
  },

  {
    id: "USR-002",
    name: "Priya Kumar",
    email: "agent@supportpilot.com",
    role: "Agent",
    department: "IT Support",
    team: "L1 Support",
    status: "Active",
  },

  {
    id: "USR-003",
    name: "Arun Kumar",
    email: "engineer@supportpilot.com",
    role: "Engineer",
    department: "IT Engineering",
    team: "L2 Engineering",
    status: "Active",
  },

  {
    id: "USR-004",
    name: "Support Admin",
    email: "admin@supportpilot.com",
    role: "Admin",
    department: "IT Operations",
    team: "Administration",
    status: "Active",
  },
];

export const seedTickets = [
  {
    id: "TK-1024",
    subject: "Unable to access VPN",
    description: "VPN connection fails when connecting from home.",
    category: "Technical",
    priority: "High",
    status: "In Progress",
    customerId: "USR-001",
    customerName: "Devi Priya",
    customerEmail: "employee@supportpilot.com",

    assignedTo: "USR-002",
    assignedAgent: "Priya Kumar",

    createdAt: "2026-08-09T09:30:00",
    updatedAt: "2026-08-09T10:15:00",

    slaHours: 4,
    slaDueAt: "2026-08-09T13:30:00",

    scope: "Just me",
    workBlocked: true,

    timeline: [
      {
        id: 1,
        type: "created",
        title: "Ticket created",
        description: "Your ticket was submitted successfully.",
        timestamp: "2026-08-09T09:30:00",
      },
      {
        id: 2,
        type: "assigned",
        title: "Ticket assigned",
        description: "Assigned to Priya Kumar.",
        timestamp: "2026-08-09T09:32:00",
      },
      {
        id: 3,
        type: "status",
        title: "Ticket moved to In Progress",
        description: "An agent has started working on your issue.",
        timestamp: "2026-08-09T10:15:00",
      },
    ],

    comments: [],

    ai: {
      categoryConfidence: 0.94,
      priorityConfidence: 0.91,
      classificationPath: "Fast-Path",
      severity: "High",
    },
  },
];
import dummyData from '../data/dummyData.json';

const wait = (ms = 450) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const getDashboardData = async () => {
  await wait();
  return dummyData;
};

export const getTickets = async () => {
  await wait();
  return dummyData.tickets;
};

export const getTicketById = async (ticketId) => {
  await wait();
  return dummyData.tickets.find((ticket) => ticket.id === ticketId) || null;
};

export const createTicket = async (ticket) => {
  await wait();
  return { ...ticket, id: `TK-${Math.floor(1000 + Math.random() * 9000)}` };
};

export const updateTicket = async (ticketId, updates) => {
  await wait();
  return { ticketId, ...updates };
};

export const deleteTicket = async (ticketId) => {
  await wait();
  return { ticketId, deleted: true };
};

export const getAiResponses = async () => {
  await wait();
  return dummyData.aiMessages;
};

export const getReports = async () => {
  await wait();
  return dummyData.reports;
};

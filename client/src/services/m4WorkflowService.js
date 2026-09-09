/**
 * SupportPilot Milestone 4 — AI Resolution Validation, Agent Collaboration & Ticket Closure Workflow Service
 *
 * Implements the complete M4 lifecycle:
 * - Confidence & Policy Decision Flow (>=90% Auto/Review, 70-89% Review, <70% Escalate)
 * - 9-Point Support Agent Validation Checklist
 * - 7 Agent Action Buttons (Send AI, Edit & Send, Manual, Request Info, Escalate, Resolve, Close)
 * - Customer Resolution Confirmation & Reopen Workflow
 * - Customer CSAT Feedback (1-5 stars & comments)
 * - M4 Status Lifecycle Audit Trail & Timeline
 */

import { storage, STORAGE_KEYS } from "./storageService";
import { getAllTickets, saveTickets, updateTicket } from "./ticketService";
import { api } from "./api";

const M4_CONFIG_KEY = "supportpilot_m4_config";

export const M4_STATUSES = {
  AI_RESOLUTION_READY: "AI_RESOLUTION_READY",
  PENDING_AGENT_REVIEW: "PENDING_AGENT_REVIEW",
  WAITING_FOR_CUSTOMER: "WAITING_FOR_CUSTOMER",
  AWAITING_CUSTOMER_INFO: "AWAITING_CUSTOMER_INFO",
  IN_PROGRESS: "IN_PROGRESS",
  ESCALATED: "ESCALATED",
  RESOLVED: "RESOLVED",
  PENDING_CONFIRMATION: "PENDING_CONFIRMATION",
  CLOSED: "CLOSED",
  REOPENED: "REOPENED",
};

export const M4_STATUS_LABELS = {
  [M4_STATUSES.AI_RESOLUTION_READY]: "AI Solution Ready",
  [M4_STATUSES.PENDING_AGENT_REVIEW]: "Pending Agent Review",
  [M4_STATUSES.WAITING_FOR_CUSTOMER]: "Waiting for Customer",
  [M4_STATUSES.AWAITING_CUSTOMER_INFO]: "Awaiting Customer Info",
  [M4_STATUSES.IN_PROGRESS]: "In Progress",
  [M4_STATUSES.ESCALATED]: "Escalated to Specialist",
  [M4_STATUSES.RESOLVED]: "Resolved",
  [M4_STATUSES.PENDING_CONFIRMATION]: "Pending Confirmation",
  [M4_STATUSES.CLOSED]: "Closed",
  [M4_STATUSES.REOPENED]: "Reopened by Customer",
};

export const DEFAULT_M4_CONFIG = {
  autoResponseThreshold: 0.90, // 90%+ eligible for auto-response if policy allows
  agentReviewThreshold: 0.70,   // 70%-89% requires agent review
  escalateThreshold: 0.70,      // <70% escalates to specialist
  sensitiveCategories: ["Authentication", "Security", "Billing", "Payment", "Access"],
  allowAutonomousSend: false,   // Default: human validation gate required
  autoCloseDays: 3,             // Inactivity auto-closure
};

export function getM4Config() {
  return storage.get(M4_CONFIG_KEY, DEFAULT_M4_CONFIG);
}

export function saveM4Config(config) {
  const merged = { ...DEFAULT_M4_CONFIG, ...config };
  storage.set(M4_CONFIG_KEY, merged);
  window.dispatchEvent(new CustomEvent("supportpilot_m4_config_changed", { detail: merged }));
  return merged;
}

/**
 * Determine M4 Resolution Strategy based on confidence, category sensitivity & business rules (PDF Page 4 & 5)
 */
export function evaluateM4Strategy(ticket, customConfig = null) {
  const cfg = customConfig || getM4Config();
  const confidence = Number(ticket.confidence || ticket.ai?.confidence || 0.85);
  const category = ticket.category || "General";
  const isSensitive = cfg.sensitiveCategories.some(
    (c) => c.toLowerCase() === category.toLowerCase()
  );

  // Sensitive cases require human review regardless of confidence (Page 16 Business Rule)
  if (isSensitive) {
    if (confidence < cfg.escalateThreshold) {
      return {
        strategy: "ESCALATE_TO_SPECIALIST",
        reason: `Sensitive category (${category}) with low AI confidence (${Math.round(confidence * 100)}%). Requires human specialist escalation.`,
        suggestedStatus: M4_STATUSES.ESCALATED,
        requiresReview: true,
        canAutoSend: false,
      };
    }
    return {
      strategy: "AGENT_REVIEW_REQUIRED",
      reason: `Sensitive category (${category}) mandates human agent validation before customer transmission.`,
      suggestedStatus: M4_STATUSES.PENDING_AGENT_REVIEW,
      requiresReview: true,
      canAutoSend: false,
    };
  }

  // General category confidence routing
  if (confidence >= cfg.autoResponseThreshold) {
    return {
      strategy: cfg.allowAutonomousSend ? "APPROVED_AUTO_RESPONSE" : "QUICK_AGENT_REVIEW",
      reason: `High confidence (${Math.round(confidence * 100)}%) and safe category.`,
      suggestedStatus: cfg.allowAutonomousSend ? M4_STATUSES.WAITING_FOR_CUSTOMER : M4_STATUSES.PENDING_AGENT_REVIEW,
      requiresReview: !cfg.allowAutonomousSend,
      canAutoSend: cfg.allowAutonomousSend,
    };
  } else if (confidence >= cfg.agentReviewThreshold) {
    return {
      strategy: "AGENT_REVIEW_REQUIRED",
      reason: `Medium confidence (${Math.round(confidence * 100)}%). Agent review required before sending.`,
      suggestedStatus: M4_STATUSES.PENDING_AGENT_REVIEW,
      requiresReview: true,
      canAutoSend: false,
    };
  } else {
    return {
      strategy: "ESCALATE_TO_SPECIALIST",
      reason: `Low confidence (${Math.round(confidence * 100)}%). Auto-escalation to domain specialist recommended.`,
      suggestedStatus: M4_STATUSES.ESCALATED,
      requiresReview: true,
      canAutoSend: false,
    };
  }
}

/**
 * Executes a verified Support Agent Action (Section 5, Page 6)
 */
export async function executeAgentAction(ticketId, action, payload = {}, currentUser = null) {
  const tickets = getAllTickets();
  const index = tickets.findIndex(
    (t) => String(t.id).toLowerCase() === String(ticketId).toLowerCase() ||
           String(t.ticketNumber || "").toLowerCase() === String(ticketId).toLowerCase()
  );

  if (index === -1) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  const ticket = { ...tickets[index] };
  const now = new Date().toISOString();
  const agentName = currentUser?.name || currentUser?.username || "Support Agent";
  const agentEmail = currentUser?.email || "agent@supportpilot.com";

  // Ensure M4 audit collections exist on ticket
  if (!Array.isArray(ticket.statusHistory)) ticket.statusHistory = [];
  if (!Array.isArray(ticket.agentReviews)) ticket.agentReviews = [];
  if (!Array.isArray(ticket.escalations)) ticket.escalations = [];
  if (!Array.isArray(ticket.replies)) ticket.replies = [];

  const oldStatus = ticket.status;
  let newStatus = oldStatus;
  let actionDescription = "";

  switch (action) {
    // 1. Send AI Response (Answer is valid) -> Next Status: WAITING_FOR_CUSTOMER
    case "SEND_AI_RESPONSE": {
      newStatus = M4_STATUSES.WAITING_FOR_CUSTOMER;
      const responseText = payload.response ||
        (Array.isArray(ticket.ai?.suggestedResolution)
          ? ticket.ai.suggestedResolution.map((s, i) => `${i + 1}. ${s}`).join("\n")
          : ticket.ai?.suggestedResolution || "AI suggested solution verified and delivered.");

      ticket.agentReviews.push({
        reviewId: `REV-${Date.now()}`,
        agentName,
        agentEmail,
        action: "SEND_AI_RESPONSE",
        checklist: payload.checklist || {},
        originalSuggestion: responseText,
        finalResponse: responseText,
        isEdited: false,
        reviewedAt: now,
      });

      ticket.replies.push({
        id: `REP-${Date.now()}`,
        author_name: `${agentName} (Validated AI Resolution)`,
        author_email: agentEmail,
        isCustomer: false,
        isAgent: true,
        isAiGenerated: true,
        message: responseText,
        created_at: now,
      });

      ticket.aiResolutionStatus = "VALIDATED_AND_SENT";
      actionDescription = `${agentName} validated and sent the AI recommended resolution to customer.`;
      break;
    }

    // 2. Edit & Send (AI answer needs changes) -> Next Status: WAITING_FOR_CUSTOMER
    case "EDIT_AND_SEND": {
      newStatus = M4_STATUSES.WAITING_FOR_CUSTOMER;
      const original = payload.originalSuggestion || "Original AI recommendation";
      const finalEdited = payload.response || payload.editedResponse || "";

      ticket.agentReviews.push({
        reviewId: `REV-${Date.now()}`,
        agentName,
        agentEmail,
        action: "EDIT_AND_SEND",
        checklist: payload.checklist || {},
        originalSuggestion: original,
        finalResponse: finalEdited,
        isEdited: true,
        editReason: payload.editReason || "Agent customized solution for user environment",
        reviewedAt: now,
      });

      ticket.replies.push({
        id: `REP-${Date.now()}`,
        author_name: `${agentName} (Support Specialist)`,
        author_email: agentEmail,
        isCustomer: false,
        isAgent: true,
        isAiGenerated: false,
        wasAiAssisted: true,
        message: finalEdited,
        created_at: now,
      });

      ticket.aiResolutionStatus = "EDITED_AND_SENT";
      actionDescription = `${agentName} edited the AI resolution and sent the customized response to customer. Original AI suggestion preserved in audit history.`;
      break;
    }

    // 3. Manual Response (Agent has better solution) -> Next Status: WAITING_FOR_CUSTOMER
    case "MANUAL_RESPONSE": {
      newStatus = M4_STATUSES.WAITING_FOR_CUSTOMER;
      const manualText = payload.response || "";

      ticket.agentReviews.push({
        reviewId: `REV-${Date.now()}`,
        agentName,
        agentEmail,
        action: "MANUAL_RESPONSE",
        checklist: payload.checklist || {},
        rejectedAiReason: payload.rejectedReason || "Agent provided superior tailored solution",
        finalResponse: manualText,
        reviewedAt: now,
      });

      ticket.replies.push({
        id: `REP-${Date.now()}`,
        author_name: `${agentName} (Human Support Specialist)`,
        author_email: agentEmail,
        isCustomer: false,
        isAgent: true,
        message: manualText,
        created_at: now,
      });

      ticket.aiResolutionStatus = "MANUAL_OVERRIDE";
      actionDescription = `${agentName} provided an expert manual response, bypassing AI suggestion.`;
      break;
    }

    // 4. Request Info (Customer details missing) -> Next Status: AWAITING_CUSTOMER_INFO
    case "REQUEST_INFO": {
      newStatus = M4_STATUSES.AWAITING_CUSTOMER_INFO;
      const requestText = payload.requestMessage || payload.response || "Please provide additional logs or information to proceed.";

      ticket.replies.push({
        id: `REP-${Date.now()}`,
        author_name: `${agentName} (Action Needed)`,
        author_email: agentEmail,
        isCustomer: false,
        isAgent: true,
        isInfoRequest: true,
        message: `ℹ️ Information Requested from Customer:\n\n${requestText}`,
        created_at: now,
      });

      ticket.awaitingInfoPrompt = requestText;
      actionDescription = `${agentName} requested additional details from the customer. Ticket status set to Awaiting Customer Info.`;
      break;
    }

    // 5. Escalate (Complex or specialist case) -> Next Status: ESCALATED
    case "ESCALATE": {
      newStatus = M4_STATUSES.ESCALATED;
      const toTeam = payload.toTeam || payload.assignedTeam || "Tier-2 Technical Support";
      const specialist = payload.assignedSpecialist || payload.specialistName || "Tier-2 Team Lead";
      const reason = payload.escalationReason || payload.reason || "Case complexity exceeds automated resolution capabilities.";

      ticket.escalations.push({
        escalationId: `ESC-${Date.now()}`,
        fromTeam: ticket.assignedTeam || ticket.department || "Tier-1 Frontline",
        toTeam,
        assignedSpecialist: specialist,
        reason,
        escalatedBy: agentName,
        escalatedAt: now,
      });

      ticket.assignedTeam = toTeam;
      ticket.assignedAgentName = specialist;
      ticket.assignedAgent = specialist;
      ticket.escalationReason = reason;
      actionDescription = `${agentName} escalated ticket to ${toTeam} (${specialist}). Reason: ${reason}`;
      break;
    }

    // 6. Resolve (Issue confirmed solved) -> Next Status: RESOLVED
    case "RESOLVE": {
      newStatus = M4_STATUSES.RESOLVED;
      const resolutionNotes = payload.resolutionNotes || payload.notes || "Issue verified and resolved successfully.";

      ticket.resolution = {
        solution: resolutionNotes,
        resolvedBy: agentName,
        resolvedAt: now,
        method: payload.method || "Human-Validated AI Solution",
      };

      ticket.resolvedAt = now;
      actionDescription = `${agentName} marked ticket as RESOLVED. Resolution notes stored.`;

      // Automatically post resolution notification to customer conversation thread
      ticket.replies.push({
        id: `REP-${Date.now()}`,
        author_name: `${agentName} (Resolution Team)`,
        author_email: agentEmail,
        isCustomer: false,
        isAgent: true,
        message: `Hello! Your ticket has been investigated and resolved:\n\n${resolutionNotes}\n\nPlease confirm if this completely resolves your issue.`,
        created_at: now,
      });
      break;
    }

    // 7. Close (Closure conditions met) -> Next Status: CLOSED
    case "CLOSE": {
      newStatus = M4_STATUSES.CLOSED;
      ticket.closedAt = now;
      ticket.closedBy = agentName;
      actionDescription = `${agentName} closed ticket with full audit history preserved.`;
      break;
    }

    default:
      throw new Error(`Unknown M4 agent action: ${action}`);
  }

  // Update Status History (Page 9 & 10 Model)
  ticket.status = newStatus;
  ticket.updatedAt = now;
  ticket.statusHistory.push({
    historyId: `HST-${Date.now()}`,
    oldStatus,
    newStatus,
    actor: agentName,
    role: "Support Agent",
    action,
    description: actionDescription,
    timestamp: now,
  });

  tickets[index] = ticket;
  saveTickets(tickets);

  // Sync with backend API asynchronously if available
  try {
    await api.post("/support/m4/validate-agent-action/", {
      ticket_id: ticket.id,
      action,
      payload,
    }).catch(() => {});
  } catch (e) {}

  window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: ticket }));
  window.dispatchEvent(new Event("storage"));
  return ticket;
}

/**
 * Customer Resolution Confirmation (Section 3 step 10 & 11, Section 6 Customer Portal)
 */
export async function customerConfirmResolution(ticketId, isSolved, details = {}, currentUser = null) {
  const tickets = getAllTickets();
  const index = tickets.findIndex(
    (t) => String(t.id).toLowerCase() === String(ticketId).toLowerCase() ||
           String(t.ticketNumber || "").toLowerCase() === String(ticketId).toLowerCase()
  );

  if (index === -1) throw new Error(`Ticket ${ticketId} not found`);

  const ticket = { ...tickets[index] };
  const now = new Date().toISOString();
  const customerName = currentUser?.name || ticket.customerName || "Customer";
  const oldStatus = ticket.status;

  if (!Array.isArray(ticket.statusHistory)) ticket.statusHistory = [];
  if (!Array.isArray(ticket.replies)) ticket.replies = [];

  let newStatus = oldStatus;
  let logDesc = "";

  if (isSolved) {
    // Happy Path: Customer confirms resolved -> Move to CLOSED (Page 4 Step 10 & 14)
    newStatus = M4_STATUSES.CLOSED;
    ticket.closedAt = now;
    ticket.customerConfirmedAt = now;
    ticket.customerConfirmed = true;

    ticket.replies.push({
      id: `REP-${Date.now()}`,
      author_name: customerName,
      isCustomer: true,
      message: `✅ Customer Confirmation: I confirmed that my issue has been completely resolved. Thank you!`,
      created_at: now,
    });

    logDesc = `${customerName} confirmed resolution. Ticket transitioned to CLOSED.`;
  } else {
    // Reopen Path: Customer not resolved -> Return to active state (Page 4 Step 11, Page 12 REOPENED)
    newStatus = M4_STATUSES.REOPENED;
    ticket.reopenedAt = now;
    ticket.isReopened = true;
    const reopenReason = details.reason || details.message || "Customer reported that the suggested resolution did not solve the issue.";

    ticket.replies.push({
      id: `REP-${Date.now()}`,
      author_name: customerName,
      isCustomer: true,
      message: `⚠️ Customer Follow-up: Issue is NOT resolved.\n\n${reopenReason}`,
      created_at: now,
    });

    logDesc = `${customerName} reported issue remains unresolved. Ticket status changed to REOPENED for further agent investigation.`;
  }

  ticket.status = newStatus;
  ticket.updatedAt = now;
  ticket.statusHistory.push({
    historyId: `HST-${Date.now()}`,
    oldStatus,
    newStatus,
    actor: customerName,
    role: "Customer",
    action: isSolved ? "CUSTOMER_CONFIRMED_SOLVED" : "CUSTOMER_REPORTED_UNRESOLVED",
    description: logDesc,
    timestamp: now,
  });

  tickets[index] = ticket;
  saveTickets(tickets);

  try {
    await api.post("/support/m4/customer-confirmation/", {
      ticket_id: ticket.id,
      is_solved: isSolved,
      details,
    }).catch(() => {});
  } catch (e) {}

  window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: ticket }));
  window.dispatchEvent(new Event("storage"));
  return ticket;
}

/**
 * Customer CSAT Rating & Feedback (Section 8 CustomerFeedback, Section 13 5/5 stars)
 */
export async function submitCustomerFeedback(ticketId, rating, comment = "", currentUser = null) {
  const tickets = getAllTickets();
  const index = tickets.findIndex(
    (t) => String(t.id).toLowerCase() === String(ticketId).toLowerCase() ||
           String(t.ticketNumber || "").toLowerCase() === String(ticketId).toLowerCase()
  );

  if (index === -1) throw new Error(`Ticket ${ticketId} not found`);

  const ticket = { ...tickets[index] };
  const now = new Date().toISOString();
  const customerName = currentUser?.name || ticket.customerName || "Customer";
  const numRating = Number(rating) || 5;
  const cleanComment = String(comment || "").trim();

  // 1. Store feedback object
  const feedbackData = {
    rating: numRating,
    comment: cleanComment,
    customerName,
    submittedAt: now,
    status: "COMPLETED",
  };
  ticket.feedback = feedbackData;
  ticket.customerFeedback = feedbackData;

  // 2. Mark ticket status as CLOSED / COMPLETED
  const oldStatus = ticket.status;
  ticket.status = M4_STATUSES.CLOSED;
  ticket.closedAt = ticket.closedAt || now;
  ticket.completedAt = now;
  ticket.isCompleted = true;
  ticket.customerConfirmed = true;
  ticket.customerConfirmedAt = ticket.customerConfirmedAt || now;
  ticket.updatedAt = now;

  // 3. Add to statusHistory
  if (!Array.isArray(ticket.statusHistory)) ticket.statusHistory = [];
  ticket.statusHistory.push({
    historyId: `HST-${Date.now()}`,
    oldStatus,
    newStatus: M4_STATUSES.CLOSED,
    actor: customerName,
    role: "Customer",
    action: "CSAT_FEEDBACK_SUBMITTED",
    description: `Customer submitted CSAT feedback: ${numRating}/5 stars. "${cleanComment || "Completed successfully"}". Ticket status updated to CLOSED / COMPLETED.`,
    timestamp: now,
  });

  // 4. Add to ticket.timeline (displayed in Agent and Admin ticket timeline)
  if (!Array.isArray(ticket.timeline)) ticket.timeline = [];
  ticket.timeline.push({
    id: Date.now(),
    type: "feedback",
    title: `CSAT Feedback: ${numRating}/5 Stars ⭐ (Ticket Completed)`,
    description: `Customer submitted ${numRating}/5 star feedback - "${cleanComment || "Resolved & Completed"}". Ticket marked as COMPLETED & CLOSED.`,
    createdAt: now,
    actor: customerName,
  });

  // 5. Add to replies so both Agent and Customer see the completed feedback in chat thread
  if (!Array.isArray(ticket.replies)) ticket.replies = [];
  ticket.replies.push({
    id: `REP-CSAT-${Date.now()}`,
    author_name: `${customerName} (CSAT Rating)`,
    isCustomer: true,
    isFeedback: true,
    message: `⭐ Customer Satisfaction Feedback: ${numRating}/5 Stars\n${cleanComment ? `"${cleanComment}"\n` : ""}Status: Verified, Completed & Closed.`,
    created_at: now,
  });

  tickets[index] = ticket;
  saveTickets(tickets);

  try {
    await api.post("/support/m4/customer-feedback/", {
      ticket_id: ticket.id,
      rating: numRating,
      comment: cleanComment,
    }).catch(() => {});
  } catch (e) {}

  window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: ticket }));
  window.dispatchEvent(new Event("storage"));
  return ticket;
}

/**
 * Flag outdated knowledge base article (Section 14 Test Scenario 14)
 */
export function flagKnowledgeOutdated(ticketId, sourceTitle, reason = "", currentUser = null) {
  const tickets = getAllTickets();
  const index = tickets.findIndex(
    (t) => String(t.id).toLowerCase() === String(ticketId).toLowerCase() ||
           String(t.ticketNumber || "").toLowerCase() === String(ticketId).toLowerCase()
  );

  if (index === -1) return false;

  const ticket = { ...tickets[index] };
  const now = new Date().toISOString();
  const agentName = currentUser?.name || currentUser?.username || "Support Agent";

  if (!Array.isArray(ticket.flaggedKnowledge)) ticket.flaggedKnowledge = [];
  ticket.flaggedKnowledge.push({
    sourceTitle,
    reason: reason || "Flagged as outdated during agent validation",
    flaggedBy: agentName,
    flaggedAt: now,
  });

  if (!Array.isArray(ticket.statusHistory)) ticket.statusHistory = [];
  ticket.statusHistory.push({
    historyId: `HST-${Date.now()}`,
    oldStatus: ticket.status,
    newStatus: ticket.status,
    actor: agentName,
    role: "Support Agent",
    action: "FLAG_KNOWLEDGE_OUTDATED",
    description: `${agentName} flagged knowledge source "${sourceTitle}" as outdated for knowledge base governance.`,
    timestamp: now,
  });

  tickets[index] = ticket;
  saveTickets(tickets);

  window.dispatchEvent(new CustomEvent("supportpilot_tickets_changed", { detail: ticket }));
  window.dispatchEvent(new Event("storage"));
  return true;
}

/**
 * Filter AI Review Queue (Section 6 & 7)
 */
export function getAiReviewQueueTickets(allTickets = null) {
  const list = allTickets || getAllTickets();
  return list.filter((t) => {
    const s = String(t.status || "").toUpperCase();
    return s === M4_STATUSES.PENDING_AGENT_REVIEW || s === M4_STATUSES.AI_RESOLUTION_READY;
  });
}

/**
 * Compute M4 Analytics Metrics (Section 8, 14 & 16)
 */
export function getM4Metrics(allTickets = null) {
  const tickets = allTickets || getAllTickets();
  const total = tickets.length;
  if (!total) {
    return {
      total: 0,
      aiResolutionRate: 0,
      escalationRate: 0,
      avgCsat: 5.0,
      totalFeedback: 0,
      pendingReviewCount: 0,
      resolvedCount: 0,
      closedCount: 0,
      reopenedCount: 0,
    };
  }

  const aiResolved = tickets.filter(
    (t) => t.aiResolutionStatus === "VALIDATED_AND_SENT" ||
           t.aiResolutionStatus === "EDITED_AND_SENT" ||
           (t.status === "CLOSED" && !t.escalations?.length)
  ).length;

  const escalated = tickets.filter(
    (t) => t.status === M4_STATUSES.ESCALATED || (Array.isArray(t.escalations) && t.escalations.length > 0)
  ).length;

  const pendingReview = tickets.filter(
    (t) => t.status === M4_STATUSES.PENDING_AGENT_REVIEW || t.status === M4_STATUSES.AI_RESOLUTION_READY
  ).length;

  const resolved = tickets.filter(
    (t) => t.status === M4_STATUSES.RESOLVED || t.status === M4_STATUSES.PENDING_CONFIRMATION
  ).length;

  const closed = tickets.filter((t) => t.status === M4_STATUSES.CLOSED).length;
  const reopened = tickets.filter((t) => t.status === M4_STATUSES.REOPENED || t.isReopened).length;

  // Calculate Average CSAT
  const feedbackList = tickets.filter((t) => t.feedback?.rating);
  const totalRating = feedbackList.reduce((acc, t) => acc + Number(t.feedback.rating), 0);
  const avgCsat = feedbackList.length ? (totalRating / feedbackList.length).toFixed(1) : "4.9";

  return {
    total,
    aiResolutionRate: Math.round((aiResolved / total) * 100),
    escalationRate: Math.round((escalated / total) * 100),
    avgCsat,
    totalFeedback: feedbackList.length,
    pendingReviewCount: pendingReview,
    resolvedCount: resolved,
    closedCount: closed,
    reopenedCount: reopened,
  };
}

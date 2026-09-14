import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiUser,
  FiMail,
  FiBriefcase,
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiRefreshCw,
  FiEdit2,
  FiUserCheck,
  FiShare2,
  FiLayers,
  FiShield,
  FiCheck,
} from "react-icons/fi";
import {
  fetchAgentDetailsApi,
  updateAgentAvailabilityApi,
  updateAgentProfileApi,
  reassignAgentTicketsApi,
  assignTicketApi,
  isTicketAssignedToAgent,
} from "../services/ticketService";
import { useAuth } from "../context/AuthContext";

function buildInitialAgentData(agent, allTickets = []) {
  if (!agent) return null;
  const agentId = agent.id || agent.pk || agent.agent_id || agent.username || agent.email || "agent";
  const initialObj = {
    id: agentId,
    agent_id: agent.agent_id || (agent.id ? (String(agent.id).startsWith("AGT-") || String(agent.id).startsWith("USR-") ? String(agent.id) : `AGT-${String(agent.id).padStart(4, "0")}`) : `AGT-${String(agentId).slice(0, 4)}`),
    name: agent.name || agent.username || "Support Agent",
    username: agent.username || agent.email?.split("@")[0] || "agent",
    email: agent.email || "agent@company.com",
    role: agent.role || "Agent",
    department: agent.department || "IT Support",
    status: (agent.availability_status || agent.status || agent.availability || "AVAILABLE").toUpperCase(),
    availability_status: (agent.availability_status || agent.status || agent.availability || "AVAILABLE").toUpperCase(),
    title: agent.title || agent.specialty || "Support Specialist",
    specialization: agent.specialization || agent.specialty || agent.title || "IT Infrastructure & Support",
    working_hours: agent.working_hours || "09:00 AM - 05:00 PM EST",
    last_active: agent.last_active || "Active recently",
    workload: {
      open_tickets: 0,
      in_progress: 0,
      completed_today: 0,
      sla_at_risk: 0,
      total_assigned: 0,
    },
    current_tickets: [],
  };

  if (Array.isArray(allTickets) && allTickets.length > 0) {
    const matched = allTickets.filter((t) => isTicketAssignedToAgent(t, agent));

    const openT = matched.filter(
      (t) => !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)
    );
    const inProg = openT.filter((t) =>
      ["IN_PROGRESS", "In Progress", "INVESTIGATING", "UNDER_REVIEW"].includes(t.status)
    );
    const completed = matched.filter((t) =>
      ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)
    );

    initialObj.workload = {
      open_tickets: openT.length,
      in_progress: inProg.length,
      completed_today: completed.length,
      sla_at_risk: openT.filter((t) => String(t.priority || "").includes("P1") || String(t.priority || "").includes("P2")).length,
      total_assigned: matched.length,
    };

    initialObj.current_tickets = openT.map((t) => ({
      id: t.id,
      ticket_number: t.ticket_number || t.ticketNumber || `TKT-${t.id}`,
      subject: t.title || t.subject || "Support Request",
      priority: t.priority || "P3 - Medium",
      sla_status: t.sla_status || (String(t.priority || "").includes("P1") ? "1h 15m remaining" : "4h 30m remaining"),
      status: t.status || "OPEN",
      category: t.category || "General",
      sub_category: t.sub_category || t.subCategory || "General",
    }));
  }

  return initialObj;
}

/**
 * Professional Enterprise Agent Details Drawer / Modal (Section 27)
 * Slide-over drawer on desktop, responsive center modal on mobile.
 * Zero emojis, clean typography, SVG beacons, subtle shadows.
 */
export default function AgentDetailsDrawer({
  agent,
  isOpen,
  onClose,
  allTickets = [],
  onTicketAssigned = null,
  onStatusChanged = null,
}) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const fallbackData = useMemo(() => buildInitialAgentData(agent, allTickets), [agent, allTickets]);
  const [remoteAgentData, setRemoteAgentData] = useState(null);

  const agentData = useMemo(() => {
    if (remoteAgentData && (
      String(remoteAgentData.id) === String(agent?.id || agent?.pk) ||
      String(remoteAgentData.email).toLowerCase() === String(agent?.email).toLowerCase() ||
      String(remoteAgentData.username).toLowerCase() === String(agent?.username).toLowerCase()
    )) {
      return {
        ...fallbackData,
        ...remoteAgentData,
        workload: {
          ...(fallbackData?.workload || {}),
          ...(remoteAgentData.workload || {}),
        },
        current_tickets: (remoteAgentData.current_tickets && remoteAgentData.current_tickets.length > 0)
          ? remoteAgentData.current_tickets
          : (fallbackData?.current_tickets || []),
      };
    }
    return fallbackData || {};
  }, [remoteAgentData, fallbackData, agent]);

  const [loading, setLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | tickets | edit | assign
  const [statusMessage, setStatusMessage] = useState(null);

  // Edit agent form
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    department: "",
    specialization: "",
  });

  // Assign ticket form
  const [selectedTicketToAssign, setSelectedTicketToAssign] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Reassign modal state
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const isManagerOrAdmin =
    currentUser?.role === "Manager" ||
    currentUser?.role === "Admin" ||
    currentUser?.is_staff ||
    currentUser?.is_superuser;

  // Load details whenever open or agent changes
  useEffect(() => {
    if (!isOpen || !agent) return;

    setActiveTab("overview");
    setStatusMessage(null);
    setShowReassignModal(false);
    setRemoteAgentData(null);

    const initialObj = buildInitialAgentData(agent, allTickets);
    if (initialObj) {
      setEditForm({
        name: initialObj.name,
        email: initialObj.email,
        department: initialObj.department,
        specialization: initialObj.specialization,
      });
    }

    const lookupId = agent.id || agent.pk || agent.username || agent.email;
    if (lookupId) {
      setLoading(true);
      fetchAgentDetailsApi(lookupId)
        .then((data) => {
          if (data && (
            String(data.id) === String(agent.id || agent.pk) ||
            String(data.email).toLowerCase() === String(agent.email).toLowerCase() ||
            String(data.username).toLowerCase() === String(agent.username).toLowerCase()
          )) {
            setRemoteAgentData(data);
            setEditForm({
              name: data.name || initialObj?.name || "",
              email: data.email || initialObj?.email || "",
              department: data.department || initialObj?.department || "",
              specialization: data.specialization || initialObj?.specialization || "",
            });
          }
        })
        .catch((e) => {
          console.warn("Using local stats for agent:", e);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, agent?.id, agent?.email, agent?.username]);

  if (!isOpen || !agent) return null;

  const currentStatus = (agentData?.availability_status || agentData?.status || "AVAILABLE").toUpperCase();
  const isAvailable = currentStatus === "AVAILABLE";
  const isBusy = currentStatus === "BUSY";

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    setStatusMessage(null);
    try {
      await updateAgentAvailabilityApi(newStatus, agentData.id, agentData.email);
      setRemoteAgentData((prev) => ({
        ...(prev || agentData),
        status: newStatus,
        availability_status: newStatus,
      }));
      setStatusMessage({ type: "success", text: `Status updated to ${newStatus}` });
      if (onStatusChanged) onStatusChanged(newStatus);
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to update status." });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateAgentProfileApi(agentData.id, editForm);
      if (res) {
        setRemoteAgentData(res);
        setStatusMessage({ type: "success", text: "Agent profile updated successfully." });
        setActiveTab("overview");
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to save agent profile." });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicketToAssign) return;
    setAssigning(true);
    try {
      await assignTicketApi(selectedTicketToAssign, agentData.id, agentData.name);
      setStatusMessage({
        type: "success",
        text: `Ticket #${selectedTicketToAssign} assigned to ${agentData.name}.`,
      });
      setSelectedTicketToAssign("");
      setActiveTab("overview");
      if (onTicketAssigned) onTicketAssigned();

      // Refresh agent details
      const refreshed = await fetchAgentDetailsApi(agentData.id);
      if (refreshed) setRemoteAgentData(refreshed);
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to assign ticket." });
    } finally {
      setAssigning(false);
    }
  };

  const handleReassignAll = async () => {
    setReassigning(true);
    try {
      const res = await reassignAgentTicketsApi(agentData.id);
      setStatusMessage({
        type: "success",
        text: res?.message || `Tickets transferred to department queue.`,
      });
      setShowReassignModal(false);
      // Refresh agent details
      const refreshed = await fetchAgentDetailsApi(agentData.id);
      if (refreshed) setRemoteAgentData(refreshed);
      if (onTicketAssigned) onTicketAssigned();
    } catch (err) {
      setStatusMessage({ type: "error", text: "Failed to reassign tickets." });
    } finally {
      setReassigning(false);
    }
  };

  const unassignedTickets = (allTickets || []).filter(
    (t) =>
      (!t.assigned_to && !t.assignedTo && (!t.assignedAgent || t.assignedAgent === "Unassigned")) &&
      !["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      {/* DRAWER CONTAINER */}
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              <FiUser className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  Staff Specialist Profile
                </span>
                <span className="text-xs font-mono font-medium text-slate-400">
                  {agentData?.agent_id || `#AGT-${agentData?.id}`}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {agentData?.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {agentData?.title || "Support Specialist"} • {agentData?.department || "IT Support"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 text-xs font-semibold transition cursor-pointer"
              title="Close Profile Drawer"
            >
              <FiX className="w-4 h-4" />
              <span>Close Panel</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <FiCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <FiAlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* SUB-NAV TABS */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-100 bg-white text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 font-semibold transition cursor-pointer border-b-2 ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            Overview & Workload
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tickets")}
            className={`pb-2.5 px-3 font-semibold transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === "tickets"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <span>Assigned Tickets</span>
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
              {agentData?.workload?.open_tickets || agentData?.current_tickets?.length || 0}
            </span>
          </button>
          {isManagerOrAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("assign")}
                className={`pb-2.5 px-3 font-semibold transition cursor-pointer border-b-2 ${
                  activeTab === "assign"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Assign Ticket
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`pb-2.5 px-3 font-semibold transition cursor-pointer border-b-2 ${
                  activeTab === "edit"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                Edit Agent
              </button>
            </>
          )}
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <>
              {/* SECTION: AGENT PROFILE & STATUS BANNER */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                      {agentData?.name?.charAt(0)?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{agentData?.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-200 text-slate-700">
                          {agentData?.role || "Agent"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{agentData?.email}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{agentData?.department}</p>
                    </div>
                  </div>

                  {/* SVG STATUS BADGE & QUICK TOGGLE */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white shadow-xs">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          isAvailable
                            ? "bg-emerald-500 ring-2 ring-emerald-100"
                            : isBusy
                            ? "bg-amber-500 ring-2 ring-amber-100"
                            : "bg-slate-400"
                        }`}
                      />
                      <span className="text-xs font-bold text-slate-800">
                        {isAvailable ? "Available" : isBusy ? "Busy" : "Offline"}
                      </span>
                    </div>

                    {isManagerOrAdmin && (
                      <select
                        value={currentStatus}
                        disabled={statusUpdating}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs outline-none focus:border-blue-600 cursor-pointer"
                        title="Change agent availability"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="BUSY">Busy</option>
                        <option value="UNAVAILABLE">Offline</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION: WORKLOAD KPI CARDS */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Workload Overview
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Open Tickets</span>
                      <FiLayers className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {agentData?.workload?.open_tickets ?? 0}
                    </p>
                    <span className="text-[11px] text-slate-500">Active caseload</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">In Progress</span>
                      <FiClock className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {agentData?.workload?.in_progress ?? 0}
                    </p>
                    <span className="text-[11px] text-slate-500">Under review</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">Completed Today</span>
                      <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {agentData?.workload?.completed_today ?? 0}
                    </p>
                    <span className="text-[11px] text-slate-500">Resolved / closed</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                      <span className="text-xs font-medium">SLA At Risk</span>
                      <FiAlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-600">
                      {agentData?.workload?.sla_at_risk ?? 0}
                    </p>
                    <span className="text-[11px] text-slate-500">Priority cases</span>
                  </div>
                </div>
              </div>

              {/* SECTION: AGENT METADATA & INFORMATION */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Agent Information
                </h4>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Department</span>
                    <span className="font-semibold text-slate-900">{agentData?.department || "IT Support"}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Specialization</span>
                    <span className="font-semibold text-slate-900">{agentData?.specialization || "IT Infrastructure"}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Working Hours</span>
                    <span className="font-semibold text-slate-900">{agentData?.working_hours || "09:00 AM - 05:00 PM EST"}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Total Assigned (Historical)</span>
                    <span className="font-semibold text-slate-900">{agentData?.workload?.total_assigned ?? 0} tickets</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Email</span>
                    <span className="font-mono text-slate-900 font-medium">{agentData?.email}</span>
                  </div>
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Last Active</span>
                    <span className="text-slate-700">
                      {agentData?.last_active
                        ? (!isNaN(new Date(agentData.last_active).getTime())
                            ? new Date(agentData.last_active).toLocaleString()
                            : String(agentData.last_active))
                        : "Active recently"}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION: PREVIEW OF CURRENT TICKETS */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Current Assigned Tickets ({agentData?.current_tickets?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tickets")}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>View All</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(!agentData?.current_tickets || agentData.current_tickets.length === 0) ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No active open tickets currently assigned to this specialist.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Ticket ID</th>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">SLA Status</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(agentData.current_tickets || []).slice(0, 5).map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => {
                              onClose();
                              navigate(`/tickets/${t.ticket_number || t.ticketNumber || t.id}`);
                            }}
                            className="hover:bg-slate-50/80 transition cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                              #{t.ticket_number || t.id}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-xs">
                              {t.subject}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.priority?.includes("P1")
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : t.priority?.includes("P2")
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {t.priority?.split(" - ")[0] || t.priority}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">
                              {t.sla_status || "On Track"}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: CURRENT TICKETS FULL TABLE */}
          {activeTab === "tickets" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Current Assigned Tickets</h3>
                  <p className="text-xs text-slate-500">
                    Tickets assigned to {agentData?.name} requiring resolution or review.
                  </p>
                </div>
                {isManagerOrAdmin && (agentData?.current_tickets?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowReassignModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <FiShare2 className="w-3.5 h-3.5" />
                    <span>Reassign All Tickets</span>
                  </button>
                )}
              </div>

              {(!agentData?.current_tickets || agentData.current_tickets.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Zero active open tickets assigned.
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-3.5">Ticket ID</th>
                        <th className="py-3 px-3.5">Subject</th>
                        <th className="py-3 px-3.5">Priority</th>
                        <th className="py-3 px-3.5">SLA</th>
                        <th className="py-3 px-3.5">Status</th>
                        <th className="py-3 px-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(agentData.current_tickets || []).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3.5 font-mono font-bold text-blue-600">
                            #{t.ticket_number || t.id}
                          </td>
                          <td className="py-3 px-3.5 font-medium text-slate-900 max-w-xs truncate">
                            {t.subject}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.priority?.includes("P1")
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : t.priority?.includes("P2")
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {t.priority}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600 font-medium">
                            {t.sla_status || "On Track"}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                navigate(`/tickets/${t.ticket_number || t.ticketNumber || t.id}`);
                              }}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ASSIGN TICKET */}
          {activeTab === "assign" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Direct Ticket Assignment</h3>
                <p className="text-xs text-slate-500">
                  Assign an unassigned ticket directly to {agentData?.name}.
                </p>
              </div>

              <form onSubmit={handleAssignTicket} className="space-y-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Available Unassigned Ticket
                  </label>
                  {unassignedTickets.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      No unassigned tickets are currently waiting in the queue.
                    </p>
                  ) : (
                    <select
                      required
                      value={selectedTicketToAssign}
                      onChange={(e) => setSelectedTicketToAssign(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="">-- Choose a ticket to assign --</option>
                      {unassignedTickets.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.ticket_number || t.id} • {t.priority || "P3"} • {t.title || t.subject} ({t.department || "General"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-blue-900">Assignment Policies:</div>
                  <div>• Assigning will update the ticket status to <strong>ASSIGNED</strong>.</div>
                  <div>• An automated assignment notification email will be dispatched to the customer.</div>
                  <div>• The agent workload capacity will be updated immediately.</div>
                </div>

                <button
                  type="submit"
                  disabled={assigning || !selectedTicketToAssign}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {assigning ? "Assigning Ticket..." : `Assign Ticket to ${agentData?.name}`}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: EDIT AGENT */}
          {activeTab === "edit" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Agent Information</h3>
                <p className="text-xs text-slate-500">
                  Update specialist profile attributes, department routing, and specialization.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                  >
                    <option value="IT Support">IT Support</option>
                    <option value="Network">Network Operations</option>
                    <option value="Security">Security & Access</option>
                    <option value="Hardware">Hardware Operations</option>
                    <option value="Software">Software Engineering</option>
                    <option value="Billing">Billing & Accounts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization / Skills</label>
                  <input
                    type="text"
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    placeholder="e.g. VPN, SSO, Hardware Diagnostics"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/agent/tasks/${encodeURIComponent(agentData?.name || agentData?.username || "")}`);
              }}
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition shadow-xs cursor-pointer"
            >
              Open Agent Task View
            </button>

            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowReassignModal(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition shadow-xs cursor-pointer"
              >
                Reassign Tickets
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isManagerOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("assign")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-xs cursor-pointer"
              >
                Assign Ticket
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* REASSIGN MODAL CONFIRMATION */}
      {showReassignModal && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs"
          onClick={() => setShowReassignModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900">
                <FiShare2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold">Reassign Agent's Tickets</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 my-4 leading-relaxed">
              Are you sure you want to reassign all <strong>{agentData?.current_tickets?.length || 0} active tickets</strong> currently assigned to <strong>{agentData?.name}</strong>?
              They will be moved back to the departmental priority queue for balanced auto-assignment.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reassigning}
                onClick={handleReassignAll}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {reassigning ? "Reassigning..." : "Confirm Reassignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

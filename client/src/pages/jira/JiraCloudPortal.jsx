import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getAllTickets, updateTicket } from "../../services/ticketService";
import { syncJiraStatusApi, fetchJiraConfigApi } from "../../services/m3AgentService";

export default function JiraCloudPortal() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [jiraConfig, setJiraConfig] = useState({
    project_key: "SP",
    host: window.location.origin + "/jira",
    issue_type: "Incident",
  });
  const [activeTab, setActiveTab] = useState("comments");
  const [newComment, setNewComment] = useState("");
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    const all = getAllTickets();
    setTickets(all);

    const config = await fetchJiraConfigApi();
    if (config) {
      setJiraConfig({
        ...config,
        host: window.location.origin + "/jira",
      });
    }

    if (key) {
      const cleanKey = key.toUpperCase().trim();
      const numMatch = cleanKey.replace(/\D/g, "");
      const found = all.find((t) => {
        const tNum = String(t.id || "").replace(/\D/g, "");
        const tCode = String(t.ticketNumber || "").replace(/\D/g, "");
        return tNum === numMatch || tCode === numMatch;
      }) || all[0];

      if (found) {
        setSelectedIssue({
          ...found,
          jira_issue_key: cleanKey.startsWith("SP-") ? cleanKey : `SP-${found.id || 1001}`,
        });
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [key]);

  const handleStatusChange = async (issue, newStatus) => {
    try {
      updateTicket(issue.id, { status: newStatus });
      await syncJiraStatusApi(issue.id, newStatus);
      setSelectedIssue((prev) => prev ? { ...prev, status: newStatus } : null);
      setToast(`Status updated to ${newStatus} & synced with SupportPilot.`);
      loadData();
      setTimeout(() => setToast(null), 3500);
    } catch (e) {
      console.warn("Status change error:", e);
    }
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setToast("Comment added to Jira issue worklog.");
    setNewComment("");
    setTimeout(() => setToast(null), 3000);
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.subject || t.title || "").toLowerCase().includes(q) ||
      (t.description || "").toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  const getJiraKey = (ticket) => {
    const cleanDigits = String(ticket.id || "1001").replace(/\D/g, "");
    return `SP-${cleanDigits || "1001"}`;
  };

  const todoTickets = filteredTickets.filter((t) => t.status === "NEW" || t.status === "Open" || !t.status);
  const inProgressTickets = filteredTickets.filter((t) => t.status === "IN_PROGRESS" || t.status === "In Progress");
  const escalatedTickets = filteredTickets.filter((t) => t.status === "ESCALATED");
  const doneTickets = filteredTickets.filter((t) => ["RESOLVED", "Resolved", "CLOSED", "Closed"].includes(t.status));

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex flex-col font-sans text-slate-800 antialiased">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold border border-slate-700">
          ✓ {toast}
        </div>
      )}

      {/* 1. Atlassian Global Navigation Bar */}
      <header className="bg-[#0052cc] text-white px-4 py-2.5 flex items-center justify-between shadow-md select-none sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/jira")}>
            <div className="h-6 w-6 rounded bg-white text-[#0052cc] flex items-center justify-center font-black text-xs shadow-sm">
              ✦
            </div>
            <span className="font-bold text-sm tracking-tight flex items-center gap-1.5">
              <span>Jira Software</span>
              <span className="bg-white/20 text-[10px] font-mono px-1.5 py-0.5 rounded font-normal">Cloud Host</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-white/90">
            <span className="bg-white/15 px-3 py-1.5 rounded-lg cursor-pointer">Projects: SupportPilot (SP)</span>
            <span className="hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition">Filters</span>
            <span className="hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition">Dashboards</span>
            <span className="hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer transition">Teams</span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues, keys..."
              className="bg-white/20 hover:bg-white/30 focus:bg-white focus:text-slate-900 text-white placeholder:text-white/70 rounded-lg px-3 py-1.5 text-xs w-48 transition focus:w-64 focus:outline-none"
            />
          </div>

          <Link
            to="/integrations"
            className="rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1"
          >
            <span>←</span>
            <span className="hidden sm:inline">Back to</span> SupportPilot
          </Link>
        </div>
      </header>

      {/* 2. Sub-Nav & Project Title */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Projects</span>
            <span>/</span>
            <span className="font-medium text-slate-700">SupportPilot AI Service Desk</span>
            <span>/</span>
            <span className="font-bold text-[#0052cc] font-mono">SP Board</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>SupportPilot Kanban Sprint Board</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {filteredTickets.length} Synchronized Issues
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            ↻ Refresh Board
          </button>
        </div>
      </div>

      {/* 3. Main Workspace: Kanban Board */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-[900px] items-start">
          {/* Column 1: TO DO */}
          <div className="bg-[#ebecf0] rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-slate-600 tracking-wider">
                TO DO ({todoTickets.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {todoTickets.map((t) => {
                const jKey = getJiraKey(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedIssue({ ...t, jira_issue_key: jKey });
                      navigate(`/jira/${jKey}`);
                    }}
                    className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition space-y-2"
                  >
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                      {t.subject || t.title || "Support Request"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono font-bold text-[#0052cc]">{jKey}</span>
                      <span className="bg-[#ea580c] text-white px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">
                        {t.priority || "P3"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="bg-[#ebecf0] rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-blue-800 tracking-wider">
                IN PROGRESS ({inProgressTickets.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {inProgressTickets.map((t) => {
                const jKey = getJiraKey(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedIssue({ ...t, jira_issue_key: jKey });
                      navigate(`/jira/${jKey}`);
                    }}
                    className="bg-white rounded-xl p-3.5 shadow-sm border border-blue-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition space-y-2"
                  >
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                      {t.subject || t.title || "Support Request"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono font-bold text-[#0052cc]">{jKey}</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        AI Assigned
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 3: ESCALATED */}
          <div className="bg-[#ebecf0] rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-amber-800 tracking-wider">
                ESCALATED / TIER-2 ({escalatedTickets.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {escalatedTickets.map((t) => {
                const jKey = getJiraKey(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedIssue({ ...t, jira_issue_key: jKey });
                      navigate(`/jira/${jKey}`);
                    }}
                    className="bg-white rounded-xl p-3.5 shadow-sm border border-amber-300 hover:border-amber-500 hover:shadow-md cursor-pointer transition space-y-2"
                  >
                    <p className="text-xs font-bold text-slate-900 line-clamp-2">
                      {t.subject || t.title || "Support Request"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono font-bold text-[#0052cc]">{jKey}</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold text-[10px]">
                        Tier-2 Human
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 4: DONE / RESOLVED */}
          <div className="bg-[#ebecf0] rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
                DONE / RESOLVED ({doneTickets.length})
              </span>
            </div>

            <div className="space-y-2.5">
              {doneTickets.map((t) => {
                const jKey = getJiraKey(t);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedIssue({ ...t, jira_issue_key: jKey });
                      navigate(`/jira/${jKey}`);
                    }}
                    className="bg-white rounded-xl p-3.5 shadow-sm border border-emerald-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition space-y-2"
                  >
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 line-through text-slate-500">
                      {t.subject || t.title || "Support Request"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono font-bold text-emerald-700">{jKey}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        ✓ Resolved
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* 4. Issue Detail Modal when clicked */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
            {/* Modal Subheader */}
            <div className="bg-[#f4f5f7] border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">SupportPilot AI ({jiraConfig.project_key})</span>
                <span>/</span>
                <span className="font-mono font-bold text-[#0052cc] text-sm">{selectedIssue.jira_issue_key}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedIssue(null);
                  navigate("/jira");
                }}
                className="text-slate-500 hover:text-slate-900 font-bold text-base px-2 py-0.5 rounded hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 grid lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono">
                      ⚡ {jiraConfig.issue_type}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {selectedIssue.jira_issue_key}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {selectedIssue.subject || selectedIssue.title || "Support Request"}
                  </h2>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Transition Jira Status:</span>
                  <select
                    value={selectedIssue.status || "NEW"}
                    onChange={(e) => handleStatusChange(selectedIssue, e.target.value)}
                    className="rounded-lg bg-white border border-slate-300 px-3 py-1.5 font-bold text-xs text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none"
                  >
                    <option value="NEW">TO DO / OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="ESCALATED">ESCALATED (TIER-2)</option>
                    <option value="RESOLVED">DONE / RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</h4>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {selectedIssue.description || "interent connection is not working"}
                  </div>
                </div>

                {/* Activity Tabs */}
                <div className="space-y-3">
                  <div className="flex gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
                    <button
                      onClick={() => setActiveTab("comments")}
                      className={`pb-1 px-2 border-b-2 transition ${
                        activeTab === "comments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Comments
                    </button>
                    <button
                      onClick={() => setActiveTab("payload")}
                      className={`pb-1 px-2 border-b-2 transition ${
                        activeTab === "payload" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Atlassian REST API Payload
                    </button>
                  </div>

                  {activeTab === "comments" && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>SupportPilot AI Agent</span>
                          <span className="text-[10px] text-slate-400">Automated</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Ticket synchronized from customer portal. Severity: {selectedIssue.severity || "Medium"}, Priority: {selectedIssue.priority || "P3"}.
                        </p>
                      </div>

                      <form onSubmit={handleAddComment} className="flex gap-2">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a worklog comment..."
                          className="flex-1 rounded-xl border border-slate-300 p-2 text-xs focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-[#0052cc] text-white px-4 py-2 text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                        >
                          Save
                        </button>
                      </form>
                    </div>
                  )}

                  {activeTab === "payload" && (
                    <pre className="p-3.5 bg-slate-900 text-emerald-300 font-mono rounded-xl text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                      {JSON.stringify({
                        key: selectedIssue.jira_issue_key,
                        fields: {
                          project: { key: jiraConfig.project_key },
                          issuetype: { name: jiraConfig.issue_type },
                          summary: selectedIssue.subject || selectedIssue.title,
                          status: { name: selectedIssue.status || "IN_PROGRESS" },
                          priority: { name: selectedIssue.priority || "Medium" },
                          assignee: { displayName: selectedIssue.assignedAgent || "Support Pilot AI" },
                          customfield_supportpilot_id: selectedIssue.id,
                          host: jiraConfig.host,
                        }
                      }, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4 bg-[#fafbfc] p-4 rounded-xl border border-slate-200 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[10px] pb-1 border-b border-slate-200">
                  Jira Issue Metadata
                </h4>

                <div>
                  <span className="text-slate-500 block text-[11px]">Assignee</span>
                  <strong className="text-slate-800 block mt-0.5">{selectedIssue.assignedAgent || "premalatha"}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Reporter</span>
                  <strong className="text-slate-800 block mt-0.5">{selectedIssue.customerName || "Customer"}</strong>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Priority</span>
                  <span className="inline-block mt-0.5 bg-[#ea580c] text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded">
                    {selectedIssue.priority || "P3"}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[11px]">Originating Ticket</span>
                  <Link
                    to={`/tickets/${selectedIssue.id}`}
                    className="text-[#0052cc] font-mono font-bold hover:underline block mt-0.5"
                  >
                    #{selectedIssue.ticketNumber || selectedIssue.id} ↗
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

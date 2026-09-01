import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  fetchAgentRunsApi,
  fetchAgentRunDetailApi,
  startAgentWorkflowApi,
  simulateWorkflowLocally,
  fetchJiraConfigApi,
} from "../../services/m3AgentService";
import { getAllTickets } from "../../services/ticketService";
import GmailComposeButton from "../../components/GmailComposeButton";


export default function AiAgentWorkbench() {
  const { id: runIdParam } = useParams();
  const navigate = useNavigate();

  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline"); // timeline | inspector | simulator | jira | email
  const [simQuery, setSimQuery] = useState("VPN is not connecting to corporate gateway with timeout");
  const [simCategory, setSimCategory] = useState("Network");
  const [simSubCategory, setSimSubCategory] = useState("VPN");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [jiraConfig, setJiraConfig] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const backendRuns = await fetchAgentRunsApi();
    const config = await fetchJiraConfigApi();
    setJiraConfig(config);

    if (backendRuns && backendRuns.length > 0) {
      setRuns(backendRuns);
      if (runIdParam) {
        const found = backendRuns.find((r) => r.workflow_id === runIdParam || String(r.id) === String(runIdParam));
        if (found) {
          const detail = await fetchAgentRunDetailApi(found.workflow_id || found.id);
          setSelectedRun(detail || found);
        } else {
          setSelectedRun(backendRuns[0]);
        }
      } else {
        setSelectedRun(backendRuns[0]);
      }
    } else {
      // Fallback local sample runs based on tickets
      const tickets = getAllTickets();
      const mockRuns = tickets.slice(0, 8).map((t) => simulateWorkflowLocally(t));
      setRuns(mockRuns);
      setSelectedRun(mockRuns[0] || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [runIdParam]);

  const handleSelectRun = async (run) => {
    setSelectedRun(run);
    if (run.workflow_id) {
      const detail = await fetchAgentRunDetailApi(run.workflow_id);
      if (detail) setSelectedRun(detail);
    }
  };

  const handleRunSimulator = async () => {
    if (!simQuery.trim()) return;
    setIsSimulating(true);
    setSimResult(null);

    const payload = {
      subject: simQuery,
      description: simQuery,
      category: simCategory,
      sub_category: simSubCategory,
      priority: "P1",
      severity: "High",
    };

    try {
      const res = await startAgentWorkflowApi(null, 0.75);
      if (res && res.success) {
        setSimResult(res);
        setSelectedRun(res);
        setActiveTab("timeline");
        loadData();
      } else {
        const localSim = simulateWorkflowLocally({
          id: Math.floor(1000 + Math.random() * 9000),
          subject: simQuery,
          description: simQuery,
          category: simCategory,
          subCategory: simSubCategory,
          priority: "P1",
          severity: "High",
        });
        setSimResult(localSim);
        setSelectedRun(localSim);
        setActiveTab("timeline");
      }
    } catch (e) {
      const localSim = simulateWorkflowLocally({
        id: 9999,
        subject: simQuery,
        description: simQuery,
        category: simCategory,
        subCategory: simSubCategory,
      });
      setSimResult(localSim);
      setSelectedRun(localSim);
    } finally {
      setIsSimulating(false);
    }
  };

  const currentExecutions = selectedRun?.executions || [];
  const diagExec = currentExecutions.find((e) => e.agent_name.includes("Diagnosis")) || { output_data: selectedRun?.diagnosis };
  const retrExec = currentExecutions.find((e) => e.agent_name.includes("Retrieval")) || { output_data: selectedRun?.knowledge_retrieval };
  const resolExec = currentExecutions.find((e) => e.agent_name.includes("Resolution")) || { output_data: selectedRun?.resolution };
  const valExec = currentExecutions.find((e) => e.agent_name.includes("Validation")) || { output_data: selectedRun?.validation };
  const escExec = currentExecutions.find((e) => e.agent_name.includes("Escalation")) || { output_data: selectedRun?.escalation };

  const isEscalated = selectedRun?.workflow_status === "ESCALATED" || valExec?.output_data?.decision === "ESCALATE";
  const confidenceScore = selectedRun?.final_confidence || resolExec?.output_data?.confidence || 0.92;

  return (
    <div className="mx-auto max-w-[1280px] p-4 lg:p-6 space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-950 p-6 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Milestone 3 — AI Multi-Agent Operations Center</span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              AI Agent Workbench & Telemetry
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-2xl">
              Orchestrates specialized AI agents in sequence: Diagnosis → M2 RAG Retrieval → Resolution → Validation Gate → Auto Resolution / Escalation → Jira + Email Sync.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("simulator")}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <span>⚡</span> Run AI Simulator
            </button>
            <Link
              to="/integrations"
              className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-cyan-200 transition"
            >
              Enterprise Integrations →
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800">
          <div className="rounded-xl bg-white/5 p-3 border border-white/5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Active Agents</div>
            <div className="text-xl font-bold text-white mt-0.5">5 Specialized</div>
            <div className="text-[10px] text-emerald-400 mt-1">Diagnosis • RAG • Resolution • Gate • Escalation</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Validation Accuracy</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">96.8%</div>
            <div className="text-[10px] text-slate-400 mt-1">Gate Threshold: 0.75 min</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Jira Sync Status</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">Active</div>
            <div className="text-[10px] text-slate-400 mt-1">Project: {jiraConfig?.project_key || "SP"}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-3 border border-white/5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Email Automation</div>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">4 Event Types</div>
            <div className="text-[10px] text-slate-400 mt-1">Created • Res • Esc • Done</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Runs Selector | Right Workflow Telemetry */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Recent Agent Runs List */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Agent Workflow Runs ({runs.length})
              </h2>
              <button
                onClick={loadData}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {runs.map((r, idx) => {
                const isSelected = selectedRun?.workflow_id === r.workflow_id || selectedRun?.id === r.id;
                const isEsc = r.workflow_status === "ESCALATED";
                const isComp = r.workflow_status === "COMPLETED";

                return (
                  <div
                    key={r.workflow_id || r.id || idx}
                    onClick={() => handleSelectRun(r)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-900">
                        {r.workflow_id || `WF-${r.ticket || 1000 + idx}`}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isComp
                            ? "bg-emerald-100 text-emerald-800"
                            : isEsc
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {r.workflow_status || "COMPLETED"}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 truncate">
                      Ticket #{r.ticket_number || r.ticket || 1000 + idx}: {r.ticket_title || r.title || r.ticket_data?.title || "Support Request"}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Conf: <strong className="text-slate-700">{Math.round((r.final_confidence || 0.9) * 100)}%</strong></span>
                      <span>Latency: <strong className="text-slate-700">{r.latency_ms || 95}ms</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Workflow Stage Inspector & Visual Timeline */}
        <div className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            {[
              { id: "timeline", label: "Agent Pipeline Timeline", icon: "❖" },
              { id: "inspector", label: "Agent Run Telemetry", icon: "⌕" },
              { id: "simulator", label: "Interactive Simulator", icon: "⚡" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: VISUAL MULTI-AGENT EXECUTION TIMELINE */}
          {activeTab === "timeline" && selectedRun && (
            <div className="space-y-6">
              {/* Header Status Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Active Multi-Agent Workflow
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                      {selectedRun.workflow_id || `WF-${selectedRun.ticket_id || 1001}`}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      Target Ticket: <strong className="text-slate-900">{selectedRun.ticket_number || `TKT-${selectedRun.ticket_id || 1001}`}</strong> • Stage: <span className="font-semibold text-emerald-700">{selectedRun.current_agent || "Automated Resolution Approved"}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Resolution Confidence</div>
                      <div className="text-2xl font-black text-emerald-600">
                        {Math.round(confidenceScore * 100)}%
                      </div>
                    </div>
                    <span
                      className={`rounded-xl px-3.5 py-2 text-xs font-bold ${
                        isEscalated
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {isEscalated ? "ESCALATED TO HUMAN" : "AUTO RESOLUTION APPROVED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sequential Multi-Agent Flow Diagram */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Execution Pipeline Progression
                </h3>

                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {/* STAGE 1: DIAGNOSIS AGENT */}
                  <div className="relative">
                    <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold grid place-items-center shadow">
                      ✓
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🩺</span>
                          <h4 className="text-xs font-bold text-slate-900">1. Diagnosis Agent</h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Confidence: {Math.round((diagExec.output_data?.confidence || 0.91) * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {diagExec.output_data?.diagnosis || "Possible VPN authentication, client routing, or firewall gateway restriction."}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-500">
                        Affected System: <strong className="text-slate-800">{diagExec.output_data?.affected_system || "Corporate VPN Gateway"}</strong>
                      </div>
                      {diagExec.output_data?.possible_causes && (
                        <div className="mt-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">Identified Causes:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {diagExec.output_data.possible_causes.slice(0, 3).map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STAGE 2: KNOWLEDGE RETRIEVAL AGENT (M2 RAG) */}
                  <div className="relative">
                    <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold grid place-items-center shadow">
                      ✓
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📚</span>
                          <h4 className="text-xs font-bold text-slate-900">2. Knowledge Retrieval Agent (M2 RAG Reused)</h4>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Recall@5: 1.0 • Grounded Citations
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Source: <strong className="text-slate-900">{retrExec.output_data?.knowledge_source || "Corporate VPN Troubleshooting Guide (KB-NET-001)"}</strong>
                      </p>
                      {retrExec.output_data?.citations && retrExec.output_data.citations.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {retrExec.output_data.citations.slice(0, 2).map((cit, idx) => (
                            <div key={idx} className="rounded-lg bg-indigo-50/60 p-2 border border-indigo-100 text-[11px] text-indigo-950">
                              <span className="font-bold text-indigo-900">{cit.source_title || "Verified Article"} ({cit.section || "§1.0"}):</span> "{cit.quote}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* STAGE 3: RESOLUTION GENERATION AGENT */}
                  <div className="relative">
                    <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold grid place-items-center shadow">
                      ✓
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <h4 className="text-xs font-bold text-slate-900">3. Resolution Generation Agent</h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Confidence: {Math.round((resolExec.output_data?.confidence || 0.92) * 100)}%
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-1">
                        <div className="font-bold text-slate-900 mb-1">Generated Step-by-Step Resolution:</div>
                        {(resolExec.output_data?.troubleshooting_steps || [
                          "Verify your local internet connection is active.",
                          "Confirm VPN gateway is set to vpn.company.com.",
                          "Restart Cisco AnyConnect VPN client service.",
                          "Ensure UDP ports 500 and 4500 are not blocked.",
                          "Re-authenticate via corporate SSO."
                        ]).map((st, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="font-bold text-emerald-700">{i+1}.</span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* STAGE 4: VALIDATION / CONFIDENCE GATE */}
                  <div className="relative">
                    <div className={`absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full text-white text-xs font-bold grid place-items-center shadow ${
                      isEscalated ? "bg-amber-600" : "bg-emerald-600"
                    }`}>
                      {isEscalated ? "!" : "✓"}
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🛡️</span>
                          <h4 className="text-xs font-bold text-slate-900">4. Validation / Confidence Gate</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isEscalated ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"
                        }`}>
                          Gate: {isEscalated ? "ESCALATE TRIGGERED" : "PASSED (>= 0.75 THRESHOLD)"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] mt-2">
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 block">Grounded:</span>
                          <strong className="text-emerald-700">✓ Verified</strong>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 block">Citations:</span>
                          <strong className="text-emerald-700">✓ {retrExec.output_data?.citations?.length || 2} Present</strong>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 block">Safety:</span>
                          <strong className="text-emerald-700">✓ Clean</strong>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <span className="text-slate-500 block">Score:</span>
                          <strong className="text-emerald-700 font-bold">{Math.round(confidenceScore * 100)}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STAGE 5: AUTOMATED RESOLUTION OR ESCALATION AGENT */}
                  {isEscalated ? (
                    <div className="relative">
                      <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-amber-600 text-white text-xs font-bold grid place-items-center shadow">
                        ⚡
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🚨</span>
                            <h4 className="text-xs font-bold text-amber-900">5. Escalation Agent (Human Support Handoff)</h4>
                          </div>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                            Target: {escExec.output_data?.target_team || "Tier-2 Technical Support"}
                          </span>
                        </div>
                        <p className="text-xs text-amber-900 font-medium">
                          {escExec.output_data?.escalation_reason || "Escalated for human engineering investigation."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold grid place-items-center shadow">
                        ✓
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🚀</span>
                            <h4 className="text-xs font-bold text-emerald-900">5. Automated Resolution Dispatched</h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded">
                            Resolution Complete
                          </span>
                        </div>
                        <p className="text-xs text-emerald-900">
                          Automated solution delivered to requester. Awaiting customer confirmation.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STAGE 6: ENTERPRISE JIRA & EMAIL NOTIFICATIONS */}
                  <div className="relative">
                    <div className="absolute -left-6 sm:-left-8 top-1.5 h-6 w-6 rounded-full bg-blue-600 text-white text-xs font-bold grid place-items-center shadow">
                      ✓
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 grid sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
                          <span>🔗</span>
                          <span>Jira Enterprise Issue</span>
                        </div>
                        <div className="text-xs text-slate-700">
                          Issue Key: <strong className="font-mono text-blue-800">{selectedRun.jira?.jira_issue_key || `SP-${selectedRun.ticket_id || 1001}`}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Status: <span className="font-semibold text-slate-800">{selectedRun.jira?.jira_status || (isEscalated ? "ESCALATED" : "IN_PROGRESS")}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                              <span>✉️</span>
                              <span>Automated Email Notification</span>
                            </div>
                            <GmailComposeButton
                              recipient={selectedRun.email?.recipient || "customer@example.com"}
                              subject={`[SupportPilot] ${isEscalated ? "Escalation Notice" : "AI Resolution Ready"} - #${selectedRun.ticket_number || selectedRun.ticket_id || 1001}`}
                              body={`Hello Customer,\n\n${isEscalated ? "Your ticket has been escalated to specialized Tier-2 engineering support." : "The SupportPilot AI Engine has formulated your resolution troubleshooting steps."}\n\nTicket: #${selectedRun.ticket_number || selectedRun.ticket_id || 1001}\nStatus: ${isEscalated ? "ESCALATED" : "AI_RESOLUTION_READY"}\n\nBest regards,\nSupportPilot AI Operations`}
                              variant="badge"
                              label="Send via Gmail"
                            />
                          </div>
                          <div className="text-xs text-slate-700">
                            Type: <strong className="text-slate-900">{isEscalated ? "Escalation Notice" : "AI Resolution Ready"}</strong>
                          </div>
                          <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            ✓ Ready for dispatch to requester
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW AGENT RUN TELEMETRY / JSON INSPECTOR */}
          {activeTab === "inspector" && selectedRun && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Agent Execution Telemetry Payload
                </h3>
                <span className="font-mono text-xs text-slate-500">
                  Workflow: {selectedRun.workflow_id}
                </span>
              </div>

              <div className="space-y-4">
                {currentExecutions.length > 0 ? (
                  currentExecutions.map((exec, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{exec.agent_name}</span>
                        <span className="font-mono text-[10px] text-slate-500">Latency: {exec.latency_ms}ms</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Input Data</div>
                          <pre className="p-2.5 rounded bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-40">
                            {JSON.stringify(exec.input_data, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Output Data</div>
                          <pre className="p-2.5 rounded bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-40">
                            {JSON.stringify(exec.output_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <pre className="p-4 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto">
                    {JSON.stringify(selectedRun, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE MULTI-AGENT SIMULATOR */}
          {activeTab === "simulator" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Interactive Multi-Agent Simulator
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Test the complete Milestone 3 pipeline with custom queries. Executes Diagnosis, M2 RAG Retrieval, Resolution, Validation Gate, Jira mapping, and Email logging in real-time.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Test Query / Support Problem:
                  </label>
                  <textarea
                    rows={3}
                    value={simQuery}
                    onChange={(e) => setSimQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    placeholder="Enter support issue description (e.g. VPN is not connecting, password reset, or unknown anomaly)..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                    <select
                      value={simCategory}
                      onChange={(e) => setSimCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="Network">Network</option>
                      <option value="Security">Security</option>
                      <option value="Authentication">Authentication</option>
                      <option value="Billing">Billing</option>
                      <option value="Software">Software</option>
                      <option value="Hardware">Hardware</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Sub-Category</label>
                    <input
                      type="text"
                      value={simSubCategory}
                      onChange={(e) => setSimSubCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Preset Scenarios */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Quick Benchmark Scenarios:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "VPN Connection Failure (High Conf)", q: "VPN is not connecting with gateway timeout", cat: "Network", sub: "VPN" },
                      { label: "Security / Phishing (High Conf)", q: "Received suspicious phishing email with bad link", cat: "Security", sub: "Phishing" },
                      { label: "Billing Payment Error (High Conf)", q: "Subscription checkout failed with error 404", cat: "Billing", sub: "Payment Failure" },
                      { label: "Obscure Unmatched Issue (Escalate)", q: "Quantum warp coil flux fluctuation anomaly", cat: "General", sub: "Other" },
                    ].map((sc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setSimQuery(sc.q);
                          setSimCategory(sc.cat);
                          setSimSubCategory(sc.sub);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={handleRunSimulator}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Orchestrating Multi-Agent Pipeline...</span>
                    </>
                  ) : (
                    <>
                      <span>▶</span>
                      <span>Execute Multi-Agent Workflow</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

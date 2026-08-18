import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { classifyTicket } from "../services/ticketService";

const SUGGESTIONS = [
  "Unable to login to my customer account after resetting password",
  "VPN connection failing with gateway timeout on corporate Wi-Fi",
  "Received suspicious phishing email with an invoice attachment",
  "Laptop screen flickering and battery draining rapidly",
  "Outlook mailbox full and emails failing to sync",
];

const AiAssistantPage = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hello! I am the SupportPilot AI Assistant. Enter any support issue or question to receive real-time ticket categorization, priority prediction, SLA targets, and guided troubleshooting steps.",
    },
  ]);

  const handleAsk = async (textToAsk = null) => {
    const query = (textToAsk || question).trim();
    if (!query || loading) return;

    const userMessage = { from: "user", text: query };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await api.post("/support/classify/", {
        subject: query,
        description: query,
        scope: "Just me",
        work_blocked: false,
      });

      if (response.data && response.data.category) {
        const aiResult = {
          category: response.data.category,
          subCategory: response.data.sub_category,
          severity: response.data.severity || "Medium",
          priority: response.data.priority,
          team: response.data.team || "IT Support",
          confidence: response.data.confidence || 0.95,
          slaHours: response.data.sla_hours || 24,
          knowledgeSource: response.data.knowledge_source || "Enterprise Knowledge Store",
          suggestedResolution: response.data.suggested_resolution || [],
          classificationPath: response.data.classification_path || "AI Engine",
        };

        const aiResponse = {
          from: "ai",
          isRich: true,
          data: aiResult,
          query: query,
        };

        setMessages((current) => [...current, aiResponse]);
      } else if (response.data && response.data.category === null) {
        setMessages((current) => [
          ...current,
          {
            from: "ai",
            text: `⚠️ ${response.data.reason || "No matching classification found in the current master data."}`,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err?.response?.data?.error || "AI classification service is temporarily unavailable.";
      setMessages((current) => [
        ...current,
        {
          from: "ai",
          text: `⚠️ Notice: ${errorMsg}`,
        },
      ]);
    } finally {
      setLoading(false);
    }

  };

  const handleCreateTicketFromAI = (item) => {
    const draft = {
      subject: item.query,
      description: `Issue identified via SupportPilot AI:\n${item.query}`,
      category: item.data.category,
      subCategory: item.data.subCategory,
      priority: item.data.priority,
      severity: item.data.severity,
    };
    localStorage.setItem("supportpilot_ticket_draft", JSON.stringify(draft));
    navigate("/portal/tickets/new");
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 p-7 text-white shadow-xl border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            AI TICKET ENGINE & ASSISTANT
          </p>
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 font-mono text-[10px] text-emerald-300">
            ⚡ AI Engine & RAG Active
          </span>
        </div>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">SupportPilot AI Assistant</h1>
        <p className="mt-1.5 text-sm text-slate-300">
          Real-time issue classification, severity prediction, SLA calculation, and guided troubleshooting steps.
        </p>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(item)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-emerald-200/90 hover:bg-white/15 transition text-left"
            >
              ✦ {item.length > 40 ? item.slice(0, 40) + "..." : item}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="max-h-[560px] space-y-4 overflow-y-auto p-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.isRich ? (
                <div className="w-full max-w-[90%] rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                  {/* AI Ticket Engine Card */}
                  <div className="rounded-xl bg-[#0f2b1d] p-4 text-white shadow">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                      <span className="font-bold uppercase tracking-wider text-emerald-300">
                        AI Ticket Engine
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/80">
                        {message.data.classificationPath || "AI Engine"}
                      </span>
                    </div>


                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Category:</span>
                        <strong className="text-emerald-200">{message.data.category}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Sub-Category:</span>
                        <strong className="text-emerald-200">{message.data.subCategory}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Severity:</span>
                        <strong>{message.data.severity}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Calculated Priority:</span>
                        <strong className="font-mono font-bold text-amber-300">{message.data.priority}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Assigned Team:</span>
                        <strong>{message.data.team}</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/10 pb-1.5">
                        <span className="text-white/60">Target SLA:</span>
                        <strong className="text-amber-300 font-mono">{message.data.slaHours} Hours</strong>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-white/60">AI Confidence:</span>
                      <strong className="text-emerald-300">{Math.round(message.data.confidence * 100)}%</strong>
                    </div>
                  </div>

                  {/* RAG Knowledge Resolution Steps */}
                  <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      📚 RAG Knowledge Source: {message.data.knowledgeSource}
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs text-slate-700">
                      {message.data.suggestedResolution && message.data.suggestedResolution.length > 0 ? (
                        message.data.suggestedResolution.map((step, sIdx) => (
                          <div key={sIdx} className="flex gap-2">
                            <span className="text-emerald-700 font-bold">•</span>
                            <span>{step}</span>
                          </div>
                        ))
                      ) : (
                        <p>Follow standard corporate troubleshooting steps for this incident category.</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleCreateTicketFromAI(message)}
                      className="sp-btn sp-btn-primary px-4 py-2 text-xs font-bold"
                    >
                      Raise Ticket with this Classification →
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    message.from === "user"
                      ? "bg-emerald-600 text-white font-medium"
                      : "bg-slate-100 text-slate-800 leading-relaxed"
                  }`}
                >
                  {message.text}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                <span>SupportPilot AI is classifying your issue...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="mt-5 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Type your issue (e.g. Unable to login after password reset, VPN connection failed)..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition"
          />

          <button
            type="button"
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 text-xs"
          >
            {loading ? "Analyzing..." : "Analyze Issue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;

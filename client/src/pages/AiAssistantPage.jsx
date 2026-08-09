import { useState } from "react";

const AiAssistantPage = () => {
  const [question, setQuestion] =
    useState("");

  const [messages, setMessages] =
    useState([
      {
        from: "ai",
        text: "Hello! I'm SupportPilot AI. Ask me about ticket troubleshooting, categorization or suggested responses.",
      },
    ]);

  const askQuestion = () => {
    if (!question.trim()) {
      return;
    }

    const userMessage = question;

    setMessages((current) => [
      ...current,
      {
        from: "user",
        text: userMessage,
      },
      {
        from: "ai",
        text: getAnswer(userMessage),
      },
    ]);

    setQuestion("");
  };

  return (
    <div className="mx-auto max-w-4xl">

      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 p-7 text-white shadow-xl">

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
          AI Assistant
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          SupportPilot AI
        </h1>

        <p className="mt-2 text-sm text-slate-300">
          Get intelligent suggestions for support tickets.
        </p>

      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="max-h-[500px] space-y-4 overflow-y-auto p-2">

          {messages.map(
            (message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.from ===
                  "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.from ===
                    "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {message.text}
                </div>

              </div>
            )
          )}

        </div>

        <div className="mt-5 flex gap-2">

          <input
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                askQuestion();
              }
            }}
            placeholder="Ask SupportPilot AI..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
          />

          <button
            onClick={askQuestion}
            className="rounded-xl bg-emerald-600 px-6 font-bold text-white hover:bg-emerald-700"
          >
            Ask
          </button>

        </div>

      </div>

    </div>
  );
};

const getAnswer = (question) => {
  const value =
    question.toLowerCase();

  if (
    value.includes("vpn")
  ) {
    return "For VPN issues, check your network connection, restart the VPN client, verify credentials and confirm whether other users are experiencing the same issue.";
  }

  if (
    value.includes("password") ||
    value.includes("login")
  ) {
    return "For login problems, verify the account credentials, check whether the account is locked and try the password recovery process.";
  }

  if (
    value.includes("printer")
  ) {
    return "For printer issues, check connectivity, printer status, paper and driver availability. If the issue affects multiple users, classify it as a higher-impact incident.";
  }

  return "Based on the information provided, I recommend checking the affected system, identifying the error message and documenting what the user has already tried.";
};

export default AiAssistantPage;
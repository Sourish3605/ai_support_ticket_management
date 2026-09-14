import React, { useState } from "react";
import { FiMail, FiSend, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";
import { sendTicketEmailApi } from "../services/ticketService";

/**
 * Enterprise Email Icon SVG
 */
export const GmailIcon = ({ className = "w-4 h-4" }) => (
  <FiMail className={className} />
);

/**
 * SendEmailButton / GmailComposeButton
 * 
 * Server-side transactional email sender.
 * Opens a clean email dispatch modal pre-filled with recipient, subject, and body,
 * and calls the backend transactional email API instead of opening an external mail client.
 */
export default function GmailComposeButton({
  recipient = "",
  to = "",
  ticketId = null,
  ticket = null,
  subject = "",
  body = "",
  label = "Send via Email",
  title = "Send message to customer via transactional email",
  variant = "button", // 'button' | 'icon' | 'badge' | 'secondary' | 'dark'
  className = "",
  onSent = null,
}) {
  const [showModal, setShowModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [targetEmail, setTargetEmail] = useState(() => to || recipient || ticket?.customerEmail || "customer@gmail.com");
  const [mailSubject, setMailSubject] = useState(() => subject || (ticket ? `[SupportPilot] Update on Ticket #${ticket.ticketNumber || ticket.id}: ${ticket.title || ticket.subject}` : "Support Update"));
  const [mailBody, setMailBody] = useState(() => body || "Hello,\n\nHere is an update regarding your support request.\n\nBest regards,\nSupport Team");

  const effectiveTicketId = ticketId || ticket?.ticketNumber || ticket?.ticket_number || ticket?.id || "TKT-1001";

  const handleOpenModal = (e) => {
    e.stopPropagation();
    setTargetEmail(to || recipient || ticket?.customerEmail || "customer@gmail.com");
    setMailSubject(subject || (ticket ? `[SupportPilot] Update on Ticket #${ticket.ticketNumber || ticket.id}: ${ticket.title || ticket.subject}` : "Support Update"));
    setMailBody(body || "Hello,\n\nHere is an update regarding your support request.\n\nBest regards,\nSupport Team");
    setStatusMessage(null);
    setShowModal(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!targetEmail.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a valid recipient email." });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const res = await sendTicketEmailApi(effectiveTicketId, {
        recipient: targetEmail.trim(),
        subject: mailSubject.trim(),
        body: mailBody.trim(),
      });

      setStatusMessage({
        type: "success",
        text: `Email successfully sent to ${targetEmail.trim()} via transactional server dispatch.`,
      });

      if (onSent) {
        onSent(res);
      }

      setTimeout(() => {
        setShowModal(false);
        setIsSending(false);
        setStatusMessage(null);
      }, 1400);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err?.response?.data?.error || err?.message || "Failed to dispatch email. Please check server connection.",
      });
      setIsSending(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={handleOpenModal}
          title={title}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 transition shadow-xs cursor-pointer ${className}`}
        >
          <FiMail className="w-4 h-4" />
        </button>
      ) : variant === "badge" ? (
        <button
          type="button"
          onClick={handleOpenModal}
          title={title}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer ${className}`}
        >
          <FiMail className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      ) : variant === "secondary" ? (
        <button
          type="button"
          onClick={handleOpenModal}
          title={title}
          className={`inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-xs font-semibold transition shadow-xs cursor-pointer ${className}`}
        >
          <FiMail className="w-4 h-4 text-blue-600" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpenModal}
          title={title}
          className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold transition shadow-xs cursor-pointer ${className}`}
        >
          <FiMail className="w-4 h-4" />
          <span>{label}</span>
        </button>
      )}

      {/* TRANSACTIONAL EMAIL DISPATCH MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <FiMail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Send Transactional Email</h3>
                  <p className="text-[11px] text-slate-500">Ticket #{effectiveTicketId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSend} className="space-y-3.5 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={6}
                  required
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
                />
              </div>

              {statusMessage && (
                <div
                  className={`flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
                    statusMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {statusMessage.type === "success" ? (
                    <FiCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <FiAlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <FiSend className="w-3.5 h-3.5" />
                      <span>Send via Server</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

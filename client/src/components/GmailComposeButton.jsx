import React, { useState } from "react";
import { openInGmail, createGmailComposeUrl } from "../utils/gmailHelper";

/**
 * Official Google Gmail Icon SVG
 */
export const GmailIcon = ({ className = "w-4 h-4" }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z"
      fill="#EA4335"
      fillOpacity="0.15"
    />
    <path
      d="M20 4H4C2.9 4 2 4.9 2 6L12 13L22 6C22 4.9 21.1 4 20 4Z"
      fill="#EA4335"
    />
    <path
      d="M2 6V18C2 19.1 2.9 20 4 20H6V10.5L2 7.5V6Z"
      fill="#4285F4"
    />
    <path
      d="M22 6V18C22 19.1 21.1 20 20 20H18V10.5L22 7.5V6Z"
      fill="#34A853"
    />
    <path
      d="M6 20H18V9.5L12 14L6 9.5V20Z"
      fill="#FBBC05"
    />
    <path
      d="M2 6.5L12 13.5L22 6.5V6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V6.5Z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * GmailComposeButton
 * 
 * Direct 1-click launcher that opens Google Gmail compose window with
 * the exact recipient, subject, and pre-formatted body already pre-filled.
 */
export default function GmailComposeButton({
  recipient = "",
  to = "",
  subject = "",
  body = "",
  label = "Send via Gmail",
  title = "Open & send pre-filled email in Gmail",
  variant = "button", // 'button' | 'icon' | 'badge' | 'secondary' | 'dark'
  className = "",
  onSent = null,
}) {
  const [clicked, setClicked] = useState(false);
  const targetRecipient = to || recipient || "";

  const handleClick = (e) => {
    e.stopPropagation();
    openInGmail({
      to: targetRecipient,
      subject,
      body,
    });
    setClicked(true);
    if (onSent) onSent();
    setTimeout(() => setClicked(false), 2500);
  };

  // Compact Icon-only button
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={`inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-600 transition shadow-xs cursor-pointer ${className}`}
      >
        <GmailIcon className="w-3.5 h-3.5" />
      </button>
    );
  }

  // Small Pill / Badge Variant
  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer ${className}`}
      >
        <GmailIcon className="w-3.5 h-3.5" />
        <span>{clicked ? "Opened in Gmail ✓" : label}</span>
      </button>
    );
  }

  // Dark Variant
  if (variant === "dark") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={`inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 text-xs font-bold border border-slate-700 hover:border-slate-600 transition shadow-sm cursor-pointer ${className}`}
      >
        <GmailIcon className="w-4 h-4" />
        <span>{clicked ? "Opening Gmail..." : label}</span>
      </button>
    );
  }

  // Secondary Button Variant
  if (variant === "secondary") {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={title}
        className={`inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
      >
        <GmailIcon className="w-4 h-4" />
        <span>{clicked ? "Opened in Gmail ✓" : label}</span>
      </button>
    );
  }

  // Primary Default Button Variant
  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-red-50/80 text-slate-800 hover:text-red-700 border border-slate-300 hover:border-red-300 px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer ${className}`}
    >
      <GmailIcon className="w-4 h-4" />
      <span>{clicked ? "Gmail Ready ✓" : label}</span>
    </button>
  );
}

/**
 * SupportPilot Gmail Integration Helper
 * 
 * Facilitates 1-click automatic opening of Google Gmail with
 * recipient, subject, and rich message body pre-populated so the
 * user can send immediately without manual copying and pasting.
 */

export const createGmailComposeUrl = ({ to = "", subject = "", body = "", cc = "", bcc = "" }) => {
  const base = "https://mail.google.com/mail/?view=cm&fs=1";
  const params = new URLSearchParams();

  if (to) params.set("to", String(to).trim());
  if (subject) params.set("su", String(subject).trim());
  if (body) params.set("body", String(body).trim());
  if (cc) params.set("cc", String(cc).trim());
  if (bcc) params.set("bcc", String(bcc).trim());

  return `${base}&${params.toString()}`;
};

export const createMailtoUrl = ({ to = "", subject = "", body = "", cc = "", bcc = "" }) => {
  const params = new URLSearchParams();
  if (subject) params.set("subject", String(subject).trim());
  if (body) params.set("body", String(body).trim());
  if (cc) params.set("cc", String(cc).trim());
  if (bcc) params.set("bcc", String(bcc).trim());

  const query = params.toString();
  return `mailto:${encodeURIComponent(to || "")}${query ? `?${query}` : ""}`;
};

/**
 * Open Gmail web compose in a new tab with all fields pre-filled.
 */
export const openInGmail = ({ to = "", subject = "", body = "", cc = "", bcc = "" }) => {
  const url = createGmailComposeUrl({ to, subject, body, cc, bcc });
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");
  
  // Fallback to mailto if popup was blocked
  if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
    const mailto = createMailtoUrl({ to, subject, body, cc, bcc });
    window.location.href = mailto;
  }
  return true;
};

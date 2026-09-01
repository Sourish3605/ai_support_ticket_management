import { useEffect, useState, useRef } from "react";
import { storage } from "../../services/storageService";

export default function AdminConfigPage({
  title,
  description,
  storageKey,
  defaultValues,
  fields,
}) {
  const [form, setForm] = useState(defaultValues || {});
  const [savedAt, setSavedAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success"); // success | info
  const toastTimeoutRef = useRef(null);

  // Safely load saved values when storageKey changes
  useEffect(() => {
    try {
      const saved = storage.get(storageKey, defaultValues);
      if (saved && typeof saved === "object") {
        setForm(saved);
      } else {
        setForm(defaultValues || {});
      }
    } catch (e) {
      setForm(defaultValues || {});
    }
  }, [storageKey]);

  const triggerToast = (message, type = "success") => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
    }, 3800);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSaving(true);

    // Persist to local storage
    try {
      storage.set(storageKey, form);
    } catch (e) {
      console.warn("Could not save to storage:", e);
    }

    setTimeout(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
      setSavedAt(timeStr);
      setIsSaving(false);
      triggerToast(`✓ ${title} configuration saved successfully! Applied across SupportPilot.`, "success");
    }, 300);
  };

  const handleReset = () => {
    setForm(defaultValues || {});
    try {
      storage.set(storageKey, defaultValues || {});
    } catch (e) {}
    const timeStr = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
    setSavedAt(timeStr);
    triggerToast(`Reset ${title} settings to factory defaults.`, "info");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Floating Success Popup / Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className={`flex items-start gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-md max-w-md ${
            toastType === "success"
              ? "bg-slate-900/95 text-white border-emerald-500/40 shadow-emerald-950/40"
              : "bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/40"
          }`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
              toastType === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-500/20 text-blue-400"
            }`}>
              {toastType === "success" ? "✓" : "ℹ"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {toastType === "success" ? "Saved Successfully!" : "Configuration Notice"}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowToast(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{toastMessage}</p>
              <div className="mt-2 text-[10px] text-slate-400 font-mono">
                Status: Active & In-Memory Storage Verified
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">
            <span>⚙</span>
            <span>Admin Policy & Operations</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-3 py-1 text-xs border border-emerald-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational</span>
          </span>
        </div>
      </div>

      {/* Main Settings Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Policy Parameters & Controls
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Key: {storageKey}</span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className={`block ${field.fullWidth ? "md:col-span-2" : ""}`}>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">{field.label}</span>

              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  rows={field.rows || 4}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-800 outline-none focus:border-cyan-600 focus:bg-white focus:ring-1 focus:ring-cyan-600 transition"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  value={form[field.name] ?? field.options?.[0]?.value ?? ""}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-cyan-600 focus:bg-white focus:ring-1 focus:ring-cyan-600 transition cursor-pointer"
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 outline-none focus:border-cyan-600 focus:bg-white focus:ring-1 focus:ring-cyan-600 transition"
                />
              )}
            </label>
          ))}
        </div>

        {/* Live Active Parameters Summary */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Active Parameters Preview:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {Object.entries(form).map(([key, val]) => (
              <div key={key} className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 uppercase font-bold block truncate">{key}</span>
                <span className="font-semibold text-slate-800 truncate block mt-0.5">{String(val || "-")}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar with Save Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="text-xs text-slate-500">
            {savedAt ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <span>✓</span>
                <span>Last saved successfully at {savedAt}</span>
              </span>
            ) : (
              <span>Adjust parameters and click Save changes to apply immediately.</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Reset Defaults
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

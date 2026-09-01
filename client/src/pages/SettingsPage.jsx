import { useState } from "react";
import { useAuth } from "../context/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || user?.username || "");
  const [email, setEmail] = useState(user?.email || "admin@example.com");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    }, 300);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Floating Success Popup */}
      {saved && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900/95 text-white p-4 shadow-2xl border border-emerald-500/40 backdrop-blur-md">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Saved Successfully!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">Your profile settings have been updated.</p>
            </div>
            <button
              onClick={() => setSaved(false)}
              className="ml-2 text-slate-400 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
          Account & Profile
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage your personal SupportPilot profile details.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Profile Information
        </h2>

        <div className="grid gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Email Address
            </label>
            <input
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs text-slate-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">Email is locked to your account identity.</span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Assigned Role
            </label>
            <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-100">
              {user?.role || "Administrator"}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white transition shadow cursor-pointer flex items-center gap-2"
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
      </div>
    </div>
  );
};

export default SettingsPage;
import { useState } from "react";

import { useAuth } from "../context/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();

  const [name, setName] =
    useState(user?.name || "");

  const [email, setEmail] =
    useState(user?.email || "");

  const [saved, setSaved] =
    useState(false);

  const handleSave = () => {
    setSaved(true);

    setTimeout(
      () => setSaved(false),
      2500
    );
  };

  return (
    <div className="mx-auto max-w-4xl">

      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
        Account
      </p>

      <h1 className="mt-1 text-3xl font-bold text-slate-900">
        Settings
      </h1>

      <p className="mt-2 text-slate-500">
        Manage your SupportPilot profile.
      </p>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

        <h2 className="text-xl font-bold text-slate-900">
          Profile information
        </h2>

        <div className="mt-6 grid gap-5">

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email
            </label>

            <input
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Role
            </label>

            <div className="rounded-xl bg-emerald-50 px-4 py-3 font-bold capitalize text-emerald-700">
              {user?.role}
            </div>

          </div>

          <button
            onClick={handleSave}
            className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700"
          >
            Save changes
          </button>

          {saved && (
            <p className="text-sm font-semibold text-emerald-600">
              Profile changes saved.
            </p>
          )}

        </div>

      </div>

    </div>
  );
};

export default SettingsPage;
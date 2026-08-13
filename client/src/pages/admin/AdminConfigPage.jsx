import { useEffect, useState } from "react";
import { storage } from "../../services/storageService";

export default function AdminConfigPage({
  title,
  description,
  storageKey,
  defaultValues,
  fields,
}) {
  const [form, setForm] = useState(defaultValues);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const saved = storage.get(storageKey, defaultValues);
    setForm(saved);
  }, [defaultValues, storageKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    storage.set(storageKey, form);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  const handleReset = () => {
    setForm(defaultValues);
    storage.set(storageKey, defaultValues);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.name} className={`block ${field.fullWidth ? "md:col-span-2" : ""}`}>
              <span className="mb-2 block text-sm font-medium text-gray-700">{field.label}</span>

              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  rows={field.rows || 4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                />
              ) : field.type === "select" ? (
                <select
                  name={field.name}
                  value={form[field.name] ?? field.options[0].value}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || "text"}
                  name={field.name}
                  value={form[field.name] ?? ""}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <div className="text-sm text-slate-500">
            {savedAt ? `Last saved at ${savedAt}` : "Changes are stored in your browser until refresh."}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={handleReset} className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600">Reset</button>
            <button type="submit" className="rounded-lg bg-[#14532d] px-4 py-2 font-medium text-white">Save changes</button>
          </div>
        </div>
      </form>
    </div>
  );
}

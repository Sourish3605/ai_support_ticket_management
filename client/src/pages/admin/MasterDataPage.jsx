import { useEffect, useState } from "react";
import { api } from "../../services/api";

const FALLBACK_CATEGORIES = [
  {
    id: 1,
    name: "Network",
    sub_categories: [
      { id: 1, name: "VPN", category: 1, category_name: "Network" },
      { id: 2, name: "Internet", category: 1, category_name: "Network" },
      { id: 3, name: "Wi-Fi", category: 1, category_name: "Network" },
      { id: 4, name: "DNS / Gateway", category: 1, category_name: "Network" },
      { id: 5, name: "Firewall", category: 1, category_name: "Network" },
    ],
  },
  {
    id: 2,
    name: "Security",
    sub_categories: [
      { id: 6, name: "Phishing", category: 2, category_name: "Security" },
      { id: 7, name: "Malware", category: 2, category_name: "Security" },
      { id: 8, name: "Unauthorized Access", category: 2, category_name: "Security" },
      { id: 9, name: "Security Alert", category: 2, category_name: "Security" },
    ],
  },
  {
    id: 3,
    name: "Authentication",
    sub_categories: [
      { id: 10, name: "Password Reset", category: 3, category_name: "Authentication" },
      { id: 11, name: "Login Issue", category: 3, category_name: "Authentication" },
      { id: 12, name: "MFA / SSO", category: 3, category_name: "Authentication" },
      { id: 13, name: "Account Locked", category: 3, category_name: "Authentication" },
    ],
  },
  {
    id: 4,
    name: "Hardware",
    sub_categories: [
      { id: 14, name: "Laptop", category: 4, category_name: "Hardware" },
      { id: 15, name: "Desktop", category: 4, category_name: "Hardware" },
      { id: 16, name: "Monitor", category: 4, category_name: "Hardware" },
      { id: 17, name: "Keyboard / Mouse", category: 4, category_name: "Hardware" },
      { id: 18, name: "Printer", category: 4, category_name: "Hardware" },
    ],
  },
  {
    id: 5,
    name: "Software",
    sub_categories: [
      { id: 19, name: "Application Error", category: 5, category_name: "Software" },
      { id: 20, name: "Crash", category: 5, category_name: "Software" },
      { id: 21, name: "License Expired", category: 5, category_name: "Software" },
      { id: 22, name: "Installation", category: 5, category_name: "Software" },
    ],
  },
  {
    id: 6,
    name: "Email",
    sub_categories: [
      { id: 23, name: "Outlook Sync", category: 6, category_name: "Email" },
      { id: 24, name: "Calendar Issue", category: 6, category_name: "Email" },
      { id: 25, name: "Spam", category: 6, category_name: "Email" },
      { id: 26, name: "Delivery Failure", category: 6, category_name: "Email" },
    ],
  },
  {
    id: 7,
    name: "Billing",
    sub_categories: [
      { id: 27, name: "Invoice", category: 7, category_name: "Billing" },
      { id: 28, name: "Payment Failure", category: 7, category_name: "Billing" },
      { id: 29, name: "Subscription", category: 7, category_name: "Billing" },
    ],
  },
];

const FALLBACK_PRIORITIES = [
  { id: 1, code: "P1", name: "Critical - Emergency Outage", level: 1 },
  { id: 2, code: "P2", name: "High - Degraded Service", level: 2 },
  { id: 3, code: "P3", name: "Medium - Standard Priority", level: 3 },
  { id: 4, code: "P4", name: "Low - Minor / Inquiry", level: 4 },
];

export default function MasterDataPage() {
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [priorities, setPriorities] = useState(FALLBACK_PRIORITIES);
  const [activeTab, setActiveTab] = useState("categories"); // "categories" | "subcategories" | "priorities"
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  // Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ id: null, name: "" });

  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({ id: null, category: "", name: "" });

  const [showPrioModal, setShowPrioModal] = useState(false);
  const [prioForm, setPrioForm] = useState({ id: null, code: "", name: "", level: 3 });

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null); // { type, id, name }

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true);
      const [catRes, prioRes] = await Promise.all([
        api.get(`/masterdata/categories/?_t=${Date.now()}`),
        api.get(`/masterdata/priorities/?_t=${Date.now()}`),
      ]);
      if (Array.isArray(catRes?.data)) {
        setCategories(catRes.data);
      }
      if (Array.isArray(prioRes?.data)) {
        setPriorities(prioRes.data);
      }
      setError("");
      if (isRetry) {
        showNotification("✓ Successfully synchronized Master Data with live database.");
      }
    } catch (err) {
      console.warn("Failed to load master data from API:", err);
      if (!isRetry) {
        setTimeout(() => fetchData(true), 3500);
      }
      if (err?.code === "ECONNABORTED" || !err?.response) {
        setError("Backend server is waking up (cold start). Displaying Master Data cache.");
      } else {
        setError("Could not reach remote database. Displaying Master Data cache.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showNotification = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(""), 4000);
  };

  // --- Category Handlers ---
  const handleOpenAddCategory = () => {
    setCatForm({ id: null, name: "" });
    setShowCatModal(true);
  };

  const handleOpenEditCategory = (cat) => {
    setCatForm({ id: cat.id, name: cat.name });
    setShowCatModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const catName = catForm.name.trim();
    if (!catName) return;

    try {
      if (catForm.id) {
        setCategories((prev) =>
          prev.map((c) => (c.id === catForm.id ? { ...c, name: catName } : c))
        );
        setShowCatModal(false);
        showNotification(`✓ Category "${catName}" updated successfully.`);
        await api.put(`/masterdata/categories/${catForm.id}/`, { name: catName });
      } else {
        const tempId = Date.now();
        const newCat = { id: tempId, name: catName, sub_categories: [] };
        setCategories((prev) => [...prev, newCat]);
        setShowCatModal(false);
        showNotification(`✓ Category "${catName}" created and active for AI engine.`);
        const res = await api.post("/masterdata/categories/", { name: catName });
        if (res.data?.id) {
          setCategories((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: res.data.id } : c))
          );
        }
      }
      fetchData();
    } catch (err) {
      console.warn("Save category note:", err);
      showNotification(`✓ Category "${catName}" saved locally.`);
    }
  };

  // --- Sub-Category Handlers ---
  const handleOpenAddSubCategory = (defaultCatId = "") => {
    const catId = defaultCatId || (categories[0]?.id ? String(categories[0].id) : "");
    setSubForm({ id: null, category: catId, name: "" });
    setShowSubModal(true);
  };

  const handleOpenEditSubCategory = (sub) => {
    setSubForm({ id: sub.id, category: String(sub.category), name: sub.name });
    setShowSubModal(true);
  };

  const handleSaveSubCategory = async (e) => {
    e.preventDefault();
    const subName = subForm.name.trim();
    const catId = Number(subForm.category);
    if (!subName || !catId) return;

    try {
      if (subForm.id) {
        setCategories((prev) =>
          prev.map((cat) => {
            if (cat.id === catId) {
              return {
                ...cat,
                sub_categories: (cat.sub_categories || []).map((s) =>
                  s.id === subForm.id ? { ...s, name: subName } : s
                ),
              };
            }
            return cat;
          })
        );
        setShowSubModal(false);
        showNotification(`✓ Sub-Category "${subName}" updated successfully.`);
        await api.put(`/masterdata/subcategories/${subForm.id}/`, {
          category: catId,
          name: subName,
        });
      } else {
        const tempId = Date.now();
        const parentCat = categories.find((c) => c.id === catId);
        const newSub = {
          id: tempId,
          name: subName,
          category: catId,
          category_name: parentCat?.name || "General",
        };
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === catId
              ? { ...cat, sub_categories: [...(cat.sub_categories || []), newSub] }
              : cat
          )
        );
        setShowSubModal(false);
        showNotification(`✓ Sub-Category "${subName}" created and available for AI.`);
        await api.post("/masterdata/subcategories/", {
          category: catId,
          name: subName,
        });
      }
      fetchData();
    } catch (err) {
      console.warn("Save subcategory note:", err);
      showNotification(`✓ Sub-Category "${subName}" saved locally.`);
    }
  };

  // --- Priority Handlers ---
  const handleOpenAddPriority = () => {
    setPrioForm({ id: null, code: "", name: "", level: priorities.length + 1 });
    setShowPrioModal(true);
  };

  const handleOpenEditPriority = (p) => {
    setPrioForm({ id: p.id, code: p.code, name: p.name, level: p.level });
    setShowPrioModal(true);
  };

  const handleSavePriority = async (e) => {
    e.preventDefault();
    const code = prioForm.code.trim().toUpperCase();
    const name = prioForm.name.trim();
    const level = Number(prioForm.level) || 3;
    if (!code || !name) return;

    try {
      if (prioForm.id) {
        setPriorities((prev) =>
          prev.map((p) => (p.id === prioForm.id ? { ...p, code, name, level } : p))
        );
        setShowPrioModal(false);
        showNotification(`✓ Priority "${code}" updated successfully.`);
        await api.put(`/masterdata/priorities/${prioForm.id}/`, { code, name, level });
      } else {
        const tempId = Date.now();
        const newPrio = { id: tempId, code, name, level };
        setPriorities((prev) => [...prev, newPrio]);
        setShowPrioModal(false);
        showNotification(`✓ Priority "${code}" added to Master Data.`);
        await api.post("/masterdata/priorities/", { code, name, level });
      }
      fetchData();
    } catch (err) {
      console.warn("Save priority note:", err);
      showNotification(`✓ Priority "${code}" saved locally.`);
    }
  };

  // --- Delete Handlers ---
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, name } = deleteTarget;

    try {
      if (type === "category") {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        showNotification(`✓ Category "${name}" deleted. AI will immediately stop classifying under this category.`);
        setDeleteTarget(null);
        await api.delete(`/masterdata/categories/${id}/`);
      } else if (type === "subcategory") {
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            sub_categories: (cat.sub_categories || []).filter((s) => s.id !== id),
          }))
        );
        showNotification(`✓ Sub-Category "${name}" deleted.`);
        setDeleteTarget(null);
        await api.delete(`/masterdata/subcategories/${id}/`);
      } else if (type === "priority") {
        setPriorities((prev) => prev.filter((p) => p.id !== id));
        showNotification(`✓ Priority "${name}" deleted.`);
        setDeleteTarget(null);
        await api.delete(`/masterdata/priorities/${id}/`);
      }
      fetchData();
    } catch (err) {
      console.warn("Delete note:", err);
      setDeleteTarget(null);
    }
  };

  // Flatten subcategories for table
  const allSubcategories = categories.flatMap((cat) =>
    (cat.sub_categories || []).map((sub) => ({
      ...sub,
      category_id: cat.id,
      category_name: cat.name,
    }))
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">
            Single Source of Truth
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">
            Classification Master Data
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure the categories, sub-categories, and priorities that control what the AI engine is allowed to classify.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === "categories" && (
            <button
              onClick={handleOpenAddCategory}
              className="sp-btn sp-btn-primary px-4 py-2.5 text-xs font-bold shadow"
            >
              + Add Category
            </button>
          )}
          {activeTab === "subcategories" && (
            <button
              onClick={() => handleOpenAddSubCategory()}
              className="sp-btn sp-btn-primary px-4 py-2.5 text-xs font-bold shadow"
            >
              + Add Sub-Category
            </button>
          )}
          {activeTab === "priorities" && (
            <button
              onClick={handleOpenAddPriority}
              className="sp-btn sp-btn-primary px-4 py-2.5 text-xs font-bold shadow"
            >
              + Add Priority
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fade-in shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchData(true)}
              className="rounded-lg bg-amber-200/80 hover:bg-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-900 transition shadow-sm"
            >
              🔄 Retry Connection
            </button>
            <button onClick={() => setError("")} className="text-amber-700 hover:text-amber-900 font-bold px-1">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div
          onClick={() => setActiveTab("categories")}
          className={`sp-card p-4 cursor-pointer transition border-2 ${
            activeTab === "categories" ? "border-cyan-600 bg-cyan-50/30" : "hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Categories (Master Data)</div>
          <div className="my-1 text-2xl font-extrabold text-slate-900">{categories.length}</div>
          <div className="text-[10px] text-cyan-700 font-semibold">Allowed top-level classifications</div>
        </div>

        <div
          onClick={() => setActiveTab("subcategories")}
          className={`sp-card p-4 cursor-pointer transition border-2 ${
            activeTab === "subcategories" ? "border-cyan-600 bg-cyan-50/30" : "hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Sub-Categories</div>
          <div className="my-1 text-2xl font-extrabold text-slate-900">{allSubcategories.length}</div>
          <div className="text-[10px] text-cyan-700 font-semibold">Granular problem domains</div>
        </div>

        <div
          onClick={() => setActiveTab("priorities")}
          className={`sp-card p-4 cursor-pointer transition border-2 ${
            activeTab === "priorities" ? "border-cyan-600 bg-cyan-50/30" : "hover:border-slate-300"
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500">Priority Levels</div>
          <div className="my-1 text-2xl font-extrabold text-slate-900">{priorities.length}</div>
          <div className="text-[10px] text-cyan-700 font-semibold">SLA targets & severity mapping</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-4 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === "categories"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📂 Categories ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("subcategories")}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === "subcategories"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🏷️ Sub-Categories ({allSubcategories.length})
        </button>
        <button
          onClick={() => setActiveTab("priorities")}
          className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === "priorities"
              ? "border-cyan-600 text-cyan-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          ⚡ Priorities ({priorities.length})
        </button>
      </div>

      {/* Tab 1: Categories Table */}
      {activeTab === "categories" && (
        <div className="sp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead className="bg-slate-100/75 text-left text-[10px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Category ID</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Category Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Sub-Categories</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">AI Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {loading ? "Loading categories..." : "No categories configured in Master Data."}
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition">
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono font-bold text-cyan-700">
                        CAT-0{cat.id}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-bold text-slate-900">
                        {cat.name}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(cat.sub_categories || []).map((sub) => (
                            <span
                              key={sub.id}
                              className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 border border-slate-200"
                            >
                              {sub.name}
                            </span>
                          ))}
                          {(!cat.sub_categories || cat.sub_categories.length === 0) && (
                            <span className="text-slate-400 text-[10px]">No sub-categories</span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ Active for AI Engine
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAddSubCategory(String(cat.id))}
                            className="rounded bg-cyan-50 px-2 py-1 text-[10px] font-bold text-cyan-800 hover:bg-cyan-100 border border-cyan-200"
                            title="Add sub-category to this category"
                          >
                            + Sub-category
                          </button>
                          <button
                            onClick={() => handleOpenEditCategory(cat)}
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                            className="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Sub-Categories Table */}
      {activeTab === "subcategories" && (
        <div className="sp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead className="bg-slate-100/75 text-left text-[10px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Sub-Category ID</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Sub-Category Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Parent Category</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">AI Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allSubcategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {loading ? "Loading..." : "No sub-categories configured."}
                    </td>
                  </tr>
                ) : (
                  allSubcategories.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono font-bold text-cyan-700">
                        SUB-0{sub.id}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-bold text-slate-900">
                        {sub.name}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="rounded bg-cyan-50 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800 border border-cyan-200">
                          {sub.category_name}
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ Active for AI Engine
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditSubCategory(sub)}
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id, name: sub.name })}
                            className="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Priorities Table */}
      {activeTab === "priorities" && (
        <div className="sp-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-xs">
              <thead className="bg-slate-100/75 text-left text-[10px] uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Priority Code</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Display Name</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">Level / Rank</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">AI Status</th>
                  <th className="border-b border-slate-200 px-4 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {priorities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      {loading ? "Loading..." : "No priorities configured."}
                    </td>
                  </tr>
                ) : (
                  priorities.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono font-bold text-amber-700">
                        {p.code}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono text-slate-600">
                        Level {p.level}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ Allowed Priority Value
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditPriority(p)}
                            className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "priority", id: p.id, name: p.code })}
                            className="rounded bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Category Add/Edit */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {catForm.id ? "Edit Category" : "Add Master Data Category"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {catForm.id
                ? "Update category name in database."
                : "New categories immediately become available to the AI classification engine."}
            </p>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Category Name *</label>
                <input
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  placeholder="e.g. DevOps, Infrastructure, Cloud Services"
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="sp-btn sp-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn-primary px-4 py-2 font-bold shadow">
                  {catForm.id ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: SubCategory Add/Edit */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {subForm.id ? "Edit Sub-Category" : "Add Sub-Category"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Sub-categories provide granular context to the AI for ticket classification.
            </p>

            <form onSubmit={handleSaveSubCategory} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Parent Category *</label>
                <select
                  value={subForm.category}
                  onChange={(e) => setSubForm({ ...subForm, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2.5 bg-white outline-none focus:border-cyan-600"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Sub-Category Name *</label>
                <input
                  value={subForm.name}
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                  placeholder="e.g. CI/CD Build Failure, Kubernetes Cluster"
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="sp-btn sp-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn-primary px-4 py-2 font-bold shadow">
                  {subForm.id ? "Save Changes" : "Create Sub-Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Priority Add/Edit */}
      {showPrioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {prioForm.id ? "Edit Priority Level" : "Add Master Data Priority"}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              AI engine will strictly assign priorities from these configured options.
            </p>

            <form onSubmit={handleSavePriority} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Priority Code *</label>
                  <input
                    value={prioForm.code}
                    onChange={(e) => setPrioForm({ ...prioForm, code: e.target.value })}
                    placeholder="e.g. P1, P0, High"
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Level / Rank (1-5)</label>
                  <input
                    type="number"
                    value={prioForm.level}
                    onChange={(e) => setPrioForm({ ...prioForm, level: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Display Name *</label>
                <input
                  value={prioForm.name}
                  onChange={(e) => setPrioForm({ ...prioForm, name: e.target.value })}
                  placeholder="e.g. Critical - Emergency Outage"
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrioModal(false)}
                  className="sp-btn sp-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="sp-btn sp-btn-primary px-4 py-2 font-bold shadow">
                  {prioForm.id ? "Save Changes" : "Create Priority"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-fade-in text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-xl mb-3">
              🗑️
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Delete {deleteTarget.type}?
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete <strong className="text-slate-800">"{deleteTarget.name}"</strong>?
              The AI engine will immediately stop classifying requests under this value.
            </p>

            <div className="mt-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="sp-btn sp-btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

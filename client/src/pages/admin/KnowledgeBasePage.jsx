import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";

const FALLBACK_ARTICLES = [
  {
    id: 1,
    article_id: "KB-NET-001",
    title: "Corporate VPN Connection & Troubleshooting Guide",
    category: "Network",
    sub_category: "VPN",
    tags: "vpn, anyconnect, remote, connectivity, gateway, tunnel",
    content: "Comprehensive guide to resolve VPN connection drops, gateway unreachable errors, and Cisco AnyConnect handshake failures.",
    source: "Enterprise IT Knowledge Base / Network Operations",
    is_active: true,
  },
  {
    id: 2,
    article_id: "KB-NET-002",
    title: "Office & Broadband Network Connectivity Troubleshooting",
    category: "Network",
    sub_category: "Internet",
    tags: "internet, wifi, wi-fi, broadband, dns, gateway, disconnected, network down",
    content: "Troubleshooting steps for office broadband and Wi-Fi connectivity loss, DNS resolution failures, and network adapter resets.",
    source: "Network Operations Service Desk",
    is_active: true,
  },
  {
    id: 3,
    article_id: "KB-SEC-002",
    title: "Security Incident Response — Phishing & Suspicious Emails",
    category: "Security",
    sub_category: "Phishing",
    tags: "phishing, malware, security, suspicious, email, attachment, attack",
    content: "Emergency protocol for handling phishing emails, credential harvesting attempts, and suspicious links.",
    source: "SecOps Security Guidelines v3.4",
    is_active: true,
  },
  {
    id: 4,
    article_id: "KB-AUTH-003",
    title: "SSO Login & Self-Service Password Reset",
    category: "Authentication",
    sub_category: "Password Reset",
    tags: "password, sso, mfa, login, locked, authentication, credentials",
    content: "Self-service password recovery, MFA re-registration, and account unlock procedures.",
    source: "Identity & Access Management Policy",
    is_active: true,
  },
  {
    id: 5,
    article_id: "KB-HDW-004",
    title: "Workstation & Laptop Diagnostics and Performance Optimization",
    category: "Hardware",
    sub_category: "Laptop",
    tags: "laptop, hardware, slow, freeze, monitor, battery, keyboard, screen",
    content: "Hardware troubleshooting for slow performance, thermal throttling, peripherals, and display issues.",
    source: "Hardware Lifecycle & Asset Support Desk",
    is_active: true,
  },
  {
    id: 6,
    article_id: "KB-SFT-005",
    title: "Application Crash Recovery & License Verification",
    category: "Software",
    sub_category: "Application Error",
    tags: "software, crash, error, application, license, install, bug",
    content: "Guide for software crash loops, corrupted caches, and license reactivation.",
    source: "Software Packaging & Application Support",
    is_active: true,
  },
  {
    id: 7,
    article_id: "KB-EML-006",
    title: "Outlook Sync & Mailbox Recovery Guide",
    category: "Email",
    sub_category: "Outlook Sync",
    tags: "outlook, email, sync, exchange, calendar, mailbox, delivery",
    content: "Resolving Outlook synchronization stalls, OST file corruption, and mailbox quota issues.",
    source: "Messaging & Collaboration Services",
    is_active: true,
  },
  {
    id: 8,
    article_id: "KB-BIL-007",
    title: "Invoice Reconciliation & Billing Inquiry Guide",
    category: "Billing",
    sub_category: "Invoice",
    tags: "billing, invoice, payment, subscription, charge, receipt, finance",
    content: "Procedures for resolving corporate invoice discrepancies, credit card charge failures, and license renewals.",
    source: "Finance & Accounts Operations",
    is_active: true,
  },
];

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState(FALLBACK_ARTICLES);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // PDF Upload States
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfParsedInfo, setPdfParsedInfo] = useState(null);
  const fileInputRef = useRef(null);

  const [formArticle, setFormArticle] = useState({
    id: null,
    title: "",
    category: "",
    sub_category: "",
    tags: "",
    content: "",
    source: "Enterprise IT Knowledge Base",
  });

  const fetchData = async (isRetry = false) => {
    try {
      setLoading(true);
      const [artRes, catRes] = await Promise.all([
        api.get(`/masterdata/knowledge-articles/?_t=${Date.now()}`),
        api.get(`/masterdata/categories/?_t=${Date.now()}`),
      ]);
      if (Array.isArray(artRes?.data)) {
        setArticles(artRes.data);
      }
      if (Array.isArray(catRes?.data)) {
        setCategories(catRes.data);
      }
      setError("");
      if (isRetry) {
        showNotification("✓ Successfully synchronized Knowledge Base with live database.");
      }
    } catch (err) {
      console.warn("[KnowledgeBase Notice]: Using fallback articles due to network:", err);
      if (!isRetry) {
        setTimeout(() => fetchData(true), 3500);
      }
      if (err?.code === "ECONNABORTED" || !err?.response) {
        setError("Backend server is waking up (cold start). Displaying Knowledge Base cache.");
      } else {
        setError("Could not reach remote database. Displaying local Knowledge Base cache.");
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
    setTimeout(() => setStatusMessage(""), 4500);
  };

  const handleOpenAdd = (openWithPdfPicker = false) => {
    const defaultCat = categories[0]?.name || "General";
    setPdfParsedInfo(null);
    setFormArticle({
      id: null,
      title: "",
      category: defaultCat,
      sub_category: "",
      tags: "",
      content: "",
      source: "Enterprise IT Knowledge Base",
    });
    setShowModal(true);

    if (openWithPdfPicker) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 200);
    }
  };

  const handleOpenEdit = (article) => {
    setPdfParsedInfo(null);
    setFormArticle({
      id: article.id,
      title: article.title,
      category: article.category || "General",
      sub_category: article.sub_category || "",
      tags: article.tags || "",
      content: article.content || "",
      source: article.source || "Enterprise IT Knowledge Base",
    });
    setShowModal(true);
  };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF (.pdf) document.");
      return;
    }

    try {
      setIsUploadingPdf(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/masterdata/knowledge-articles/upload-pdf/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const parsed = res.data?.data;
      if (parsed) {
        setPdfParsedInfo({
          fileName: parsed.file_name || file.name,
          pageCount: parsed.page_count || 1,
        });

        setFormArticle((prev) => ({
          ...prev,
          title: parsed.title || prev.title,
          category: parsed.category || prev.category || categories[0]?.name || "General",
          sub_category: parsed.sub_category || prev.sub_category || "",
          tags: parsed.tags || prev.tags || "",
          content: parsed.content || prev.content,
          source: parsed.source || `PDF: ${file.name}`,
        }));

        showNotification(`✓ PDF "${file.name}" analyzed & extracted! Review and edit details below.`);
      }
    } catch (err) {
      console.error("[PDF Upload Error]:", err);
      setError(
        err?.response?.data?.error ||
          "Failed to extract text from PDF. Please make sure the PDF is readable and not password-protected."
      );
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formArticle.title.trim() || !formArticle.content.trim()) {
      setError("Title and Troubleshooting Content are required.");
      return;
    }

    try {
      // Split content lines as steps if structured
      const stepsArray = formArticle.content
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: formArticle.title.trim(),
        category: formArticle.category || categories[0]?.name || "General",
        sub_category: formArticle.sub_category.trim(),
        tags: formArticle.tags.trim(),
        content: formArticle.content.trim(),
        steps: JSON.stringify(stepsArray),
        source: formArticle.source.trim() || "Enterprise IT Knowledge Base",
        is_active: true,
      };

      if (formArticle.id) {
        await api.put(`/masterdata/knowledge-articles/${formArticle.id}/`, payload);
        showNotification(`✓ Article "${formArticle.title}" updated successfully.`);
      } else {
        await api.post("/masterdata/knowledge-articles/", payload);
        showNotification(`✓ Knowledge article "${formArticle.title}" saved and indexed for AI RAG.`);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.detail || "Failed to save article.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/masterdata/knowledge-articles/${deleteTarget.id}/`);
      showNotification(`✓ Knowledge article "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setError("Failed to delete article.");
    }
  };

  const filtered = articles.filter(
    (a) =>
      (a.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.tags || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.source || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">
            Database Knowledge Base & Vector Store
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">
            Enterprise Knowledge Store
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage troubleshooting articles & PDF manuals dynamically retrieved by the AI engine for RAG context and resolution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenAdd(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3.5 py-2 text-xs font-bold text-cyan-900 hover:bg-cyan-100 hover:border-cyan-400 transition shadow-sm"
          >
            <span className="text-sm">📄</span>
            <span>+ Upload PDF</span>
          </button>

          <button
            onClick={() => handleOpenAdd(false)}
            className="sp-btn sp-btn-primary px-4 py-2 text-xs shadow font-bold"
          >
            + Add Knowledge Article
          </button>
        </div>
      </div>

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

      {/* Metrics Row */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Articles (DB)", value: articles.length, sub: "Dynamic database storage" },
          {
            label: "PDF Sourced Docs",
            value: articles.filter((a) => (a.source || "").toLowerCase().includes("pdf")).length,
            sub: "Parsed manuals & guides",
          },
          { label: "Linked Categories", value: new Set(articles.map((a) => a.category)).size, sub: "Master Data domains" },
          { label: "AI RAG Engine", value: "Active", sub: "Context & Resolution" },
        ].map((item) => (
          <div className="sp-card p-4 hover:border-cyan-400 transition" key={item.label}>
            <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
            <div className="my-1 text-2xl font-extrabold text-slate-900 truncate">{item.value}</div>
            <div className="text-[10px] text-cyan-700 font-semibold">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Search and Table */}
      <div className="sp-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge articles by title, category, tags, source, or troubleshooting content..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-xs">
            <thead className="bg-slate-100/75 text-left text-[10px] uppercase tracking-wider text-slate-600">
              <tr>
                {["Article ID", "Title & Category", "Sub-Category", "Tags & Source", "AI RAG Status", "Actions"].map(
                  (h) => (
                    <th key={h} className="border-b border-slate-200 px-4 py-3 font-bold">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {loading ? "Loading knowledge base..." : "No articles match search."}
                  </td>
                </tr>
              ) : (
                filtered.map((article) => {
                  const isPdfSource = (article.source || "").toLowerCase().includes("pdf");
                  return (
                    <tr key={article.id} className="hover:bg-slate-50/80 transition">
                      <td className="border-b border-slate-100 px-4 py-3.5 font-mono font-bold text-cyan-700">
                        {article.article_id || `KB-${article.id}`}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 max-w-xs">
                        <div className="font-semibold text-slate-900">{article.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-block rounded bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-800 border border-cyan-200">
                            {article.category}
                          </span>
                          {isPdfSource && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 border border-amber-200">
                              <span>📄</span>
                              <span>PDF Document</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-slate-600">
                        {article.sub_category || "—"}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-slate-500 text-[11px] max-w-xs">
                        <div>{article.tags || "—"}</div>
                        {article.source && (
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={article.source}>
                            Source: {article.source}
                          </div>
                        )}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ✓ Ingested in RAG
                        </span>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(article)}
                            className="rounded bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(article)}
                            className="rounded bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Article with PDF Upload */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900">
                {formArticle.id ? "Edit Knowledge Article" : "Add Knowledge Article"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Upload a PDF manual to automatically extract structured troubleshooting steps with AI, or fill in the details manually.
            </p>

            {/* Drag & Drop PDF Upload Box */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handlePdfUpload(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploadingPdf && fileInputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition ${
                  isDragging
                    ? "border-cyan-500 bg-cyan-50"
                    : isUploadingPdf
                    ? "border-amber-300 bg-amber-50/60 cursor-wait"
                    : "border-slate-300 bg-slate-50/70 hover:border-cyan-400 hover:bg-cyan-50/40"
                }`}
              >
                {isUploadingPdf ? (
                  <div className="py-2 flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent" />
                    <div className="text-xs font-bold text-cyan-900">
                      Extracting text & analyzing PDF with AI...
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Structuring title, category, tags, and troubleshooting steps
                    </div>
                  </div>
                ) : pdfParsedInfo ? (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3 text-left">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xl font-bold">
                        📄
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <span>{pdfParsedInfo.fileName}</span>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                            Parsed ({pdfParsedInfo.pageCount} {pdfParsedInfo.pageCount === 1 ? "page" : "pages"})
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          ✓ Auto-populated into form. You can review or tweak fields below.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                    >
                      Change PDF
                    </button>
                  </div>
                ) : (
                  <div className="py-1 flex flex-col items-center justify-center gap-1.5">
                    <div className="flex items-center gap-2 text-cyan-700">
                      <span className="text-2xl">📄</span>
                      <span className="text-xs font-bold text-slate-800">
                        Upload PDF Document to Auto-Fill & Parse
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Drag & drop your PDF troubleshooting guide here, or{" "}
                      <span className="font-semibold text-cyan-700 underline">browse files</span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Supports standard PDF documentation, user guides, network SOPs, and manuals
                    </p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Article Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={formArticle.title}
                  onChange={(e) => setFormArticle({ ...formArticle, title: e.target.value })}
                  placeholder="e.g. Cisco AnyConnect Gateway Reset Guide"
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600 font-medium text-slate-900 bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">
                    Master Data Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formArticle.category}
                    onChange={(e) => setFormArticle({ ...formArticle, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 p-2.5 bg-white outline-none focus:border-cyan-600 font-medium text-slate-900"
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="General">General</option>
                    ) : (
                      categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Sub-Category</label>
                  <input
                    value={formArticle.sub_category}
                    onChange={(e) => setFormArticle({ ...formArticle, sub_category: e.target.value })}
                    placeholder="e.g. VPN or SSO"
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600 font-medium text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Keywords / Search Tags</label>
                  <input
                    value={formArticle.tags}
                    onChange={(e) => setFormArticle({ ...formArticle, tags: e.target.value })}
                    placeholder="e.g. vpn, cisco, anyconnect, gateway, remote"
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600 text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-800 block mb-1">Knowledge Source</label>
                  <input
                    value={formArticle.source}
                    onChange={(e) => setFormArticle({ ...formArticle, source: e.target.value })}
                    placeholder="e.g. Enterprise IT Knowledge Base or PDF Manual"
                    className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800">
                    Troubleshooting Steps & Content <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Markdown and step-by-step supported</span>
                </div>
                <textarea
                  rows="7"
                  value={formArticle.content}
                  onChange={(e) => setFormArticle({ ...formArticle, content: e.target.value })}
                  placeholder="1. Verify network connection and DNS settings.\n2. Open client and input server endpoint.\n3. Complete multi-factor authentication prompt.\n4. Escalate if error 403 persists."
                  className="w-full rounded-lg border border-slate-200 p-2.5 outline-none focus:border-cyan-600 font-mono text-xs bg-slate-50/50 leading-relaxed text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sp-btn sp-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPdf}
                  className="sp-btn sp-btn-primary px-5 py-2 font-bold shadow disabled:opacity-50"
                >
                  {formArticle.id ? "Save Changes" : "Save Article to DB"}
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
            <h3 className="text-base font-bold text-slate-900">Delete Knowledge Article?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to delete <strong className="text-slate-800">"{deleteTarget.title}"</strong>?
              This will remove it from the AI's contextual knowledge base.
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

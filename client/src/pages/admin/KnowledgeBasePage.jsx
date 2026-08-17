import { useState } from "react";

const initialArticles = [
  {
    id: "KB-NET-001",
    title: "Corporate VPN Connection & Troubleshooting Guide",
    category: "Network",
    subCategory: "VPN",
    status: "INDEXED",
    chunks: 4,
    embeddingModel: "text-embedding-3-small",
    lastIndexed: "Today, 10:30 AM",
    content: "1. Verify internet connectivity.\n2. Confirm VPN gateway server 'vpn.company.com'.\n3. Restart Cisco AnyConnect service.\n4. Check firewall UDP 500/4500.\n5. Clear credentials and re-login via SSO.",
  },
  {
    id: "KB-SEC-002",
    title: "Security Incident Response — Phishing & Suspicious Emails",
    category: "Security",
    subCategory: "Phishing",
    status: "INDEXED",
    chunks: 5,
    embeddingModel: "text-embedding-3-small",
    lastIndexed: "Yesterday",
    content: "1. Do not click links or download attachments.\n2. Report via Outlook Phishing button.\n3. Change corporate SSO password immediately.\n4. SecOps isolation and quarantine.",
  },
  {
    id: "KB-AUTH-003",
    title: "SSO Login & Self-Service Password Reset",
    category: "Authentication",
    subCategory: "Password Reset",
    status: "INDEXED",
    chunks: 3,
    embeddingModel: "text-embedding-3-small",
    lastIndexed: "2 days ago",
    content: "1. Open sso.company.com/recovery.\n2. Approve MFA push notification.\n3. Set new 12+ character password.\n4. Wait 2 minutes for sync.",
  },
  {
    id: "KB-HDW-004",
    title: "Workstation & Laptop Diagnostics and Performance",
    category: "Hardware",
    subCategory: "Computer/Peripheral",
    status: "INDEXED",
    chunks: 4,
    embeddingModel: "text-embedding-3-small",
    lastIndexed: "3 days ago",
    content: "1. Perform full reboot.\n2. Check Task Manager for runaway CPU processes.\n3. Verify 15 GB free disk space.\n4. Run Apple / Dell hardware diagnostics.",
  },
];

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState(initialArticles);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newArticle, setNewArticle] = useState({
    title: "",
    category: "Network",
    subCategory: "VPN",
    content: "",
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!newArticle.title.trim() || !newArticle.content.trim()) return;

    const article = {
      id: `KB-DOC-${String(articles.length + 1).padStart(3, "0")}`,
      title: newArticle.title.trim(),
      category: newArticle.category,
      subCategory: newArticle.subCategory,
      status: "INDEXED",
      chunks: Math.ceil(newArticle.content.length / 200),
      embeddingModel: "text-embedding-3-small",
      lastIndexed: "Just now",
      content: newArticle.content.trim(),
    };

    setArticles([article, ...articles]);
    setNewArticle({ title: "", category: "Network", subCategory: "VPN", content: "" });
    setShowModal(false);
  };

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">Knowledge Base & Vector Store</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5 tracking-tight">Enterprise Knowledge Store</h1>
          <p className="text-xs text-slate-500 mt-1">Manage troubleshooting articles retrieved by RAG to generate automated AI resolutions.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="sp-btn sp-btn-primary px-4 py-2.5 text-xs shadow font-bold"
        >
          + Add Knowledge Article
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total Articles", value: articles.length, sub: "Enterprise knowledge" },
          { label: "Indexed in Vector DB", value: articles.filter((a) => a.status === "INDEXED").length, sub: "RAG search ready" },
          { label: "Total Chunks", value: articles.reduce((acc, a) => acc + a.chunks, 0), sub: "Embedding vectors" },
          { label: "Embedding Model", value: "text-embedding-3-small", sub: "1536 dimensions" },
        ].map((item) => (
          <div className="sp-card p-4 hover:border-cyan-400 transition" key={item.label}>
            <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
            <div className="my-1 text-2xl font-extrabold text-slate-900 truncate">{item.value}</div>
            <div className="text-[10px] text-cyan-700 font-semibold">{item.sub}</div>
          </div>
        ))}
      </div>

      <div className="sp-card overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge articles by title, category, or troubleshooting content..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-cyan-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-xs">
            <thead className="bg-slate-100/75 text-left text-[10px] uppercase tracking-wider text-slate-600">
              <tr>
                {["Article ID", "Title & Category", "Sub-Category", "Status", "Chunks", "Vector Model", "Last Indexed"].map((h) => (
                  <th key={h} className="border-b border-slate-200 px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => (
                <tr key={article.id} className="hover:bg-slate-50/80 transition">
                  <td className="border-b border-slate-100 px-4 py-3.5 font-mono font-bold text-cyan-700">
                    {article.id}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <div className="font-semibold text-slate-900">{article.title}</div>
                    <span className="inline-block mt-1 rounded bg-cyan-50 px-2 py-0.5 text-[9px] font-bold text-cyan-800 border border-cyan-200">{article.category}</span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5 text-slate-600">
                    {article.subCategory}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5">
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">✓ {article.status}</span>
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5 font-mono text-slate-700">
                    {article.chunks} chunks
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5 text-slate-500 font-mono text-[10px]">
                    {article.embeddingModel}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3.5 text-slate-500">
                    {article.lastIndexed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-[#1c2430] mb-1">Add Knowledge Article</h2>
            <p className="text-xs text-gray-500 mb-4">New articles are automatically chunked and embedded for RAG resolution retrieval.</p>


            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Article Title</label>
                <input
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                  placeholder="e.g. Cisco AnyConnect Gateway Reset Guide"
                  className="w-full rounded-lg border border-[#dfe5e1] p-2.5 outline-none focus:border-[#1f7a45]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Category</label>
                  <select
                    value={newArticle.category}
                    onChange={(e) => setNewArticle({ ...newArticle, category: e.target.value })}
                    className="w-full rounded-lg border border-[#dfe5e1] p-2.5 bg-white outline-none focus:border-[#1f7a45]"
                  >
                    <option>Network</option>
                    <option>Security</option>
                    <option>Authentication</option>
                    <option>Hardware</option>
                    <option>Software</option>
                    <option>Email</option>
                    <option>Billing</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Sub-Category</label>
                  <input
                    value={newArticle.subCategory}
                    onChange={(e) => setNewArticle({ ...newArticle, subCategory: e.target.value })}
                    placeholder="e.g. VPN"
                    className="w-full rounded-lg border border-[#dfe5e1] p-2.5 outline-none focus:border-[#1f7a45]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Troubleshooting Content & Steps</label>
                <textarea
                  rows="5"
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                  placeholder="1. Step one...\n2. Step two..."
                  className="w-full rounded-lg border border-[#dfe5e1] p-2.5 outline-none focus:border-[#1f7a45]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="sp-btn sp-btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sp-btn sp-btn-primary px-4 py-2"
                >
                  Save & Index in Vector DB
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

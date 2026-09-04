import { useEffect, useState } from "react";
import { seedUsers } from "../../data/seedData";
import { storage, STORAGE_KEYS } from "../../services/storageService";

const emptyForm = {
  name: "",
  email: "",
  department: "",
  role: "Agent",
  team: "Support",
  status: "Active",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const stored = storage.get(STORAGE_KEYS.users, seedUsers);
    const hasOldUsers = Array.isArray(stored) && stored.some(
      (u) =>
        u.email === "arun@company.com" ||
        u.email === "bala@company.com" ||
        u.email === "admin@company.com" ||
        u.email === "employee@supportpilot.com"
    );
    const hasNewUsers = Array.isArray(stored) && stored.some((u) => u.email === "admin@gmail.com");
    const hasManager = Array.isArray(stored) && stored.some(
      (u) => u.email === "manager@gmail.com" || u.role === "Manager" || u.role === "Support Manager"
    );

    if (hasOldUsers || !hasNewUsers || !stored || stored.length === 0) {
      storage.set(STORAGE_KEYS.users, seedUsers);
      setUsers(seedUsers);
    } else if (!hasManager) {
      const managerUser = seedUsers.find((u) => u.email === "manager@gmail.com") || {
        id: "USR-008",
        name: "Support Manager",
        email: "manager@gmail.com",
        role: "Manager",
        department: "Operations & Escalations",
        team: "Management",
        status: "Active",
      };
      const updated = [...stored, managerUser];
      storage.set(STORAGE_KEYS.users, updated);
      setUsers(updated);
    } else {
      setUsers(stored);
    }
  }, []);

  useEffect(() => {
    if (users && users.length > 0) {
      storage.set(STORAGE_KEYS.users, users);
    }
  }, [users]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSaveUser = (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name || !email) return;

    const nextUser = {
      id: editingId || `USR-${String(users.length + 1).padStart(3, "0")}`,
      name,
      email,
      department: form.department || "General",
      role: form.role || "Agent",
      team: form.team || "Support",
      status: form.status || "Active",
    };

    if (editingId) {
      setUsers((current) => current.map((user) => (user.id === editingId ? nextUser : user)));
    } else {
      setUsers((current) => [nextUser, ...current]);
    }

    resetForm();
  };

  const handleEditUser = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      team: user.team,
      status: user.status,
    });
    setShowForm(true);
  };

  const handleDeleteUser = (id) => {
    setUsers((current) => current.filter((user) => user.id !== id));
  };

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role?.toLowerCase() === "admin").length;
  const managerCount = users.filter((u) => ["manager", "support manager"].includes(u.role?.toLowerCase())).length;
  const agentCount = users.filter((u) => u.role?.toLowerCase() === "agent").length;
  const employeeCount = totalUsers - adminCount - managerCount - agentCount;

  const roleBadges = {
    Admin: "bg-purple-50 text-purple-800 border border-purple-200",
    Manager: "bg-indigo-50 text-indigo-800 border border-indigo-200",
    "Support Manager": "bg-indigo-50 text-indigo-800 border border-indigo-200",
    Agent: "bg-blue-50 text-blue-800 border border-blue-200",
    Employee: "bg-slate-50 text-slate-700 border border-slate-200",
    Customer: "bg-slate-50 text-slate-700 border border-slate-200",
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Admin / Users
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Users
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage system users and Role-Based Access Control (RBAC).
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="sp-btn sp-btn-primary px-5 py-2.5 font-bold shadow-sm text-xs cursor-pointer active:scale-95 transition"
        >
          {showForm ? "✕ Close Form" : "+ Add User"}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#dfe5e1] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Users</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{totalUsers}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#dfe5e1] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600">Admins</span>
          <p className="text-2xl font-extrabold text-purple-900 mt-1">{adminCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#dfe5e1] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Managers</span>
          <p className="text-2xl font-extrabold text-indigo-900 mt-1">{managerCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#dfe5e1] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Agents</span>
          <p className="text-2xl font-extrabold text-blue-900 mt-1">{agentCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-[#dfe5e1] shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Employees</span>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">{employeeCount}</p>
        </div>
      </div>

      {/* Add / Edit Form Modal / Box */}
      {showForm && (
        <form onSubmit={handleSaveUser} className="rounded-2xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            {editingId ? "Edit User Details" : "Create New User"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Name</span>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition" placeholder="John Doe" required />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition" placeholder="john@example.com" required />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Department</span>
              <input name="department" value={form.department} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition" placeholder="IT Support" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Role</span>
              <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition bg-white">
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Agent">Agent</option>
                <option value="Employee">Employee</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Team</span>
              <input name="team" value={form.team} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition" placeholder="Support" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-700">Status</span>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 transition bg-white">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer">Cancel</button>
            <button type="submit" className="rounded-xl bg-[#14532d] hover:bg-[#0f2b1d] px-5 py-2 text-xs font-bold text-white transition shadow-sm cursor-pointer">{editingId ? "Update User" : "Save User"}</button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-[#dfe5e1] bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f0f4f1] border-b border-[#dfe5e1]">
              <tr>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">User</th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">Department</th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">Role</th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">Team</th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700">Status</th>
                <th className="py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-700 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 text-[13px]">{user.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{user.email}</p>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">{user.department || "IT Support"}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${roleBadges[user.role] || "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium">{user.team || "Support"}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {user.status || "Active"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleEditUser(user)}
                        className="font-bold text-[#14532d] hover:text-emerald-700 cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="font-bold text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
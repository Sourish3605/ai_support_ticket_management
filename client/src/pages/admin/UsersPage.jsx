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
    setUsers(stored);
  }, []);

  useEffect(() => {
    storage.set(STORAGE_KEYS.users, users);
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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-gray-500">Manage users and RBAC roles.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="rounded-lg bg-[#14532d] px-5 py-3 font-medium text-white"
        >
          {showForm ? "Close" : "+ Add User"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveUser} className="mb-8 rounded-2xl border border-[#dfe5e1] bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Name</span>
              <input name="name" value={form.name} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500" placeholder="John Doe" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500" placeholder="john@example.com" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Department</span>
              <input name="department" value={form.department} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500" placeholder="IT Support" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Role</span>
              <select name="role" value={form.role} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500">
                <option value="Admin">Admin</option>
                <option value="Agent">Agent</option>
                <option value="Employee">Employee</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Team</span>
              <input name="team" value={form.team} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500" placeholder="L1 Support" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Status</span>
              <select name="status" value={form.status} onChange={handleChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-200 px-4 py-2 font-medium text-slate-600">Cancel</button>
            <button type="submit" className="rounded-lg bg-[#14532d] px-4 py-2 font-medium text-white">{editingId ? "Update User" : "Save User"}</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#dfe5e1] bg-white">
        <table className="w-full">
          <thead className="bg-[#eef4ef]">
            <tr>
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Department</th>
              <th className="p-4 text-left">Role</th>
              <th className="p-4 text-left">Team</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td className="p-4">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </td>
                <td className="p-4">{user.department}</td>
                <td className="p-4">
                  <span className="rounded-full bg-[#eef4ef] px-3 py-1 text-sm text-[#14532d]">{user.role}</span>
                </td>
                <td className="p-4">{user.team}</td>
                <td className="p-4">{user.status}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => handleEditUser(user)} className="font-semibold text-[#14532d]">Edit</button>
                    <button type="button" onClick={() => handleDeleteUser(user.id)} className="font-semibold text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
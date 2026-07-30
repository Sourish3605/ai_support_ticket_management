import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { createTicket } from '../services/ticketService';

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', category: '', priority: 'Medium', description: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.title) nextErrors.title = 'Title is required';
    if (!form.category) nextErrors.category = 'Category is required';
    if (!form.description) nextErrors.description = 'Description is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const created = await createTicket({ ...form, status: 'Open', assignedTo: 'Unassigned', createdAt: new Date().toISOString().slice(0, 10) });
    setMessage(`Ticket ${created.id} submitted successfully`);
    setTimeout(() => navigate('/my-tickets'), 650);
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">New request</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create a new support ticket</h2>
      </div>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="md:col-span-2">
          <Input label="Ticket Title" name="title" value={form.title} onChange={handleChange} placeholder="Need help with billing export" error={errors.title} />
        </div>
        <Input label="Category" name="category" value={form.category} onChange={handleChange} placeholder="Bug / Billing / UI" error={errors.category} />
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-2 block">Priority</span>
          <select name="priority" value={form.priority} onChange={handleChange} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">Description</span>
            <textarea name="description" value={form.description} onChange={handleChange} className="min-h-36 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none" placeholder="Describe the issue in as much detail as possible" />
            {errors.description ? <p className="mt-1 text-xs text-rose-500">{errors.description}</p> : null}
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">Attachment</span>
            <input type="file" className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3" />
          </label>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="w-full">Submit ticket</Button>
          {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
        </div>
      </form>
    </div>
  );
};

export default CreateTicketPage;

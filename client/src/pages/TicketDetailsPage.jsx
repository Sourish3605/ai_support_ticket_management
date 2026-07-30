import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiPaperclip, FiMessageCircle, FiClock } from 'react-icons/fi';
import Loader from '../components/Loader';
import Button from '../components/Button';
import { getTicketById, updateTicket } from '../services/ticketService';

const TicketDetailsPage = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const loadTicket = async () => {
      setLoading(true);
      const data = await getTicketById(ticketId);
      setTicket(data);
      setLoading(false);
    };

    loadTicket();
  }, [ticketId]);

  const handleClose = async () => {
    await updateTicket(ticketId, { status: 'Resolved' });
    setTicket((current) => ({ ...current, status: 'Resolved' }));
    navigate('/my-tickets');
  };

  if (loading) {
    return <Loader label="Loading ticket details" />;
  }

  if (!ticket) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600">Ticket not found.</div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Ticket details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{ticket.title}</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">{ticket.priority}</span>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Ticket ID</p>
            <p className="mt-1 font-semibold text-slate-900">{ticket.id}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-1 font-semibold text-slate-900">{ticket.status}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Assigned To</p>
            <p className="mt-1 font-semibold text-slate-900">{ticket.assignedTo}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Category</p>
            <p className="mt-1 font-semibold text-slate-900">{ticket.category}</p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-slate-900">Description</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{ticket.description}</p>
        </div>
        <div className="mt-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FiPaperclip /> Attachments</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {ticket.attachments?.length ? ticket.attachments.map((attachment) => (
              <span key={attachment} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">{attachment}</span>
            )) : <p className="text-sm text-slate-500">No attachments included.</p>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Status Timeline</h3>
          <div className="mt-4 space-y-3">
            {ticket.timeline?.map((step) => (
              <div key={step.label} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
                <div className="mt-1 rounded-full bg-indigo-100 p-2 text-indigo-600"><FiClock size={14} /></div>
                <div>
                  <p className="font-semibold text-slate-900">{step.label}</p>
                  <p className="text-sm text-slate-500">{step.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FiMessageCircle /> Comments</h3>
          <div className="mt-4 space-y-3">
            {ticket.comments?.length ? ticket.comments.map((comment, index) => (
              <div key={`${comment.author}-${index}`} className="rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                <p className="mt-1 text-sm text-slate-600">{comment.text}</p>
                <p className="mt-2 text-xs text-slate-400">{comment.time}</p>
              </div>
            )) : <p className="text-sm text-slate-500">No comments yet.</p>}
          </div>
          <textarea value={reply} onChange={(event) => setReply(event.target.value)} className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 p-3 outline-none" placeholder="Write a reply..." />
          <div className="mt-4 flex gap-3">
            <Button>Send reply</Button>
            <Button variant="secondary" onClick={handleClose}>Close ticket</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsPage;

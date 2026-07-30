const TicketCard = ({ ticket, onView }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
          <p className="mt-1 text-sm text-slate-500">{ticket.id}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
          {ticket.priority}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-600">{ticket.description}</p>
      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        <span>{ticket.status}</span>
        <button onClick={onView} className="font-semibold text-indigo-600">View</button>
      </div>
    </div>
  );
};

export default TicketCard;

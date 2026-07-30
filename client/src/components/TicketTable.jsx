import { Link } from 'react-router-dom';

const TicketTable = ({ tickets, onEdit, onDelete }) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-semibold">Ticket ID</th>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Assigned To</th>
            <th className="px-4 py-3 font-semibold">Created Date</th>
            <th className="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-indigo-600">{ticket.id}</td>
              <td className="px-4 py-3">{ticket.title}</td>
              <td className="px-4 py-3">{ticket.priority}</td>
              <td className="px-4 py-3">{ticket.status}</td>
              <td className="px-4 py-3">{ticket.assignedTo}</td>
              <td className="px-4 py-3">{ticket.createdAt}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link to={`/tickets/${ticket.id}`} className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-600">View</Link>
                  <button onClick={() => onEdit(ticket)} className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Edit</button>
                  <button onClick={() => onDelete(ticket.id)} className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TicketTable;

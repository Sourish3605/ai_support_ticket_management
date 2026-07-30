import { useEffect, useMemo, useState } from 'react';
import { FiFilter, FiPlusCircle } from 'react-icons/fi';
import Loader from '../components/Loader';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import TicketTable from '../components/TicketTable';
import Modal from '../components/Modal';
import Button from '../components/Button';
import { deleteTicket, getTickets, updateTicket } from '../services/ticketService';

const AllTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      const data = await getTickets();
      setTickets(data);
      setLoading(false);
    };

    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesQuery = `${ticket.id} ${ticket.title} ${ticket.assignedTo}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = !status || ticket.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [tickets, query, status]);

  const pagedTickets = useMemo(() => {
    const start = (page - 1) * 4;
    return filteredTickets.slice(start, start + 4);
  }, [filteredTickets, page]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / 4));

  const handleDelete = async (ticketId) => {
    await deleteTicket(ticketId);
    setTickets((current) => current.filter((item) => item.id !== ticketId));
  };

  const handleStatusUpdate = async () => {
    if (!selectedTicket) return;
    await updateTicket(selectedTicket.id, { status: 'Resolved' });
    setTickets((current) => current.map((item) => (item.id === selectedTicket.id ? { ...item, status: 'Resolved' } : item)));
    setSelectedTicket(null);
  };

  if (loading) {
    return <Loader label="Loading all tickets" />;
  }

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Admin view</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">All Tickets</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchBar value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID or title" />
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm">
            <FiFilter size={16} />
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="border-none bg-transparent outline-none">
              <option value="">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>
        </div>
      </div>

      <TicketTable tickets={pagedTickets} onEdit={(ticket) => setSelectedTicket(ticket)} onDelete={handleDelete} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={Boolean(selectedTicket)} title="Update Ticket" onClose={() => setSelectedTicket(null)}>
        {selectedTicket ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Assign or update the status of {selectedTicket.id}.</p>
            <div className="flex gap-3">
              <Button onClick={handleStatusUpdate}>Mark as Resolved</Button>
              <Button variant="secondary" onClick={() => setSelectedTicket(null)}>Cancel</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default AllTicketsPage;

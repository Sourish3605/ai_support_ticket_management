import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loader from '../components/Loader';
import TicketTable from '../components/TicketTable';
import { getTickets } from '../services/ticketService';

const MyTicketsPage = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      setLoading(true);
      const data = await getTickets();
      setTickets(data);
      setLoading(false);
    };

    loadTickets();
  }, []);

  if (loading) {
    return <Loader label="Loading your tickets" />;
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Your queue</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">My Tickets</h2>
        </div>
        <Link to="/create-ticket" className="rounded-2xl bg-indigo-600 px-4 py-2.5 font-semibold text-white">Create ticket</Link>
      </div>
      <TicketTable tickets={tickets} onEdit={() => {}} onDelete={() => {}} />
    </div>
  );
};

export default MyTicketsPage;

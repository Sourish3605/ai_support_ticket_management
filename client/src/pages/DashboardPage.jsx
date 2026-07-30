import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiAlertCircle, FiCheckCircle, FiClock, FiTag } from 'react-icons/fi';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import DashboardCard from '../components/DashboardCard';
import TicketTable from '../components/TicketTable';
import Loader from '../components/Loader';
import { getDashboardData, getTickets } from '../services/ticketService';

const COLORS = ['#4f46e5', '#f59e0b', '#10b981', '#ef4444'];

const DashboardPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [data, ticketData] = await Promise.all([getDashboardData(), getTickets()]);
      setDashboardData(data);
      setTickets(ticketData);
      setLoading(false);
    };

    loadData();
  }, []);

  const summaryCards = useMemo(() => {
    if (!dashboardData?.stats) return [];
    return dashboardData.stats.map((item) => ({ ...item, icon: getIcon(item.icon) }));
  }, [dashboardData]);

  if (loading) {
    return <Loader label="Loading dashboard insights" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <DashboardCard key={card.id} label={card.label} value={card.value} change={card.change} icon={card.icon} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Ticket Overview</h3>
              <p className="text-sm text-slate-500">Weekly trend across the last six months</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardData?.reports?.monthly || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="tickets" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Ticket Status</h3>
          <p className="text-sm text-slate-500">A quick distribution snapshot</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboardData?.reports?.priority || []} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                  {dashboardData?.reports?.priority?.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Tickets</h3>
            <p className="text-sm text-slate-500">Latest activity from your team</p>
          </div>
          <button onClick={() => navigate('/all-tickets')} className="text-sm font-semibold text-indigo-600">See all</button>
        </div>
        <TicketTable tickets={tickets.slice(0, 3)} onEdit={() => {}} onDelete={() => {}} />
      </div>
    </div>
  );
};

const getIcon = (iconName) => {
  switch (iconName) {
    case 'warning':
      return FiAlertCircle;
    case 'spark':
      return FiClock;
    case 'check':
      return FiCheckCircle;
    default:
      return FiTag;
  }
};

export default DashboardPage;

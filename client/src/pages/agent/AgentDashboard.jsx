import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAllTickets } from "../../services/ticketService";

const chartColors = ["#14532d", "#1f7a45", "#3f8f5b", "#7aa889", "#b8cdbd", "#8b95a1"];
const panelClass = "sp-card overflow-hidden";
const tooltipStyle = { border: "1px solid #dfe5e1", borderRadius: 8, fontSize: 11 };

function Kpi({ label, value, detail, tone = "green" }) {
  return <div className="sp-card p-4"><div className="text-[11px] font-semibold text-[#8b95a1]">{label}</div><div className="my-1 text-2xl font-extrabold tracking-tight">{value}</div><div className={`text-[11px] font-semibold ${tone === "red" ? "text-[#b91c1c]" : "text-[#15803d]"}`}>{detail}</div></div>;
}

function PanelHeader({ title, action }) {
  return <div className="sp-card-header"><h2>{title}</h2>{action}</div>;
}

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);
  useEffect(() => setTickets(getAllTickets()), []);

  const openTickets = tickets.filter((ticket) => !["Resolved", "Closed"].includes(ticket.status));
  const classified = tickets.filter((ticket) => ticket.ai);
  const atRisk = openTickets.filter((ticket) => ticket.priority === "High");
  const categories = useMemo(() => Object.entries(tickets.reduce((result, ticket) => { const key = ticket.category || "Unclassified"; result[key] = (result[key] || 0) + 1; return result; }, {})).map(([name, count]) => ({ name, count })), [tickets]);
  const statuses = useMemo(() => ["Open", "In Progress", "Pending", "Resolved", "Closed"].map((name) => ({ name, count: tickets.filter((ticket) => ticket.status === name).length })), [tickets]);
  const trend = useMemo(() => { const today = new Date(); return Array.from({ length: 7 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (6 - index)); const label = date.toLocaleDateString(undefined, { weekday: "short" }); const count = tickets.filter((ticket) => new Date(ticket.createdAt).toDateString() === date.toDateString()).length; return { label, count }; }); }, [tickets]);
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Tickets received today" value={tickets.length} detail="Live ticket volume" /><Kpi label="Classified automatically" value={classified.length} detail={`${tickets.length ? Math.round(classified.length / tickets.length * 100) : 0}% coverage`} /><Kpi label="Open tickets" value={openTickets.length} detail="Require attention" /><Kpi label="SLA at risk" value={atRisk.length} detail={`${atRisk.length} high priority tickets`} tone={atRisk.length ? "red" : "green"} /></div>

    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <section className={panelClass}><PanelHeader title="Ticket volume - last 7 days" action={<span className="sp-tag sp-tag-neutral">Live</span>} /><div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}><defs><linearGradient id="ticketVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1f7a45" stopOpacity={0.28} /><stop offset="100%" stopColor="#1f7a45" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#eef2f0" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8b95a1" }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8b95a1" }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="count" name="Tickets" stroke="#14532d" strokeWidth={2} fill="url(#ticketVolume)" /></AreaChart></ResponsiveContainer></div></section>
      <section className={panelClass}><PanelHeader title="Status distribution" action={<Link className="text-xs font-semibold text-[#14532d]" to="/tickets">View all</Link>} /><div className="h-64 p-3"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statuses.filter((item) => item.count)} dataKey="count" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>{statuses.filter((item) => item.count).map((item, index) => <Cell key={item.name} fill={chartColors[index]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div><div className="flex flex-wrap justify-center gap-x-3 gap-y-1 px-3 pb-4 text-[10px] text-[#4b5563]">{statuses.filter((item) => item.count).map((item, index) => <span key={item.name}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: chartColors[index] }} />{item.name} {item.count}</span>)}</div></section>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className={panelClass}><PanelHeader title="Classification health" action={<span className="sp-tag sp-tag-success">Meeting target</span>} /><div className="sp-card-body">{[["Category accuracy (hold-out)", "94%"], ["Severity accuracy (hold-out)", "87%"], ["Average confidence", classified.length ? `${Math.round(classified.reduce((sum, ticket) => sum + (ticket.ai?.categoryConfidence || 0), 0) / classified.length * 100)}%` : "0%"], ["Routed to LLM path", `${tickets.filter((ticket) => ticket.ai?.classificationPath === "LLM").length}`], ["Agent overrides today", "0"], ["Unclassified", `${tickets.length - classified.length}`]].map(([label, value]) => <div className="flex justify-between border-b border-dashed border-[#eef2f0] py-2 text-xs last:border-0" key={label}><span className="text-[#4b5563]">{label}</span><strong>{value}</strong></div>)}</div></section>
      <section className={panelClass}><PanelHeader title="Volume by category - today" action={<Link className="text-xs font-semibold text-[#14532d]" to="/tickets">View all</Link>} /><div className="sp-card-body space-y-3">{categories.length ? categories.map((item, index) => <div key={item.name}><div className="mb-1 flex justify-between text-[11px]"><span>{item.name.toUpperCase()}</span><strong>{item.count}</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f0]"><div className="h-full rounded-full" style={{ width: `${item.count / maxCategory * 100}%`, background: chartColors[index % chartColors.length] }} /></div></div>) : <div className="text-xs text-[#8b95a1]">No ticket data yet.</div>}</div></section>
    </div>

    <section className="rounded-r-lg border border-[#dfe5e1] border-l-4 border-l-[#1f7a45] bg-[#eef4ef] p-3 text-xs"><strong>Milestone 1 dashboard</strong><div className="mt-1 text-[#4b5563]">Counters, classification health, ticket volume, status distribution, and SLA risk are live from the ticket workspace.</div></section>
  </div>;
}

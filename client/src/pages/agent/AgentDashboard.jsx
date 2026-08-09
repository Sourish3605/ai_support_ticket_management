import { useEffect, useState } from "react";
import { getAllTickets } from "../../services/ticketService";

function Card({ title, value, subtitle }) {
  return (
    <div className="bg-white border border-[#dfe5e1] rounded-2xl p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>

      <p className="text-xs text-gray-400 mt-2">
        {subtitle}
      </p>
    </div>
  );
}

export default function AgentDashboard() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    setTickets(getAllTickets());
  }, []);

  const resolved = tickets.filter(
    (ticket) =>
      ticket.status === "Resolved"
  ).length;

  const open = tickets.filter(
    (ticket) =>
      !["Resolved", "Closed"].includes(
        ticket.status
      )
  ).length;

  const highPriority = tickets.filter(
    (ticket) =>
      ticket.priority === "High"
  ).length;

  const assigned = tickets.filter(
    (ticket) => ticket.assignedTo
  ).length;

  const resolutionRate =
    tickets.length
      ? Math.round(
          (resolved / tickets.length) * 100
        )
      : 0;

  return (
    <div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Agent Dashboard
        </h1>

        <p className="text-gray-500 mt-2">
          Your support operations overview.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">

        <Card
          title="Resolved Tickets"
          value={resolved}
          subtitle="Completed tickets"
        />

        <Card
          title="Open Tickets"
          value={open}
          subtitle="Require attention"
        />

        <Card
          title="High Priority"
          value={highPriority}
          subtitle="SLA-sensitive tickets"
        />

        <Card
          title="AI Resolution Rate"
          value={`${resolutionRate}%`}
          subtitle="Current performance"
        />

      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">

        <div className="bg-white border rounded-2xl p-6">

          <h2 className="font-bold text-xl mb-5">
            Ticket Overview
          </h2>

          <div className="space-y-4">

            <div className="flex justify-between">
              <span>Open</span>
              <b>
                {
                  tickets.filter(
                    (t) => t.status === "Open"
                  ).length
                }
              </b>
            </div>

            <div className="flex justify-between">
              <span>In Progress</span>
              <b>
                {
                  tickets.filter(
                    (t) =>
                      t.status === "In Progress"
                  ).length
                }
              </b>
            </div>

            <div className="flex justify-between">
              <span>Resolved</span>
              <b>{resolved}</b>
            </div>

            <div className="flex justify-between">
              <span>Assigned</span>
              <b>{assigned}</b>
            </div>

          </div>

        </div>

        <div className="bg-white border rounded-2xl p-6">

          <h2 className="font-bold text-xl mb-5">
            AI Performance
          </h2>

          <div className="space-y-5">

            <div>
              <div className="flex justify-between mb-2">
                <span>
                  Classification Accuracy
                </span>
                <span>94%</span>
              </div>

              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 w-[94%] bg-[#14532d] rounded-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span>
                  AI Resolution Rate
                </span>
                <span>82%</span>
              </div>

              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 w-[82%] bg-[#1f7a45] rounded-full" />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
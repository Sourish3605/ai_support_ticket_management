import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllTickets } from "../../services/ticketService";

export default function WorkQueuePage() {
  const [tickets, setTickets] = useState([]);

  const loadTickets = () => {
    const allTickets = getAllTickets();

    const activeTickets = allTickets.filter(
      (ticket) =>
        !["Resolved", "Closed"].includes(
          ticket.status
        )
    );

    const priorityWeight = {
      High: 1,
      Medium: 2,
      Low: 3,
    };

    activeTickets.sort(
      (a, b) =>
        priorityWeight[a.priority] -
        priorityWeight[b.priority]
    );

    setTickets(activeTickets);
  };

  useEffect(() => {
    loadTickets();

    const interval = setInterval(
      loadTickets,
      3000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Smart Work Queue
        </h1>

        <p className="text-gray-500 mt-2">
          Tickets prioritized by SLA and severity.
        </p>
      </div>

      <div className="space-y-4">

        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="bg-white border rounded-2xl p-5 flex items-center justify-between"
          >

            <div className="flex gap-5 items-center">

              <div
                className={`w-3 h-14 rounded-full ${
                  ticket.priority === "High"
                    ? "bg-red-600"
                    : ticket.priority === "Medium"
                    ? "bg-yellow-500"
                    : "bg-green-600"
                }`}
              />

              <div>

                <div className="flex gap-3 items-center">

                  <span className="font-mono text-sm text-[#14532d]">
                    {ticket.id}
                  </span>

                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                    {ticket.category}
                  </span>

                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs">
                    {ticket.priority}
                  </span>

                </div>

                <h2 className="font-semibold text-lg mt-2">
                  {ticket.subject}
                </h2>

                <p className="text-sm text-gray-500">
                  Customer: {ticket.customerName}
                </p>

                <p className="text-sm text-gray-500">
                  Assigned: {ticket.assignedAgent}
                </p>

              </div>

            </div>

            <Link
              to={`/tickets/${ticket.id}`}
              className="bg-[#14532d] text-white px-4 py-2 rounded-lg"
            >
              Open
            </Link>

          </div>
        ))}

      </div>

    </div>
  );
}
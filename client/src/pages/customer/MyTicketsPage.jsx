import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getCustomerTickets } from "../../services/ticketService";

export default function MyTicketsPage() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    setTickets(
      getCustomerTickets(user.id)
    );
  }, [user.id]);

  const getStatusStyle = (status) => {
    switch (status) {
      case "Resolved":
        return "bg-green-100 text-green-700";

      case "Closed":
        return "bg-gray-100 text-gray-700";

      case "Pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div>

      <div className="flex items-center justify-between mb-8">

        <div>
          <h1 className="text-3xl font-bold">
            My Tickets
          </h1>

          <p className="text-gray-500 mt-1">
            Track all your support requests.
          </p>
        </div>

        <Link
          to="/portal/tickets/new"
          className="bg-[#14532d] text-white px-5 py-3 rounded-lg"
        >
          + New Ticket
        </Link>

      </div>

      <div className="bg-white border border-[#dfe5e1] rounded-2xl overflow-hidden">

        <table className="w-full">

          <thead className="bg-[#eef4ef]">
            <tr>
              <th className="text-left p-4">
                Ticket
              </th>

              <th className="text-left p-4">
                Subject
              </th>

              <th className="text-left p-4">
                Category
              </th>

              <th className="text-left p-4">
                Priority
              </th>

              <th className="text-left p-4">
                Status
              </th>

              <th className="text-left p-4">
                Assigned To
              </th>
            </tr>
          </thead>

          <tbody>

            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-t hover:bg-gray-50"
              >

                <td className="p-4">
                  <Link
                    to={`/portal/tickets/${ticket.id}`}
                    className="font-mono font-semibold text-[#14532d]"
                  >
                    {ticket.id}
                  </Link>
                </td>

                <td className="p-4">
                  {ticket.subject}
                </td>

                <td className="p-4">
                  {ticket.category}
                </td>

                <td className="p-4">
                  {ticket.priority}
                </td>

                <td className="p-4">

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>

                </td>

                <td className="p-4">
                  {ticket.assignedAgent}
                </td>

              </tr>
            ))}

          </tbody>

        </table>

        {!tickets.length && (
          <div className="p-12 text-center text-gray-500">
            You have not created any tickets yet.
          </div>
        )}

      </div>
    </div>
  );
}
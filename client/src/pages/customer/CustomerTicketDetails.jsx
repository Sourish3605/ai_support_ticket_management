import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTicketById,
  updateTicket,
} from "../../services/ticketService";

export default function CustomerTicketDetails() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    setTicket(getTicketById(id));
  }, [id]);

  if (!ticket) {
    return (
      <div className="p-8">
        Ticket not found.
      </div>
    );
  }

  const reopen = () => {
    const updated = updateTicket(
      ticket.id,
      {
        status: "Open",
      }
    );

    setTicket(updated);
  };

  return (
    <div className="max-w-6xl mx-auto">

      <div className="flex justify-between items-start mb-8">

        <div>
          <p className="font-mono text-[#14532d]">
            {ticket.id}
          </p>

          <h1 className="text-3xl font-bold mt-2">
            {ticket.subject}
          </h1>

          <p className="text-gray-500 mt-2">
            Created{" "}
            {new Date(
              ticket.createdAt
            ).toLocaleString()}
          </p>
        </div>

        <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-semibold">
          {ticket.status}
        </span>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <section className="bg-white border rounded-2xl p-6">

            <h2 className="font-bold text-xl mb-4">
              Your Issue
            </h2>

            <p className="text-gray-700 whitespace-pre-wrap">
              {ticket.description}
            </p>

          </section>

          <section className="bg-white border rounded-2xl p-6">

            <h2 className="font-bold text-xl mb-6">
              Ticket Timeline
            </h2>

            <div className="space-y-6">

              {ticket.timeline.map(
                (event) => (
                  <div
                    key={event.id}
                    className="flex gap-4"
                  >

                    <div className="w-3 h-3 mt-2 rounded-full bg-[#14532d]" />

                    <div>
                      <p className="font-semibold">
                        {event.title}
                      </p>

                      <p className="text-gray-600">
                        {event.description}
                      </p>

                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(
                          event.timestamp
                        ).toLocaleString()}
                      </p>
                    </div>

                  </div>
                )
              )}

            </div>

          </section>

          <section className="bg-white border rounded-2xl p-6">

            <h2 className="font-bold text-xl mb-4">
              AI Resolution Steps
            </h2>

            <ol className="space-y-3">

              {ticket.ai?.suggestedResolution?.map(
                (step, index) => (
                  <li
                    key={index}
                    className="flex gap-3"
                  >
                    <span className="w-7 h-7 rounded-full bg-[#eef4ef] flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </span>

                    <span>{step}</span>
                  </li>
                )
              )}

            </ol>

          </section>

        </div>

        <aside className="space-y-6">

          <section className="bg-white border rounded-2xl p-6">

            <h2 className="font-bold mb-4">
              Ticket Information
            </h2>

            <div className="space-y-4 text-sm">

              <div>
                <p className="text-gray-500">
                  Category
                </p>
                <p className="font-semibold">
                  {ticket.category}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Priority
                </p>
                <p className="font-semibold">
                  {ticket.priority}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  Assigned Agent
                </p>
                <p className="font-semibold">
                  {ticket.assignedAgent}
                </p>
              </div>

              <div>
                <p className="text-gray-500">
                  SLA
                </p>

                <p className="font-semibold">
                  {ticket.slaHours} hours
                </p>
              </div>

            </div>

          </section>

          {ticket.status === "Resolved" && (
            <section className="bg-[#eef4ef] rounded-2xl p-6">

              <h2 className="font-bold">
                Did this solve your issue?
              </h2>

              <div className="flex gap-3 mt-4">

                <button
                  className="px-4 py-2 bg-[#14532d] text-white rounded-lg"
                >
                  Yes
                </button>

                <button
                  onClick={reopen}
                  className="px-4 py-2 border border-[#14532d] text-[#14532d] rounded-lg"
                >
                  No, Reopen
                </button>

              </div>

            </section>
          )}

        </aside>

      </div>

    </div>
  );
}
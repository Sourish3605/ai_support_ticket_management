import { useEffect, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getTicketById,
  updateTicket,
} from "../services/ticketService";

import { useAuth } from "../context/AuthContext";

const TicketDetailsPage = () => {
  const { ticketId } =
    useParams();

  const { user } = useAuth();

  const navigate = useNavigate();

  const [ticket, setTicket] =
    useState(null);

  useEffect(() => {
    getTicketById(ticketId).then(
      setTicket
    );
  }, [ticketId]);

  const updateStatus = async (
    status
  ) => {
    const updated =
      await updateTicket(
        ticketId,
        { status }
      );

    setTicket(updated);
  };

  if (!ticket) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center">
        <p className="text-slate-500">
          Ticket not found.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">

      <button
        onClick={() =>
          navigate(-1)
        }
        className="mb-5 text-sm font-semibold text-emerald-600"
      >
        ← Back
      </button>

      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

        <div className="flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="font-mono text-xs text-slate-400">
              {ticket.id}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {ticket.title}
            </h1>

          </div>

          <span className="rounded-xl bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
            {ticket.priority}
          </span>

        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">

          <Info
            label="Category"
            value={ticket.category}
          />

          <Info
            label="Status"
            value={ticket.status}
          />

          <Info
            label="Assigned To"
            value={ticket.assignedTo}
          />

        </div>

        <div className="mt-7 rounded-2xl bg-slate-50 p-5">

          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Description
          </p>

          <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-700">
            {ticket.description}
          </p>

        </div>

        {(user?.role ===
          "agent" ||
          user?.role ===
            "admin") && (
          <div className="mt-7">

            <p className="mb-3 text-sm font-bold text-slate-700">
              Update ticket status
            </p>

            <div className="flex flex-wrap gap-2">

              {[
                "AI Processing",
                "In Progress",
                "Waiting on You",
                "Resolved",
              ].map((status) => (
                <button
                  key={status}
                  onClick={() =>
                    updateStatus(
                      status
                    )
                  }
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-emerald-500 hover:bg-emerald-50"
                >
                  {status}
                </button>
              ))}

            </div>

          </div>
        )}

      </div>

    </div>
  );
};

const Info = ({
  label,
  value,
}) => (
  <div className="rounded-2xl bg-slate-50 p-4">

    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {label}
    </p>

    <p className="mt-2 font-bold text-slate-800">
      {value}
    </p>

  </div>
);

export default TicketDetailsPage;
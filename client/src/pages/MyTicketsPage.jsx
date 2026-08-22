import { useEffect, useState } from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  FiPlus,
  FiArrowRight,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

import {
  getTickets,
} from "../services/ticketService";

const priorityStyle = {
  P1: "bg-red-600 text-white",
  P2: "bg-orange-600 text-white",
  P3: "bg-amber-500 text-white",
  P4: "bg-slate-600 text-white",
};

const statusStyle = {
  "AI Processing":
    "bg-blue-50 text-blue-700",
  "In Progress":
    "bg-emerald-50 text-emerald-700",
  "Waiting on You":
    "bg-amber-50 text-amber-700",
  Resolved:
    "bg-green-50 text-green-700",
};

const MyTicketsPage = () => {
  const { user } = useAuth();

  const navigate = useNavigate();

  const [tickets, setTickets] =
    useState([]);

  useEffect(() => {
    const load = () => {
      const data = getTickets();

      const mine =
        user?.role === "customer"
          ? getCustomerTickets(user)
          : data.filter(
              (ticket) =>
                ticket.assignedTo === user?.id ||
                ticket.assignedAgent === user?.name ||
                ticket.assignedAgent === user?.username
            );

      setTickets(mine);
    };

    load();
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl">

      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">

        <div>

          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
            Workspace
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            My Tickets
          </h1>

          <p className="mt-2 text-slate-500">
            {tickets.length} ticket
            {tickets.length !== 1
              ? "s"
              : ""}{" "}
            assigned to your workspace.
          </p>

        </div>

        {user?.role ===
          "customer" && (
          <button
            onClick={() =>
              navigate(
                "/customer/create-ticket"
              )
            }
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700"
          >
            <FiPlus />
            Raise a Ticket
          </button>
        )}

      </div>

      <div className="space-y-4">

        {tickets.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

            <h2 className="text-xl font-bold text-slate-800">
              No tickets yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create a ticket and it will appear here.
            </p>

          </div>
        )}

        {tickets.map((ticket) => (
          <Link
            key={ticket.id}
            to={`/${
              user?.role
            }/tickets/${ticket.id}`}
            className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
          >

            <div className="flex flex-col justify-between gap-4 md:flex-row">

              <div className="flex gap-4">

                <span
                  className={`h-fit rounded-lg px-3 py-1 text-xs font-bold ${
                    priorityStyle[
                      ticket.priority
                    ] ||
                    priorityStyle.P4
                  }`}
                >
                  {ticket.priority}
                </span>

                <div>

                  <h2 className="font-bold text-slate-900">
                    {ticket.subject || ticket.title}
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {ticket.id} ·{" "}
                    {ticket.category}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Assigned to{" "}
                    <span className="font-semibold text-slate-700">
                      {ticket.assignedAgent || ticket.assignedTo || "Unassigned"}
                    </span>
                  </p>

                </div>

              </div>

              <div className="flex items-center gap-4 md:flex-col md:items-end">

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    statusStyle[
                      ticket.status
                    ] ||
                    "bg-slate-100 text-slate-600"
                  }`}
                >
                  {ticket.status}
                </span>

                <FiArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-600" />

              </div>

            </div>

          </Link>
        ))}

      </div>

    </div>
  );
};

export default MyTicketsPage;
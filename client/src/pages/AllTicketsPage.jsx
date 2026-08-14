import { useEffect, useState } from "react";

import {
  Link,
} from "react-router-dom";

import {
  getTickets,
} from "../services/ticketService";

import { useAuth } from "../context/AuthContext";

const AllTicketsPage = () => {
  const { user } = useAuth();

  const [tickets, setTickets] =
    useState([]);

  const [search, setSearch] =
    useState("");

  useEffect(() => {
    getTickets().then(setTickets);
  }, []);

  const filteredTickets =
    tickets.filter((ticket) => {
      const value =
        `${ticket.id} ${ticket.title} ${ticket.category} ${ticket.assignedTo}`
          .toLowerCase();

      return value.includes(
        search.toLowerCase()
      );
    });

  return (
    <div className="mx-auto max-w-7xl">

      <div className="mb-7">

        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
          {user?.role === "admin"
            ? "Administration"
            : "Support Queue"}
        </p>

        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          All Tickets
        </h1>

        <p className="mt-2 text-slate-500">
          View and monitor support requests.
        </p>

      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search tickets..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500"
        />

      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px]">

            <thead className="bg-slate-50">

              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">

                <th className="px-5 py-4">
                  Ticket
                </th>

                <th className="px-5 py-4">
                  Category
                </th>

                <th className="px-5 py-4">
                  Priority
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4">
                  Assigned To
                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredTickets.map(
                (ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-emerald-50/40"
                  >

                    <td className="px-5 py-4">

                      <Link
                        to={`/${user.role}/tickets/${ticket.id}`}
                        className="font-semibold text-slate-900 hover:text-emerald-600"
                      >
                        {ticket.title}
                      </Link>

                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {ticket.id}
                      </p>

                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {ticket.category}
                    </td>

                    <td className="px-5 py-4">

                      <span className="rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700">
                        {ticket.priority}
                      </span>

                    </td>

                    <td className="px-5 py-4">

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {ticket.status}
                      </span>

                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {ticket.assignedTo}
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
};

export default AllTicketsPage;
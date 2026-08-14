import { useEffect, useState } from "react";

import {
  FiActivity,
  FiCheckCircle,
  FiClock,
  FiAlertTriangle,
} from "react-icons/fi";

import {
  getTickets,
} from "../services/ticketService";

const ReportsPage = () => {
  const [tickets, setTickets] =
    useState([]);

  useEffect(() => {
    getTickets().then(setTickets);
  }, []);

  const resolved =
    tickets.filter(
      (t) =>
        t.status === "Resolved"
    ).length;

  const highPriority =
    tickets.filter(
      (t) =>
        t.priority === "P1" ||
        t.priority === "P2"
    ).length;

  return (
    <div className="mx-auto max-w-7xl">

      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
        Analytics
      </p>

      <h1 className="mt-1 text-3xl font-bold text-slate-900">
        Reports
      </h1>

      <p className="mt-2 text-slate-500">
        Support performance overview.
      </p>

      <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

        <ReportCard
          title="Total Tickets"
          value={tickets.length}
          icon={<FiActivity />}
        />

        <ReportCard
          title="Resolved"
          value={resolved}
          icon={<FiCheckCircle />}
        />

        <ReportCard
          title="Open"
          value={
            tickets.length -
            resolved
          }
          icon={<FiClock />}
        />

        <ReportCard
          title="High Priority"
          value={highPriority}
          icon={<FiAlertTriangle />}
        />

      </div>

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

        <h2 className="text-xl font-bold text-slate-900">
          Ticket distribution
        </h2>

        <div className="mt-6 space-y-5">

          {[
            ["P1", "Critical", "bg-red-500"],
            ["P2", "High", "bg-orange-500"],
            ["P3", "Medium", "bg-amber-500"],
            ["P4", "Low", "bg-slate-500"],
          ].map(
            ([priority, label, color]) => {
              const count =
                tickets.filter(
                  (ticket) =>
                    ticket.priority ===
                    priority
                ).length;

              const percentage =
                tickets.length
                  ? Math.max(
                      8,
                      (count /
                        tickets.length) *
                        100
                    )
                  : 0;

              return (
                <div key={priority}>

                  <div className="mb-2 flex justify-between text-sm">

                    <span className="font-semibold text-slate-700">
                      {priority} ·{" "}
                      {label}
                    </span>

                    <span className="text-slate-400">
                      {count}
                    </span>

                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>

    </div>
  );
};

const ReportCard = ({
  title,
  value,
  icon,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

    <div className="flex items-center justify-between">

      <div>

        <p className="text-sm text-slate-500">
          {title}
        </p>

        <p className="mt-2 text-3xl font-black text-slate-900">
          {value}
        </p>

      </div>

      <div className="rounded-xl bg-emerald-50 p-3 text-xl text-emerald-600">
        {icon}
      </div>

    </div>

  </div>
);

export default ReportsPage;
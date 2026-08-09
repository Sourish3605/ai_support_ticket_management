import { useEffect, useState } from "react";

import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiUsers,
} from "react-icons/fi";

import { useAuth } from "../context/AuthContext";

import {
  getTickets,
} from "../services/ticketService";

const DashboardPage = () => {
  const { user } = useAuth();

  const [tickets, setTickets] =
    useState([]);

  useEffect(() => {
    getTickets().then(setTickets);
  }, []);

  const customerTickets =
    tickets.filter(
      (ticket) =>
        ticket.customerEmail ===
        user?.email
    );

  const assignedTickets =
    tickets.filter(
      (ticket) =>
        ticket.assignedTo ===
        user?.name
    );

  const isCustomer =
    user?.role === "customer";

  const isAgent =
    user?.role === "agent";

  const visibleTickets = isCustomer
    ? customerTickets
    : isAgent
      ? assignedTickets
      : tickets;

  const openTickets =
    visibleTickets.filter(
      (ticket) =>
        ticket.status !== "Resolved"
    ).length;

  return (
    <div className="mx-auto max-w-7xl">

      {/* HEADER */}

      <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-7 text-white shadow-xl">

        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-100">
          {user?.role} Portal
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Welcome back, {user?.name}
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
          {isCustomer
            ? "Track your support requests and raise new tickets whenever you need help."
            : isAgent
              ? "Manage your assigned queue, resolve issues and keep customers updated."
              : "Monitor support operations, ticket volume and team performance."}
        </p>

      </div>

      {/* STATS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          title={
            isCustomer
              ? "My Tickets"
              : isAgent
                ? "Assigned Tickets"
                : "Total Tickets"
          }
          value={
            visibleTickets.length
          }
          icon={<FiActivity />}
          className="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Open Tickets"
          value={openTickets}
          icon={<FiClock />}
          className="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Resolved"
          value={
            visibleTickets.filter(
              (ticket) =>
                ticket.status ===
                "Resolved"
            ).length
          }
          icon={<FiCheckCircle />}
          className="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title={
            user?.role === "admin"
              ? "Support Team"
              : "Priority Alerts"
          }
          value={
            user?.role === "admin"
              ? "12"
              : visibleTickets.filter(
                  (ticket) =>
                    ticket.priority ===
                    "P1"
                ).length
          }
          icon={
            user?.role === "admin" ? (
              <FiUsers />
            ) : (
              <FiAlertCircle />
            )
          }
          className="bg-rose-50 text-rose-600"
        />

      </div>

      {/* RECENT */}

      <div className="mt-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold text-slate-900">
              Recent Tickets
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest activity in your workspace.
            </p>

          </div>

        </div>

        <div className="mt-6 space-y-3">

          {visibleTickets
            .slice(0, 5)
            .map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-col justify-between gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center"
              >

                <div>

                  <p className="font-semibold text-slate-900">
                    {ticket.title}
                  </p>

                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {ticket.id}
                  </p>

                </div>

                <div className="flex items-center gap-3">

                  <span className="rounded-lg bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    {ticket.priority}
                  </span>

                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {ticket.status}
                  </span>

                </div>

              </div>
            ))}

        </div>

      </div>

    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon,
  className,
}) => {
  return (
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

        <div
          className={`rounded-2xl p-4 ${className}`}
        >
          {icon}
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
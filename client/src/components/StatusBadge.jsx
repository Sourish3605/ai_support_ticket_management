export default function StatusBadge({
  status,
}) {
  const styles = {
    Open: "bg-blue-50 text-blue-700",
    "AI Processing":
      "bg-purple-50 text-purple-700",
    "In Progress":
      "bg-amber-50 text-amber-700",
    Pending:
      "bg-orange-50 text-orange-700",
    "Waiting on You":
      "bg-orange-50 text-orange-700",
    Resolved:
      "bg-emerald-50 text-emerald-700",
    Closed:
      "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] ||
        "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}
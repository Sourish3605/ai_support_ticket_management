export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
}) {
  return (
    <div className="rounded-2xl border border-[#dfe5e1] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {title}
        </p>

        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-[#1c2430]">
        {value}
      </p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
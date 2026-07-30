const DashboardCard = ({ label, value, change, icon: Icon }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          {Icon ? <Icon size={20} /> : null}
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-emerald-600">{change}</p>
    </div>
  );
};

export default DashboardCard;

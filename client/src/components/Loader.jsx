const Loader = ({ label = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    <p className="text-sm font-medium text-slate-600">{label}</p>
  </div>
);

export default Loader;

const Input = ({ label, error, ...props }) => {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label ? <span className="mb-2 block">{label}</span> : null}
      <input
        className={`w-full rounded-2xl border bg-white px-4 py-3 outline-none transition ${error ? 'border-rose-400' : 'border-slate-200 focus:border-indigo-500'}`}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
    </label>
  );
};

export default Input;

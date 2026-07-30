const Toast = ({ message, type = 'success' }) => {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
    info: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${styles[type]}`}>
      {message}
    </div>
  );
};

export default Toast;

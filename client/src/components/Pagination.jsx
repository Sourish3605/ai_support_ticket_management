const Pagination = ({ page, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-slate-600">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-50">
          Previous
        </button>
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;

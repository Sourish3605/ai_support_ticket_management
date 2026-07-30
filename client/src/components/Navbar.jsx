import { FiBell, FiChevronDown, FiMenu, FiSearch } from 'react-icons/fi';

const Navbar = ({ title, onMenuClick, user }) => {
  return (
    <header className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-2xl border border-slate-200 p-2 text-slate-600 lg:hidden">
          <FiMenu size={18} />
        </button>
        <div>
          <p className="text-sm font-medium text-slate-500">Operations Overview</p>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">
          <FiSearch size={16} />
          <input className="w-40 border-none bg-transparent outline-none" placeholder="Search tickets" />
        </label>
        <button className="relative rounded-2xl border border-slate-200 p-2 text-slate-600">
          <FiBell size={18} />
          <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
        </button>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500">{user?.role || 'Support Lead'}</p>
          </div>
          <FiChevronDown className="text-slate-500" />
        </div>
      </div>
    </header>
  );
};

export default Navbar;

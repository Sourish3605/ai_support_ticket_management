import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiSearch,
} from "react-icons/fi";

const Navbar = ({
  title,
  onMenuClick,
  user,
}) => {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur lg:px-7">

      {/* LEFT */}

      <div className="flex items-center gap-4">

        <button
          onClick={onMenuClick}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"
        >
          <FiMenu size={19} />
        </button>

        <div>

          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            SupportPilot
          </p>

          <h1 className="text-lg font-bold text-slate-900">
            {title}
          </h1>

        </div>

      </div>

      {/* RIGHT */}

      <div className="flex items-center gap-3">

        <label className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex">

          <FiSearch size={16} />

          <input
            className="w-40 bg-transparent outline-none"
            placeholder="Search tickets"
          />

        </label>

        <button className="relative rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">

          <FiBell size={18} />

          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />

        </button>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 font-bold text-white">
            {user?.name
              ?.charAt(0)
              ?.toUpperCase() || "U"}
          </div>

          <div className="hidden sm:block">

            <p className="text-sm font-semibold text-slate-900">
              {user?.name || "User"}
            </p>

            <p className="text-xs capitalize text-slate-500">
              {user?.role || "user"}
            </p>

          </div>

          <FiChevronDown className="text-slate-400" />

        </div>

      </div>

    </header>
  );
};

export default Navbar;
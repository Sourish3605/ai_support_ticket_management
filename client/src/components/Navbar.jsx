import {
  FiBell,
  FiChevronDown,
  FiMenu,
  FiSearch
} from 'react-icons/fi';

const Navbar = ({ title, onMenuClick, user }) => {

  return (
    <header
      className="
        flex items-center justify-between
        border-b border-slate-200
        bg-white/90
        px-4 py-4
        shadow-sm
        backdrop-blur
        sm:px-6
      "
    >

      {/* Left Section */}
      <div className="flex items-center gap-4">

        {/* Mobile Menu */}
        <button
          onClick={onMenuClick}
          className="
            rounded-2xl
            border border-slate-200
            p-2
            text-slate-600
            lg:hidden
          "
        >
          <FiMenu size={18} />
        </button>


        {/* Dashboard Title */}
        <div>
          <p className="text-sm font-medium text-indigo-500">
            Support AI Ticket Management
          </p>

          <h1 className="text-xl font-semibold text-slate-900">
            {title}
          </h1>
        </div>

      </div>



      {/* Right Profile Area */}
      <div className="flex items-center gap-3">


        {/* Search */}
        <label
          className="
            hidden
            items-center
            gap-2
            rounded-2xl
            border border-slate-200
            bg-slate-50
            px-3 py-2
            text-sm
            text-slate-500
            md:flex
          "
        >

          <FiSearch size={16} />

          <input
            className="
              w-40
              border-none
              bg-transparent
              outline-none
            "
            placeholder="Search tickets"
          />

        </label>



        {/* Notification */}
        <button
          className="
            relative
            rounded-2xl
            border border-slate-200
            p-2
            text-slate-600
          "
        >

          <FiBell size={18} />

          <span
            className="
              absolute
              right-1
              top-1
              h-2.5
              w-2.5
              rounded-full
              bg-rose-500
            "
          />

        </button>



        {/* Profile Card */}
        <div
          className="
            flex
            items-center
            gap-3
            rounded-2xl
            border border-slate-200
            bg-white
            px-3 py-2
          "
        >

          {/* Avatar */}
          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-indigo-600
              font-semibold
              text-white
            "
          >
            {user?.name?.charAt(0) || 'U'}
          </div>



          {/* User Details */}
          <div className="hidden sm:block">

            <p className="text-sm font-semibold text-slate-900">
              {user?.name || 'User'}
            </p>

            <p className="text-xs text-slate-500">
              {user?.role || 'Support Lead'}
            </p>

          </div>


          <FiChevronDown className="text-slate-500" />

        </div>


      </div>


    </header>
  );
};

export default Navbar;
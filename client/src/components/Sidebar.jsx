import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiClipboard,
  FiHome,
  FiMessageSquare,
  FiSettings,
  FiLogOut,
  FiPlusCircle,
  FiList,
  FiMoon,
  FiSun
} from 'react-icons/fi';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/my-tickets', label: 'My Tickets', icon: FiClipboard },
  { to: '/create-ticket', label: 'Create Ticket', icon: FiPlusCircle },
  { to: '/all-tickets', label: 'All Tickets', icon: FiList },
  { to: '/ai-assistant', label: 'AI Assistant', icon: FiMessageSquare },
  { to: '/reports', label: 'Reports', icon: FiBarChart2 },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

const Sidebar = ({ isOpen, onClose, theme, toggleTheme }) => {
  return (
    <aside
      className={`
        fixed top-0 left-0 z-40 
        flex h-screen w-72 flex-col
        border-r border-slate-200
        bg-white/95
        p-6
        shadow-xl
        backdrop-blur
        transition-transform duration-300

        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >

      {/* Logo Section */}
      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
            Support AI
          </p>

          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            Ticket Hub
          </h2>
        </div>


        {/* Theme Button */}
        <button
          onClick={toggleTheme}
          className="
            rounded-full 
            border border-slate-200 
            p-2 
            text-slate-600 
            transition 
            hover:bg-slate-100
          "
        >
          {theme === 'dark'
            ? <FiSun size={18} />
            : <FiMoon size={18} />
          }
        </button>

      </div>



      {/* Navigation */}
      <nav className="mt-8 flex-1 space-y-2 overflow-y-auto">

        {links.map(({ to, label, icon: Icon }) => (

          <NavLink
            key={to}
            to={to}
            onClick={onClose}

            className={({ isActive }) =>
              `
              flex items-center gap-3 
              rounded-2xl 
              px-4 py-3 
              text-sm 
              font-medium 
              transition

              ${
                isActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }
              `
            }
          >

            <Icon size={18} />

            <span>
              {label}
            </span>

          </NavLink>

        ))}

      </nav>



      {/* Logout */}
      <button
        className="
          mt-6 
          flex items-center gap-3 
          rounded-2xl 
          border border-rose-100 
          px-4 py-3 
          text-sm 
          font-medium 
          text-rose-600 
          transition 
          hover:bg-rose-50
        "
      >

        <FiLogOut size={18} />

        <span>
          Logout
        </span>

      </button>


    </aside>
  );
};

export default Sidebar;
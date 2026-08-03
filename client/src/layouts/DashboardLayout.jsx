import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const DashboardLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === 'light' ? 'dark' : 'light'
    );
  };

  return (
    <div
      className={`h-screen overflow-hidden ${
        theme === 'dark'
          ? 'bg-slate-950 text-slate-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >

      {/* Top Profile / Navbar Section */}
      <header className="fixed top-0 left-0 right-0 z-50">
        <Navbar
          title="Support Operations"
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
        />
      </header>


      {/* Fixed Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </aside>


      {/* Dashboard Pages - Only This Area Scrolls */}
      <section
        className="pt-20 h-screen overflow-y-auto lg:ml-72"
      >
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </section>

    </div>
  );
};

export default DashboardLayout;
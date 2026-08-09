import {
  Outlet,
  useNavigate,
} from "react-router-dom";

import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";

import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [theme, setTheme] =
    useState("light");

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/login", {
        replace: true,
      });
    }
  }, [
    isAuthenticated,
    user,
    navigate,
  ]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const toggleTheme = () => {
    setTheme((current) =>
      current === "light"
        ? "dark"
        : "light"
    );
  };

  return (
    <div
      className={
        theme === "dark"
          ? "min-h-screen bg-slate-950 text-white"
          : "min-h-screen bg-slate-100 text-slate-900"
      }
    >

      <header className="fixed left-0 right-0 top-0 z-50">
        <Navbar
          title="Support Operations"
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          user={user}
        />
      </header>

      <aside className="fixed left-0 top-0 z-40">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
          theme={theme}
          toggleTheme={toggleTheme}
        />
      </aside>

      <main className="min-h-screen pt-20 lg:ml-72">

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

      </main>

    </div>
  );
};

export default DashboardLayout;
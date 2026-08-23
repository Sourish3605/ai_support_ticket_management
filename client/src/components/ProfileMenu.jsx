import {
  FiChevronDown,
  FiLogOut,
  FiUser,
} from "react-icons/fi";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProfileMenu() {
  const navigate = useNavigate();
  const {
    user,
    logout,
  } = useAuth();

  const [open, setOpen] =
    useState(false);

  if (!user) {
    return null;
  }

  const roleLabel = {
    admin: "Administrator",
    agent: "Support Agent",
    customer: "Employee",
  }[user.role] || user.role;

  const initials =
    user.name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={() =>
          setOpen((value) => !value)
        }
        className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/10"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
          {initials}
        </div>

        <div className="hidden text-left md:block">
          <p className="text-sm font-semibold">
            {user.name}
          </p>

          <p className="text-xs opacity-70">
            {roleLabel}
          </p>
        </div>

        <FiChevronDown />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                {initials}
              </div>

              <div>
                <p className="font-bold">
                  {user.name}
                </p>

                <p className="text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm">
              <FiUser />
              <div>
                <p className="font-medium">
                  {roleLabel}
                </p>
                <p className="text-xs text-slate-500">
                  {user.department}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                setOpen(false);
                navigate("/login", { replace: true });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <FiLogOut />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
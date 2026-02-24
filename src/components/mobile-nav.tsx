"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊", color: "emerald" },
  { href: "/dashboard/leagues/create", label: "Create League", icon: "➕", color: "yellow" },
  { href: "/dashboard/leagues/import", label: "Import Data", icon: "📥", color: "blue" },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Hamburger Button - PREMIUM */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-6 z-50 p-4 bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-emerald-500/30 rounded-2xl hover:border-emerald-500/50 shadow-2xl hover:shadow-emerald-500/20 transition-all transform hover:scale-110"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
      </button>

      {/* Overlay - Darker */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu - PREMIUM DARK */}
      <nav
        className={`
          fixed top-0 left-0 h-full w-80 bg-gradient-to-b from-slate-900 to-slate-950 border-r-2 border-emerald-500/20 z-40 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="pt-24 px-6">
          {/* Logo */}
          <div className="mb-12 pb-6 border-b border-emerald-500/20">
            <div className="text-3xl font-black text-white mb-2">TheLeague</div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-16 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"></div>
              <span className="text-2xl">🏈</span>
            </div>
          </div>

          {/* Nav Items */}
          <ul className="space-y-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const colorClasses = {
                emerald: "hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-400",
                yellow: "hover:bg-yellow-500/20 hover:border-yellow-500/30 hover:text-yellow-400",
                blue: "hover:bg-blue-500/20 hover:border-blue-500/30 hover:text-blue-400",
              }[item.color];

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all border-2 font-bold
                      ${isActive 
                        ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                        : `text-white border-transparent ${colorClasses}`
                      }
                    `}
                  >
                    <span className="text-3xl group-hover:scale-125 transition-transform">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </div>
  );
}

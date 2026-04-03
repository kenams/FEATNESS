"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { LogoutButton } from "@/components/logout-button";

type NavSidebarProps = {
  firstName: string;
  email: string;
};

const links = [
  {
    href: "/overview",
    label: "Vue d'ensemble",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 10h6V4h-6zM4 20h6v-3H4z" />
      </svg>
    ),
  },
  {
    href: "/kiosks",
    label: "Bornes",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 4h10v16H7z" />
        <path d="M10 8h4M10 12h4M11 17h2" />
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Commandes",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
      </svg>
    ),
  },
  {
    href: "/menu",
    label: "Menu",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 4v16M11 4v16M15 4c2 2 3 4.5 3 8s-1 6-3 8" />
      </svg>
    ),
  },
];

export function NavSidebar({ firstName, email }: NavSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-30 rounded-full bg-featness-panel p-3 text-white shadow-lg lg:hidden"
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col justify-between bg-featness-ink px-5 py-6 text-white transition-transform lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="grid gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-featness-gold">FEATNESS</p>
            <h1 className="mt-2 text-lg font-semibold">Dashboard gérant</h1>
          </div>

          <nav className="grid gap-2">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                    active
                      ? "bg-featness-gold text-featness-ink"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-3 border-t border-white/10 pt-5">
          <div>
            <p className="text-sm font-medium">{firstName}</p>
            <p className="text-xs text-white/60">{email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}

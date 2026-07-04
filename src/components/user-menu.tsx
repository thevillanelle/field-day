"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";

interface UserMenuProps {
  name: string;
  userId: string;
  vertical?: string;
}

export function UserMenu({ name, userId, vertical }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initial = name[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full bg-[#3a7d44] flex items-center justify-center text-white text-sm font-semibold hover:bg-[#2e6337] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3a7d44] focus:ring-offset-2"
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-[#e0d8ce] shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e0d8ce]">
            <p className="text-sm font-medium text-[#2d1a0e] truncate">{name}</p>
            {vertical && (
              <p className="text-xs text-[#7a6e65] capitalize mt-0.5">{vertical}</p>
            )}
          </div>
          <nav className="py-1">
            <Link
              href={`/profile/${userId}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#2d1a0e] hover:bg-[#f0ece4] transition-colors"
            >
              My profile
            </Link>
            <Link
              href="/onboarding/vertical"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#2d1a0e] hover:bg-[#f0ece4] transition-colors"
            >
              My verticals
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-[#2d1a0e] hover:bg-[#f0ece4] transition-colors"
            >
              Settings
            </Link>
            <div className="border-t border-[#e0d8ce] mt-1 pt-1">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full text-left px-4 py-2.5 text-sm text-[#c1440e] hover:bg-[#f0ece4] transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Map, Bookmark } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function DashboardShell({
  title,
  description,
  children,
  aside,
  showBookmarksNav = true,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  showBookmarksNav?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF7]">
      <div className="absolute inset-0 bg-dashboard-grid bg-[size:56px_56px] opacity-[0.06]" />

      <div className="relative flex min-h-screen w-full flex-col">

        {/* TOP NAV BAR — Lemontree yellow strip */}
        <div className="flex items-center justify-between bg-[#FFD700] px-5 py-3.5 shadow-sm lg:px-6">
          <span className="text-[#6D4AFF] text-base font-black uppercase tracking-widest">
            LemonLens
          </span>
          <div className="flex items-center gap-2">
            {pathname !== '/' ? (
              <TopNavLink href="/" icon={<Map className="h-4 w-4" />}>Explore</TopNavLink>
            ) : null}
            {showBookmarksNav ? (
              <TopNavLink href="/bookmarks" icon={<Bookmark className="h-4 w-4" />}>Bookmarks</TopNavLink>
            ) : null}
          </div>
        </div>

        {/* PURPLE HERO — matches Lemontree's hero section */}
        <header className="relative overflow-hidden bg-[#6D4AFF] px-7 py-7 sm:py-8 lg:px-12 lg:py-9">
          {/* Decorative yellow glow */}
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#FFD700] opacity-15 blur-3xl pointer-events-none" />

          <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-3 lg:gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              {/* Title injected from DashboardClient */}
              <div className="text-white antialiased">
                {title}
              </div>
              <p className="mt-2.5 max-w-2xl text-sm font-medium leading-relaxed text-white/90 sm:text-[0.95rem] lg:text-base">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {aside}
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-3.5 py-3 sm:px-5 lg:px-6 lg:py-4 2xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function TopNavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-[#6D4AFF] px-4 py-2 text-sm font-black text-white transition hover:bg-[#5a3de0] shadow-sm"
    >
      {icon}
      {children}
    </Link>
  );
}

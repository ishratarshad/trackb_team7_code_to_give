'use client';

import Link from 'next/link';
import { Map, Bookmark } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/cn';

export function DashboardShell({
  title,
  description,
  children,
  aside,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FAFAF7]">
      <div className="absolute inset-0 bg-dashboard-grid bg-[size:56px_56px] opacity-[0.06]" />

      <div className="relative flex min-h-screen w-full flex-col">

        {/* TOP NAV BAR — Lemontree yellow strip */}
        <div className="bg-[#FFD700] px-6 py-4 flex items-center justify-between shadow-sm">
          <span className="text-[#6D4AFF] text-base font-black uppercase tracking-widest">
            LemonLens
          </span>      
          <div className="flex items-center gap-2">
            {pathname !== '/' ? (
              <TopNavLink href="/" icon={<Map className="h-4 w-4" />}>Explore</TopNavLink>
            ) : null}
            <TopNavLink href="/bookmarks" icon={<Bookmark className="h-4 w-4" />}>Bookmarks</TopNavLink>
          </div>
        </div>

        {/* PURPLE HERO — matches Lemontree's hero section */}
        <header className="relative overflow-hidden bg-[#6D4AFF] px-8 py-14 lg:px-16 lg:py-20">          {/* Decorative yellow glow */}
          <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#FFD700] opacity-15 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between max-w-[1920px] mx-auto w-full">
            <div className="max-w-3xl">
              {/* Title injected from DashboardClient */}
              <div className="text-white antialiased">
                {title}
              </div>
              <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-white/90 lg:text-xl">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {aside}
            </div>
          </div>
        </header>

        <main className="relative flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6 2xl:px-10">
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
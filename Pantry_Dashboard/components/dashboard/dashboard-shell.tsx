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
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-dashboard-grid bg-[size:56px_56px] opacity-[0.18]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] flex-col px-3 py-3 sm:px-4 lg:px-5 lg:py-4 2xl:px-6">
        <header className="panel-surface mb-3 p-4 lg:mb-4 lg:p-4.5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-moss">
                Lemontree Hackathon Prototype
              </p>
              <h1 className="mt-2 text-3xl leading-tight text-ink sm:text-[2.35rem] xl:text-[2.7rem]">
                {title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate lg:text-[0.95rem]">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {pathname !== '/' ? (
                <NavLink href="/" active={pathname === '/'} icon={<Map className="h-4 w-4" />}>
                  Explore
                </NavLink>
              ) : null}
              <NavLink
                href="/bookmarks"
                active={pathname === '/bookmarks'}
                icon={<Bookmark className="h-4 w-4" />}
              >
                Bookmarks
              </NavLink>
              {aside}
            </div>
          </div>
        </header>

        <main className="relative flex-1">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition',
        active
          ? 'border-pine/30 bg-pine text-white'
          : 'border-line/80 bg-white/80 text-slate hover:border-pine/30 hover:text-pine',
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

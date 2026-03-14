import { Suspense } from 'react';

import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <DashboardClient />
    </Suspense>
  );
}

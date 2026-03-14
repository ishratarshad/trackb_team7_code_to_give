import { ResourceDetailPageClient } from '@/components/resources/resource-detail-page-client';

export default async function ResourcePage({
  params,
}: {
  params: Promise<{
    resourceId: string;
  }>;
}) {
  const { resourceId } = await params;

  return <ResourceDetailPageClient resourceId={resourceId} />;
}

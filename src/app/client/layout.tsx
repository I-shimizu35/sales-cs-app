import { getCurrentClient } from "@/lib/auth";
import { getClientNotifications } from "@/lib/client-notifications";
import { ClientPortalNav } from "@/components/client-portal-nav";

export default async function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getCurrentClient();

  if (!client) {
    return <main className="min-h-screen">{children}</main>;
  }

  const notifications = await getClientNotifications(client.companyId);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="print:hidden">
        <ClientPortalNav notifications={notifications} />
      </div>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

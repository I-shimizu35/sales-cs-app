import { getCurrentClient } from "@/lib/auth";
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

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ClientPortalNav />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

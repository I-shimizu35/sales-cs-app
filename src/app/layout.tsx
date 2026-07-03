import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";

export const metadata: Metadata = {
  title: "営業・CS支援アプリ",
  description: "商談準備から商談後FBまでを一気通貫で管理する社内ツール",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="ja">
      <body>
        {user ? (
          <div className="flex min-h-screen flex-col md:flex-row">
            <SidebarNav role={user.role} />
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen">{children}</main>
        )}
      </body>
    </html>
  );
}

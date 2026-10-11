import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { InstalarApp } from "@/components/pwa/InstalarApp";

export function AppShell() {
  return (
    <div className="min-h-dvh bg-background text-ink md:flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <TopBar />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 bg-background">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <InstalarApp />
    </div>
  );
}
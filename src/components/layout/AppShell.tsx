import { Outlet } from "react-router-dom";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="min-h-screen bg-[#171b1f] text-[#f5f5f5] md:flex">

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-[#171b1f]">

        <TopBar />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8 bg-[#171b1f]">
          <Outlet />
        </main>

      </div>

      <BottomNav />

    </div>
  );
}
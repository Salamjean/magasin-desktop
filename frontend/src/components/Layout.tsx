import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f6fb] font-sans relative">
      {/* Responsive Left Sidebar & Mobile Sliding Drawer */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full min-w-0">
        {/* Floating Top Navbar with Burger button */}
        <Navbar onToggleSidebar={handleToggle} />

        {/* Dynamic Route Content */}
        <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 md:px-4 md:pb-4 bg-transparent">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

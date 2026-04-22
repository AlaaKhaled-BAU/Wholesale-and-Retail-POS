import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop overlay for mobile */}
      <div
        className={`fixed inset-0 z-30 lg:hidden transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={() => setSidebarOpen(false)}
      />

      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarOpen ? 'mr-64' : 'mr-0'
        }`}
      >
        <TopBar
          isSidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

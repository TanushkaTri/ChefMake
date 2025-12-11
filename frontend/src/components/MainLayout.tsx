import React from 'react';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    // Set the main container to be a flex column that fills the entire viewport height
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--card))] dark:from-[#1a1f2e] dark:to-[#1f2636]">
      {/* Top Navigation remains fixed at the top */}
      <nav className="bg-card/80 border-b border-border px-6 py-4 sticky top-0 z-50 backdrop-blur supports-[backdrop-filter]:bg-card/70 dark:bg-[#242c3c] dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-foreground dark:text-white">ChefMake</h1>
          </div>
          <ProfileDropdown />
        </div>
      </nav>

      {/* This flex container now holds the sidebar and the main content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {/* The main content area is now a flex item that fills the remaining space */}
        <main className="flex-1 p-6 overflow-y-auto bg-background/70 text-foreground dark:bg-transparent dark:text-white">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
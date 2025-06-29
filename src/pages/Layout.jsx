

import React, { useState, useEffect, createContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "../utils";
import { User } from '@/api/entities';
import DataManager from "../components/DataManager";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import WeekStartBottomSheet from "../components/WeekStartBottomSheet";
import NotificationConfirmDialog from "../components/NotificationConfirmDialog";
import notificationManager from "../components/NotificationManager";
import { CheckSquare, Flame, Menu, UserCircle2, X } from "lucide-react";
import SettingsModal from "../components/SettingsModal"; // Assuming SettingsModal is in components
import StatisticsModal from "../components/StatisticsModal"; // Import the new modal

// Context for child pages to access layout controls when they are not passed as props
export const LayoutContext = createContext({
  setPageTitle: () => {},
  setPageActions: () => {},
});

const navItems = [
  { href: "/Dashboard", icon: Flame, label: "Habits" },
  { href: "/ToDo", icon: CheckSquare, label: "ToDo" },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ weekStart: 'monday', allowReminders: false });
  const [showWeekStartSheet, setShowWeekStartSheet] = useState(false);
  const [showDisableRemindersDialog, setShowDisableRemindersDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false); // New state for settings modal
  const [showStatsModal, setShowStatsModal] = useState(false); // New state for stats modal

  // This state will be controlled by the child pages
  const [pageTitle, setPageTitle] = useState("Today");
  const [pageActions, setPageActions] = useState(null);

  // Track route changes for last visited route functionality
  useEffect(() => {
    const currentPath = location.pathname;
    // Only track main app routes, not the root route
    if (currentPath === "/Dashboard" || currentPath === "/ToDo") {
      localStorage.setItem("lastVisitedRoute", currentPath);
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      }
      
      const userSettings = await DataManager.getSettings();
      if (userSettings) {
        setSettings(prev => ({ ...prev, ...userSettings }));
      }
      
      if (notificationManager.getPermissionStatus() === 'granted' && userSettings?.allowReminders) {
        setSettings(prev => ({...prev, allowReminders: true}));
      } else {
        setSettings(prev => ({...prev, allowReminders: false}));
      }
    };
    loadInitialData();
  }, []);

  const handleLogin = async () => {
    try {
      await User.login();
      const mergeCompleted = await DataManager.onLoginSuccess();
      window.location.reload();
    } catch (error) {
      console.error('[Layout] Login failed:', error);
    }
  };

  const handleLogout = async () => {
    // Clear last visited route on logout to prevent unauthorized access
    localStorage.removeItem("lastVisitedRoute");
    
    await User.logout();
    setUser(null);
    window.location.reload();
  };
  
  const handleWeekStartChange = async (newWeekStart) => {
    setSettings(prev => ({ ...prev, weekStart: newWeekStart }));
    setShowWeekStartSheet(false);
    await DataManager.updateSettings({ weekStart: newWeekStart });
  };

  const handleToggleGlobalReminders = async () => {
    if (settings.allowReminders) {
      setShowDisableRemindersDialog(true);
    } else {
      const permission = await notificationManager.requestPermission();
      if (permission === 'granted') {
        setSettings(prev => ({...prev, allowReminders: true}));
        await DataManager.updateSettings({ allowReminders: true });
      }
    }
    setIsDrawerOpen(false);
  };
  
  const handleConfirmDisableReminders = async () => {
    setSettings(prev => ({...prev, allowReminders: false}));
    notificationManager.clearAllNotifications();
    setShowDisableRemindersDialog(false);
    await DataManager.updateSettings({ allowReminders: false });
  };
  
  const handleOpenSettings = () => {
    setIsDrawerOpen(false); // Close the hamburger menu
    setShowSettingsModal(true); // Open settings modal
  };

  const handleOpenStats = () => {
    setIsDrawerOpen(false);
    setShowStatsModal(true);
  };

  // Add callback to refresh settings across the app
  const handleSettingsSaved = () => {
    // Force refresh of settings-dependent components
    window.dispatchEvent(new CustomEvent('settingsUpdated'));
  };

  // Clone children to pass down control functions
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { setPageTitle, setPageActions });
    }
    return child;
  });

  return (
    <LayoutContext.Provider value={{ setPageTitle, setPageActions }}>
    <div className="min-h-screen bg-[#f4f8fc] flex flex-col">
      {/* Unified App Header */}
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#f4f8fc]/90 backdrop-blur-sm">
        <div 
          className="flex items-center justify-between px-4"
          style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.5rem)`, paddingBottom: '0.5rem' }}
        >
          <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="w-11 h-11 hover:bg-slate-100" aria-label="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left text-2xl font-bold">Do.</SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-2">
                {user ? (
                   <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <UserCircle2 className="w-10 h-10 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate" title={user.email}>{user.email}</p>
                        <button onClick={handleLogout} className="text-xs text-red-600 hover:underline">Logout</button>
                      </div>
                   </div>
                ) : (
                    <button onClick={handleLogin} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-left">
                        <UserCircle2 className="w-10 h-10 text-slate-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">Guest</p>
                            <p className="text-xs text-blue-600">Login</p>
                        </div>
                    </button>
                )}
                
                <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
                  <button onClick={handleToggleGlobalReminders} className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 text-left text-base">
                    <span>Allow Reminders</span>
                    {settings.allowReminders && <span className="text-green-600">✓</span>}
                  </button>
                  <button onClick={() => { setShowWeekStartSheet(true); setIsDrawerOpen(false); }} className="w-full flex items-center p-3 rounded-lg hover:bg-slate-100 text-left text-base">
                    Week Start
                  </button>
                  <button onClick={handleOpenSettings} className="w-full p-3 rounded-lg hover:bg-slate-100 text-left text-base">Settings</button>
                  <button onClick={handleOpenStats} className="w-full p-3 rounded-lg hover:bg-slate-100 text-left text-base">Statistics</button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex-1 flex justify-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-0">{pageTitle}</h1>
          </div>
          
          <div className="w-11 h-11">
            {pageActions}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow pb-24 pt-16">
        {childrenWithProps}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 h-safe-bottom bg-white border-t border-slate-200 z-40">
        <div className="flex justify-around items-center h-[72px]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href === "/Dashboard" && location.pathname === "/");
            return (
              <Link key={item.label} to={item.href} className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}>
                <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Modals and Sheets controlled by Layout */}
      <WeekStartBottomSheet isOpen={showWeekStartSheet} onClose={() => setShowWeekStartSheet(false)} currentWeekStart={settings.weekStart} onWeekStartChange={handleWeekStartChange} />
      <NotificationConfirmDialog isOpen={showDisableRemindersDialog} onClose={() => setShowDisableRemindersDialog(false)} onConfirm={handleConfirmDisableReminders} />
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        onSettingsSaved={handleSettingsSaved}
      />

      {/* Statistics Modal */}
      <StatisticsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
      />
    </div>
    </LayoutContext.Provider>
  );
}


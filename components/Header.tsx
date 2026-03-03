
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Activity, UserRole } from '../types';

interface HeaderProps {
  user: User;
  isDarkMode: boolean;
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isDarkMode,
  activities,
  setActivities,
  isSidebarOpen,
  setIsSidebarOpen,
  searchQuery,
  setSearchQuery
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const path = location.pathname.split('/').filter(p => p);
  const pageName = path.length > 0 ? path[0].charAt(0).toUpperCase() + path[0].slice(1) : 'Dashboard';

  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  // Filter activities based on role logic
  const filteredUnreadActivities = useMemo(() => {
    return activities.filter(act => {
      if (act.isRead) return false;
      if (isSuperAdmin) return true;
      const hasPermission = act.roles.includes(user.role);
      const isForMe = act.targetUserId ? act.targetUserId === user.id : true;
      return hasPermission && isForMe;
    });
  }, [activities, user.id, user.role, isSuperAdmin]);

  const markAllAsRead = () => {
    setActivities(prev => prev.map(act => {
      const isRelevant = isSuperAdmin || (act.roles.includes(user.role) && (act.targetUserId ? act.targetUserId === user.id : true));
      return isRelevant ? { ...act, isRead: true } : act;
    }));
  };

  const markAsRead = (id: number, assetId?: string) => {
    setActivities(prev => prev.map(act => act.id === id ? { ...act, isRead: true } : act));
    if (assetId) navigate(`/consent/${assetId}`);
    setShowNotifications(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="space-y-0.5 md:space-y-1">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            <span>Home</span>
            {path.map((p, i) => (
              <React.Fragment key={p}>
                <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                <span className="truncate max-w-[100px]">{p}</span>
              </React.Fragment>
            ))}
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight dark:text-white truncate max-w-[150px] md:max-w-none">{pageName}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative group hidden lg:block">
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery?.(e.target.value)}
            className="pl-12 pr-16 py-2.5 rounded-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-700/50 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 w-72 transition-all dark:text-white dark:placeholder-slate-500 outline-none text-sm"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors text-[20px]">search</span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm">⌘K</kbd>
          </div>
        </div>

        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 md:p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 ${showNotifications ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : ''}`}
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {filteredUnreadActivities.length > 0 && (
              <span className="absolute top-2 right-2 md:top-2 md:right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900 shadow-sm shadow-red-500/50 ring-2 ring-red-500/20 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-[calc(100vw-2rem)] md:w-[400px] bg-slate-900 dark:bg-slate-950 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-800 flex flex-col max-h-[500px] md:max-h-[600px] z-50">
              <div className="p-6 md:p-8 border-b border-white/5 dark:border-slate-800 flex items-center justify-between bg-slate-900/50 dark:bg-slate-950/50 backdrop-blur-md">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Notifications</h3>
                {filteredUnreadActivities.length > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-black text-blue-400 uppercase tracking-widest hover:underline">Mark all as read</button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                {filteredUnreadActivities.length > 0 ? (
                  filteredUnreadActivities.map(act => (
                    <button
                      key={act.id}
                      onClick={() => markAsRead(act.id, act.assetId)}
                      className="w-full p-5 md:p-6 text-left hover:bg-slate-800/60 transition-colors flex items-start gap-3 md:gap-4 border-b border-white/5 dark:border-slate-800/30 last:border-0"
                    >
                      <div className={`w-9 h-9 md:w-10 md:h-10 bg-${act.color}-900/20 rounded-xl flex items-center justify-center text-${act.color}-400 shrink-0`}>
                        <span className="material-symbols-outlined text-lg md:text-xl">{act.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-white text-sm truncate">{act.title}</p>
                          <span className="text-[9px] md:text-[10px] font-black text-slate-500 shrink-0">{act.time}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{act.desc}</p>
                        {act.hasCTA && (
                          <span className="inline-block mt-2 text-[9px] md:text-[10px] font-black text-blue-400 uppercase tracking-widest">Review Now &rarr;</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-10 md:p-12 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-700">
                      <span className="material-symbols-outlined text-3xl md:text-4xl">notifications_off</span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">All Caught Up</p>
                      <p className="text-xs font-bold text-slate-500">No new activities to report.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-6 bg-slate-900/80 dark:bg-slate-950/80 border-t border-white/5 dark:border-slate-800 text-center">
                <button
                  onClick={() => { setShowNotifications(false); navigate('/'); }}
                  className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                >
                  View All History
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2"></div>

        <div className="flex items-center gap-2 md:gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-black dark:text-white leading-none mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-[0.15em] leading-none">{user.department}</p>
          </div>
          <img src={user.avatar} className="w-9 h-9 md:w-10 md:h-10 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm group-hover:ring-4 ring-slate-100 dark:ring-slate-800 transition-all ml-1" alt="" />
        </div>
      </div>
    </header>
  );
};

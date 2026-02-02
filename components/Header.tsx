
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
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  isDarkMode, 
  activities, 
  setActivities, 
  isSidebarOpen, 
  setIsSidebarOpen 
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
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 glass-panel transition-colors">
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
            className="pl-12 pr-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500 w-64 transition-all dark:text-white dark:placeholder-slate-500 shadow-inner"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
        </div>

        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2.5 md:p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 ${showNotifications ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : ''}`}
          >
            <span className="material-symbols-outlined">notifications</span>
            {filteredUnreadActivities.length > 0 && (
              <span className="absolute top-1.5 right-1.5 md:top-2 md:right-2 w-4 md:w-5 h-4 md:h-5 bg-red-500 text-white text-[9px] md:text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                {filteredUnreadActivities.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-[calc(100vw-2rem)] md:w-[400px] glass-panel rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[500px] md:max-h-[600px] z-50">
              <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
                <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Notifications</h3>
                {filteredUnreadActivities.length > 0 && (
                  <button onClick={markAllAsRead} className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">Mark all as read</button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                {filteredUnreadActivities.length > 0 ? (
                  filteredUnreadActivities.map(act => (
                    <button 
                      key={act.id} 
                      onClick={() => markAsRead(act.id, act.assetId)}
                      className="w-full p-5 md:p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start gap-3 md:gap-4 border-b border-slate-50 dark:border-slate-800/30 last:border-0"
                    >
                      <div className={`w-9 h-9 md:w-10 md:h-10 bg-${act.color}-50 dark:bg-${act.color}-900/30 rounded-xl flex items-center justify-center text-${act.color}-600 dark:text-${act.color}-400 shrink-0`}>
                        <span className="material-symbols-outlined text-lg md:text-xl">{act.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{act.title}</p>
                          <span className="text-[9px] md:text-[10px] font-black text-slate-400 shrink-0">{act.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{act.desc}</p>
                        {act.hasCTA && (
                          <span className="inline-block mt-2 text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Review Now &rarr;</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-10 md:p-12 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-700">
                       <span className="material-symbols-outlined text-3xl md:text-4xl">notifications_off</span>
                    </div>
                    <div>
                      <p className="text-sm font-black dark:text-white">All Caught Up</p>
                      <p className="text-xs font-bold text-slate-400">No new activities to report.</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <button 
                  onClick={() => { setShowNotifications(false); navigate('/'); }}
                  className="text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest transition-colors"
                >
                  View All History
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2"></div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold dark:text-white leading-none mb-0.5">{user.name}</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-widest leading-none">{user.department}</p>
          </div>
          <img src={user.avatar} className="w-9 h-9 md:w-11 md:h-11 rounded-full border-2 md:border-4 border-white dark:border-slate-800 shadow-md" alt="" />
        </div>
      </div>
    </header>
  );
};

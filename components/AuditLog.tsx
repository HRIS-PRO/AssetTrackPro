
import React, { useMemo } from 'react';
import { useAssetTracker } from '../AssetTrackerContext';
import { UserRole } from '../types';

interface AuditLogProps {
  limit?: number;
  title?: string;
  showViewHistory?: boolean;
}

export const AuditLog: React.FC<AuditLogProps> = ({ 
  limit, 
  title = "Recent Activity", 
  showViewHistory = true 
}) => {
  const { activities, user } = useAssetTracker();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const filteredActivities = useMemo(() => {
    if (!user) return [];
    return activities.filter(act => {
      if (isSuperAdmin) return true;
      const hasPermission = act.roles.includes(user.role);
      const isForMe = act.targetUserId ? act.targetUserId === user.id || act.targetUserId === user.userId : true;
      return hasPermission && isForMe;
    });
  }, [activities, user, isSuperAdmin]);

  const displayedActivities = limit ? filteredActivities.slice(0, limit) : filteredActivities;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">history</span>
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h2>
        </div>
        {showViewHistory && (
          <button className="text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline">View History</button>
        )}
      </div>

      <div className="divide-y divide-slate-50 dark:divide-slate-800/50 flex-1 overflow-y-auto scrollbar-hide">
        {displayedActivities.length > 0 ? displayedActivities.map((act) => (
          <div key={act.id} className="p-8 space-y-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors relative">
            {!act.isRead && (
              <div className="absolute top-8 right-8 w-2 h-2 bg-blue-600 rounded-full"></div>
            )}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 bg-${act.color}-50 dark:bg-${act.color}-900/30 rounded-xl flex items-center justify-center text-${act.color}-600 dark:text-${act.color}-400 shrink-0`}>
                <span className="material-symbols-outlined">{act.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate pr-4">{act.title}</h4>
                  <span className="text-xs font-bold text-slate-400 shrink-0">{act.time}</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{act.desc}</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-4xl text-slate-200">history_toggle_off</span>
            <p className="font-bold text-slate-400">No activities to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};

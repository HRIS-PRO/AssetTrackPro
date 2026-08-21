import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetTracker } from '../AssetTrackerContext';
import { UserRole } from '../types';

export const ActivityHistory: React.FC = () => {
  const { activities, user } = useAssetTracker();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  // Filter activities by permission
  const userActivities = useMemo(() => {
    if (!user) return [];
    return activities.filter(act => {
      if (isSuperAdmin) return true;
      const hasPermission = act.roles?.includes(user.role);
      const isForMe = act.targetUserId ? act.targetUserId === user.id || act.targetUserId === user.userId : true;
      return hasPermission && isForMe;
    });
  }, [activities, user, isSuperAdmin]);

  // Search & type filter
  const filteredActivities = useMemo(() => {
    return userActivities.filter(act => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        act.title.toLowerCase().includes(q) ||
        act.desc.toLowerCase().includes(q) ||
        (act.time && act.time.toLowerCase().includes(q)) ||
        (act.assetId && act.assetId.toLowerCase().includes(q));

      const matchesType = selectedType === 'ALL' || act.type?.toUpperCase() === selectedType.toUpperCase();

      return matchesSearch && matchesType;
    });
  }, [userActivities, searchTerm, selectedType]);

  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));

  const paginatedActivities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredActivities.slice(start, start + pageSize);
  }, [filteredActivities, currentPage, pageSize]);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all shrink-0"
            title="Go Back"
          >
            <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Activity History Log</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Complete audit trail of system events, hardware assignments, and asset status changes
            </p>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800/40 shrink-0">
          {userActivities.length} Total Log Entries
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Search & Filter Bar */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search history by title, asset, or keyword..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
            {(['ALL', 'SYSTEM', 'ASSIGNMENT', 'UPDATE', 'MAINTENANCE'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setSelectedType(type); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  selectedType === type
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Activity List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {paginatedActivities.length > 0 ? (
            paginatedActivities.map(act => (
              <div key={act.id} className="p-6 md:p-8 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors flex items-start gap-5">
                <div className={`w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="material-symbols-outlined text-2xl">{act.icon || 'history'}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{act.title}</h3>
                    <span className="text-[11px] font-bold text-slate-400 shrink-0">{act.time}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{act.desc}</p>
                  {act.assetId && (
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md font-mono text-[10px] font-bold">
                      Asset Ref: #{act.assetId}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-20 text-center space-y-3">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">history_toggle_off</span>
              <p className="font-bold text-slate-500 dark:text-slate-400">No activity history matching your filter.</p>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {filteredActivities.length > pageSize && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/20 shrink-0">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredActivities.length)} of {filteredActivities.length} logs
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-all flex items-center gap-1"
              >
                Next
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

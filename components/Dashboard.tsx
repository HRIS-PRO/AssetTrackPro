
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, Asset, Activity } from '../types';

interface DashboardProps {
  user: User;
  assets: Asset[];
  isDarkMode: boolean;
  activities: Activity[];
  onRequestAsset: () => void;
  onReportProblem: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, assets, isDarkMode, activities, onRequestAsset, onReportProblem 
}) => {
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const navigate = useNavigate();

  // Unified Stat Cards Calculation
  const stats = useMemo(() => {
    const myAssets = assets.filter(a => a.assignedTo === user.id);
    const totalVal = assets.reduce((acc, curr) => acc + curr.purchasePrice, 0);

    const baseStats: Array<{
      label: string;
      value: string | number;
      icon: string;
      color: string;
      subText: string;
      largeIcon: string;
      badge?: string;
    }> = [
      {
        label: isSuperAdmin ? 'Total Assets' : 'My Total Assets',
        value: isSuperAdmin ? assets.length : myAssets.length,
        icon: 'devices',
        color: 'blue',
        subText: isSuperAdmin ? 'tracked globally' : 'items in possession',
        largeIcon: 'laptop_mac'
      },
      {
        label: 'Pending Consents',
        value: isSuperAdmin ? 12 : 1,
        icon: 'signature',
        color: 'amber',
        subText: isSuperAdmin ? 'global queue' : 'action required',
        largeIcon: 'gavel',
        badge: isSuperAdmin ? undefined : 'Action Required'
      },
      {
        label: isSuperAdmin ? 'Pending Requests' : 'Active Requests',
        value: isSuperAdmin ? 8 : 1,
        icon: 'confirmation_number',
        color: 'purple',
        subText: isSuperAdmin ? 'waiting approval' : 'in progress',
        largeIcon: 'receipt_long'
      }
    ];

    if (isSuperAdmin) {
      baseStats.push({
        label: 'Asset Value',
        value: `₦${(totalVal / 1000000).toFixed(1)}M`,
        icon: 'payments',
        color: 'green',
        subText: 'inventory valuation',
        largeIcon: 'account_balance_wallet'
      });
    }

    return baseStats;
  }, [assets, user.id, isSuperAdmin]);

  // Activity Filtering logic used for both Dashboard and Header
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      if (isSuperAdmin) return true;
      const hasPermission = act.roles.includes(user.role);
      const isForMe = act.targetUserId ? act.targetUserId === user.id : true;
      return hasPermission && isForMe;
    });
  }, [activities, user.id, user.role, isSuperAdmin]);

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Unified Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${stats.length} gap-6`}>
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm relative overflow-hidden group transition-all hover:border-blue-500/30">
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg bg-${stat.color}-50 dark:bg-${stat.color}-900/30 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                  <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{stat.label}</h3>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                {stat.badge && (
                  <span className={`px-3 py-1 bg-${stat.color}-100 dark:bg-${stat.color}-900/40 text-${stat.color}-700 dark:text-${stat.color}-300 text-[10px] font-black uppercase tracking-widest rounded-full`}>
                    {stat.badge}
                  </span>
                )}
              </div>
              {!stat.badge && <p className="text-sm font-bold text-slate-400 dark:text-slate-500 lowercase">{stat.subText}</p>}
            </div>
            <span className="material-symbols-outlined text-8xl absolute -right-4 -bottom-4 text-slate-100 dark:text-slate-800/20 pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
              {stat.largeIcon}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">history</span>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Recent Activity</h2>
            </div>
            <button className="text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline">View History</button>
          </div>
          
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50 flex-1">
            {filteredActivities.length > 0 ? filteredActivities.map((act) => (
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
                {act.hasCTA && act.targetUserId === user.id && (
                  <div className="pl-16">
                    <button 
                      onClick={() => navigate(`/consent/${(act as any).assetId || 'AST-001'}`)}
                      className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                    >
                      Take Action
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                 <span className="material-symbols-outlined text-4xl text-slate-200">history_toggle_off</span>
                 <p className="font-bold text-slate-400">No activities to display.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Column: Audit & Actions */}
        <div className="space-y-8">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                  {isSuperAdmin ? 'System Audit Active' : 'Your Verification Required'}
                </span>
              </div>
              <h3 className="text-3xl font-black tracking-tight mb-2">Q4 Annual Audit</h3>
              <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                {isSuperAdmin ? '75% of items verified across 12 departments.' : 'Complete verification for your 3 assigned assets.'}
              </p>
              <div className="space-y-3 mb-8">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-3/4 shadow-[0_0_10px_#3b82f6]"></div>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <span>Progress</span>
                  <span>75%</span>
                </div>
              </div>
              <button 
                onClick={() => navigate('/audits')}
                className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm tracking-tight hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                {isSuperAdmin ? 'View Audit Analytics' : 'Resume My Audit'}
              </button>
            </div>
            <span className="material-symbols-outlined text-[10rem] absolute -right-8 -top-4 text-white/5 pointer-events-none group-hover:rotate-12 transition-all duration-700">fact_check</span>
          </div>

          {!isSuperAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm space-y-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Quick Actions</h3>
              
              <button 
                onClick={onRequestAsset}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-blue-600 shadow-sm group-hover:rotate-12 transition-all">
                    <span className="material-symbols-outlined">add_circle</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">New Request</p>
                    <p className="text-[10px] font-bold text-slate-400">Asset or Upgrade</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={onReportProblem}
                className="w-full group flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-2xl transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl text-red-500 shadow-sm group-hover:rotate-12 transition-all">
                    <span className="material-symbols-outlined">report</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">Report Problem</p>
                    <p className="text-[10px] font-bold text-slate-400">Asset incident</p>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

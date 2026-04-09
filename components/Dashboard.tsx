
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, Asset, Activity, AssetStatus, EquipmentRequest, AssetReport } from '../types';
import { AuditLog } from './AuditLog';

interface DashboardProps {
  user: User;
  assets: Asset[];
  isDarkMode: boolean;
  activities: Activity[];
  onRequestAsset: () => void;
  onReportProblem: () => void;
  requests: EquipmentRequest[];
  managedRequests: EquipmentRequest[];
  allReports: AssetReport[];
  managedReports: AssetReport[];
}

export const Dashboard: React.FC<DashboardProps> = ({
  user, assets: initialAssets, isDarkMode, activities, onRequestAsset, onReportProblem, requests, managedRequests, allReports, managedReports
}) => {
  const [assets, setAssets] = React.useState<Asset[]>(initialAssets);
  const [activeAudit, setActiveAudit] = React.useState<any>(null);

  // Sync state if props change
  React.useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Fetch active audit for the dashboard widget
  React.useEffect(() => {
    const fetchAudits = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch(`/api/audits?t=${new Date().getTime()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const cycles = await res.json();
          const active = cycles.find((c: any) => c.status === 'In Progress') || cycles[0];
          setActiveAudit(active);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard audits", err);
      }
    };
    fetchAudits();
  }, []);

  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const navigate = useNavigate();
  const [isAccepting, setIsAccepting] = React.useState<string | null>(null);

  const handleAcceptAsset = async (assetId: string) => {
    if (isAccepting) return;
    setIsAccepting(assetId);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${assetId}/accept`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: AssetStatus.ACTIVE } : a));
      } else {
        const error = await res.json().catch(() => ({}));
        alert(`Failed to accept asset: ${error.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error while accepting asset.');
    } finally {
      setIsAccepting(null);
    }
  };

  const stats = useMemo(() => {
    const myAssets = assets.filter(a => a.assignedTo === user.id);
    const totalVal = assets.reduce((acc, curr) => {
      const price = typeof curr.purchasePrice === 'string' ? parseFloat(curr.purchasePrice.replace(/,/g, '')) : curr.purchasePrice;
      return acc + (isNaN(price as number) ? 0 : (price as number));
    }, 0);

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
          value: assets.filter(a => a.assignedTo === user.id && a.status === AssetStatus.PENDING).length,
          icon: 'signature',
          color: 'amber',
          subText: isSuperAdmin ? 'global queue' : 'action required',
          largeIcon: 'gavel',
          badge: assets.filter(a => a.assignedTo === user.id && a.status === AssetStatus.PENDING).length > 0 ? 'Action Required' : undefined
        },
        {
          label: isSuperAdmin ? 'Pending Requests' : 'Active Requests',
          value: isSuperAdmin ? managedRequests.filter(r => r.status !== 'APPROVED' && r.status !== 'REJECTED').length : requests.filter(r => r.status !== 'APPROVED' && r.status !== 'REJECTED').length,
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
  }, [assets, user.id, isSuperAdmin, managedRequests, requests]);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[500px]">
        {/* Recent Activity (Extracted) */}
        <div className="lg:col-span-2">
           <AuditLog />
        </div>

        {/* Side Column: Audit & Actions */}
        <div className="space-y-8 overflow-y-auto scrollbar-hide">
          {assets.filter(a => a.assignedTo === user.id && a.status === AssetStatus.PENDING).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-[2.5rem] border border-amber-200 dark:border-amber-800/30 p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-amber-600">assignment_late</span>
                <h3 className="text-sm font-black text-amber-900 dark:text-amber-500 uppercase tracking-widest">Pending Assignments</h3>
              </div>
              <div className="space-y-4">
                {assets.filter(a => a.assignedTo === user.id && a.status === AssetStatus.PENDING).map(asset => (
                  <div key={asset.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-amber-100 dark:border-amber-900/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{asset.name}</p>
                        <p className="text-xs font-bold text-slate-500">{asset.id}</p>
                      </div>
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase rounded-lg">Review</span>
                    </div>
                    <button
                      disabled={isAccepting === asset.id}
                      onClick={() => handleAcceptAsset(asset.id)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAccepting === asset.id && <span className="material-symbols-outlined text-[14px] animate-spin flex-shrink-0">sync</span>}
                      {isAccepting === asset.id ? 'Accepting...' : 'Accept Asset'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeAudit && (
            <div className="bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  {activeAudit.status === 'In Progress' && (
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                    {activeAudit.status === 'In Progress' ? (isSuperAdmin ? 'System Audit Active' : 'Your Verification Required') : 'Audit Status'}
                  </span>
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-2">{activeAudit.name}</h3>
                <p className="text-sm text-slate-300 mb-8 leading-relaxed">
                  {isSuperAdmin ? `${activeAudit.completion}% of items verified globally.` : `Audit cycle ID: ${activeAudit.displayId || activeAudit.id}`}
                </p>
                <div className="space-y-3 mb-8">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" style={{ width: `${activeAudit.completion}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Progress</span>
                    <span>{activeAudit.completion}%</span>
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
          )}

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

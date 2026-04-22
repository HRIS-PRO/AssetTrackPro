
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Asset, AssetStatus, UserRole } from '../types';
import { AssetLifecycleTimeline } from './AssetLifecycleTimeline';

interface AssetProfileProps {
  viewingAsset: Asset;
  user: User;
  onBack: () => void;
  getStatusColor: (status: AssetStatus) => string;
  acceptAsset: (id: string) => void;
  onReportAsset?: (id: string) => void;
  setIsReassigningAssetId: (id: string) => void;
  setIsDecommissioningAssetId: (id: string) => void;
  setIsUnassigningAssetId: (id: string) => void;
  onModifyAsset: (id: string) => void;
  allEmployees: any[];
  team: User[];
  superAdminModals: React.ReactNode;
}

export const AssetProfile: React.FC<AssetProfileProps> = ({
  viewingAsset, user, onBack, getStatusColor, acceptAsset, onReportAsset, 
  setIsReassigningAssetId, setIsDecommissioningAssetId, setIsUnassigningAssetId, onModifyAsset, allEmployees, team, superAdminModals
}) => {
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN_USER;
  const isAuditor = user.role === UserRole.AUDITOR;
  const navigate = useNavigate();
  const [showAudit, setShowAudit] = React.useState(false);

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('laptop')) return 'laptop_mac';
    if (c.includes('monitor')) return 'monitor';
    if (c.includes('phone') || c.includes('mobile')) return 'smartphone';
    return 'inventory_2';
  };

  const assignedUser = allEmployees.find(u => u.id === viewingAsset.assignedTo || u.userId === viewingAsset.assignedTo) || team.find(u => u.id === viewingAsset.assignedTo);

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
        <div className="space-y-4">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-[0.2em] transition-all group"
          >
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
            Back to Inventory
          </button>
          
          <div className="flex flex-wrap items-center gap-6">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter dark:text-white leading-none">
              {viewingAsset.name}
            </h2>
            <div className={`flex items-center gap-3 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg ${getStatusColor(viewingAsset.status)}`}>
               <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
               {viewingAsset.status}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
           {isSuperAdmin && (
             <button className="flex-1 md:flex-none btn-secondary group">
               <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">qr_code_2</span>
               Digital Tag
             </button>
           )}
           {(isSuperAdmin || isAuditor) && (
             <button onClick={() => onModifyAsset(viewingAsset.id)} className="flex-1 md:flex-none btn-primary group">
               <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">edit_square</span>
               Modify Data
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Media & Quick Actions */}
        <div className="xl:col-span-4 space-y-8">
          <div className="relative group overflow-hidden bg-white dark:bg-slate-900 rounded-[3.5rem] border-[4px] border-slate-100 dark:border-slate-800 p-12 aspect-square flex flex-col items-center justify-center shadow-2xl transition-all">
             <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="relative w-full h-full bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] flex items-center justify-center text-slate-200 dark:text-slate-700 group-hover:scale-105 transition-transform duration-700">
                <span className="material-symbols-outlined text-[10rem] group-hover:text-blue-600/20 transition-colors">
                  {getCategoryIcon(viewingAsset.category)}
                </span>
                <div className="absolute inset-x-0 bottom-8 flex justify-center">
                   <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-mono font-bold text-slate-400">UID: {viewingAsset.id.slice(0, 12)}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {viewingAsset.status === AssetStatus.PENDING && (viewingAsset.assignedTo === user.id || viewingAsset.assignedTo === user.userId) && (
               <button onClick={() => acceptAsset(viewingAsset.id)} className="col-span-2 action-card-special hover:border-blue-600 hover:bg-blue-50/30">
                  <span className="material-symbols-outlined text-3xl text-blue-500">verified_user</span>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Custody Consent</p>
                    <p className="text-sm font-black text-blue-600">CONFIRM RECEIPT</p>
                  </div>
               </button>
             )}
             
             {viewingAsset.status === AssetStatus.ACTIVE && !viewingAsset.hrConsentSubmitted && (viewingAsset.assignedTo === user.id || viewingAsset.assignedTo === user.userId) && (
               <button onClick={() => navigate(`/consent/${viewingAsset.id}/document`)} className="col-span-2 action-card-special hover:border-blue-600 hover:bg-blue-50/30">
                  <span className="material-symbols-outlined text-3xl text-blue-500">outgoing_mail</span>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Pending Document</p>
                    <p className="text-sm font-black text-blue-600">SEND CONSENT TO HR</p>
                  </div>
               </button>
             )}
             
             <button className="action-card group-repair">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-500">build_circle</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Maintenance</span>
             </button>
             
             {(isSuperAdmin || isAuditor) && (
               <button onClick={() => setShowAudit(!showAudit)} className={`action-card group-audit ${showAudit ? 'border-indigo-500 bg-indigo-50/10' : ''}`}>
                  <span className={`material-symbols-outlined group-hover:text-indigo-500 ${showAudit ? 'text-indigo-500' : 'text-slate-400'}`}>fact_check</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${showAudit ? 'text-indigo-600' : 'text-slate-400'}`}>Audit History</span>
               </button>
             )}

             {isSuperAdmin && viewingAsset.assignedTo && viewingAsset.status !== 'DECOMMISSIONED' && (
               <button onClick={() => setIsUnassigningAssetId(viewingAsset.id)} className="action-card group-unassign border-blue-500/20 hover:border-blue-500">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500">restart_alt</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unassign Unit</span>
               </button>
             )}

             {isSuperAdmin && viewingAsset.assignedTo && viewingAsset.status !== 'DECOMMISSIONED' && (
               <button onClick={() => setIsReassigningAssetId(viewingAsset.id)} className="action-card group-reassign">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600">person_search</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Change Owner</span>
               </button>
             )}

             {isSuperAdmin && viewingAsset.status !== 'DECOMMISSIONED' && (
               <button onClick={() => setIsDecommissioningAssetId(viewingAsset.id)} className="action-card group-retire group">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-red-500">no_sim</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Decommission</span>
               </button>
             )}
          </div>
        </div>

        {/* Right Column: Detailed Specs & Metadata */}
        <div className="xl:col-span-8 space-y-8">
           {/* Asset Identity Card */}
           <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border-[4px] border-slate-100 dark:border-slate-800 p-10 md:p-14 shadow-2xl space-y-12">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                   <span className="material-symbols-outlined font-black">dataset</span>
                </div>
                <div>
                   <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Hardware Specifications</h3>
                   <div className="flex items-center gap-2 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verfied Snapshot</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                 <SpecGroup label="Model Identifier" value={viewingAsset.modelNumber || 'ATP-STANDARD-GEN1'} icon="id_card" />
                 <SpecGroup label="Stock Unit ID" value={viewingAsset.id} icon="inventory" />
                 <SpecGroup label="Serial Key" value={viewingAsset.serialNumber || 'SN-UNAVAILABLE-00'} icon="key" />
                 <SpecGroup label="Hardware Category" value={viewingAsset.category} icon="category" />
                 <SpecGroup label="Operational Health" value={viewingAsset.condition} icon="monitor_heart" />
                 <SpecGroup label="Acquisition Data" value={new Date(viewingAsset.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} icon="calendar_today" />
              </div>

              <div className="pt-10 border-t border-slate-50 dark:border-slate-800 space-y-6">
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-slate-300">sticky_note_2</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Technician Remarks</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 relative">
                   <span className="material-symbols-outlined absolute top-6 right-8 text-6xl text-slate-100 dark:text-slate-800 pointer-events-none">format_quote</span>
                   <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">
                     {viewingAsset.description || "The device is in standard operational condition. No specialized maintenance log entries have been flagged for this hardware unit at this time."}
                   </p>
                </div>
              </div>
           </div>

           {/* Custodian Card */}
           {!showAudit && (
             <div className="bg-slate-900 dark:bg-blue-950/20 rounded-[3.5rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] group-hover:bg-blue-600/20 transition-all"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="space-y-8 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                           <span className="material-symbols-outlined">person_outline</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Current Custodian</p>
                      </div>

                      {assignedUser ? (
                        <div className="flex items-center gap-6">
                          <img src={assignedUser.avatar} className="w-24 h-24 rounded-[2rem] border-4 border-white/10 p-1 bg-white/5 shadow-2xl" alt="" />
                          <div className="space-y-2">
                             <h4 className="text-3xl font-black italic tracking-tighter">{assignedUser.name || assignedUser.firstName}</h4>
                             <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest">{assignedUser.department}</span>
                                <span className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest">{assignedUser.location || 'HQ Office'}</span>
                             </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h4 className="text-3xl font-black italic tracking-tighter text-white/20 uppercase">No Data Found</h4>
                          <p className="text-sm font-bold text-white/40">This asset is currently in the general warehouse awaiting assignment.</p>
                        </div>
                      )}
                   </div>

                   {isSuperAdmin && !assignedUser && (
                     <button onClick={() => setIsReassigningAssetId(viewingAsset.id)} className="px-10 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40">
                       Assign Unit
                     </button>
                   )}
                </div>
             </div>
           )}

           {showAudit && (
             <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border-[4px] border-slate-100 dark:border-slate-800 p-10 md:p-14 shadow-2xl mt-8">
               <AssetLifecycleTimeline assetId={viewingAsset.id} />
             </div>
           )}
        </div>
      </div>
      {superAdminModals}
    </div>
  );
};

const SpecGroup = ({ label, value, icon }: { label: string, value: string, icon: string }) => (
  <div className="flex items-start gap-5 group">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
       <span className="material-symbols-outlined text-xl">{icon}</span>
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-black dark:text-white truncate max-w-[150px]">{value}</p>
    </div>
  </div>
);

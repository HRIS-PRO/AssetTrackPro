import React, { useEffect, useState } from 'react';
import { AssetLifecycleLog } from '../types';

interface Props {
  assetId: string;
}


export const AssetLifecycleTimeline: React.FC<Props> = ({ assetId }) => {
  const [logs, setLogs] = useState<AssetLifecycleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch(`/api/assets/${assetId}/lifecycle`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        } else {
          console.error("Failed to fetch lifecycle logs", await res.text());
        }
      } catch (err) {
        console.error("Failed to fetch lifecycle logs", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <span className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></span>
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
        <p className="text-sm font-bold text-slate-500">No lifecycle data recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-10">
         <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
            <span className="material-symbols-outlined font-black">history</span>
         </div>
         <div>
            <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Lifecycle Audit Trail</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Immutable History Log</p>
         </div>
      </div>

      <div className="relative border-l-4 border-slate-100 dark:border-slate-800 ml-6 space-y-12 pb-8">
        {logs.map((log, index) => {
          let icon = "info";
          let colorClass = "text-slate-500 bg-slate-100";
          let badgeColor = "bg-slate-100 text-slate-600";
          
          switch (log.actionType) {
            case 'CREATED':
              icon = "add_box";
              colorClass = "text-blue-500 bg-blue-50";
              badgeColor = "bg-blue-100 text-blue-700";
              break;
            case 'ASSIGNED':
            case 'REASSIGNED':
              icon = "person_add";
              colorClass = "text-emerald-500 bg-emerald-50";
              badgeColor = "bg-emerald-100 text-emerald-700";
              break;
            case 'UNASSIGNED':
              icon = "person_remove";
              colorClass = "text-amber-500 bg-amber-50";
              badgeColor = "bg-amber-100 text-amber-700";
              break;
            case 'UPDATED':
              icon = "edit";
              colorClass = "text-indigo-500 bg-indigo-50";
              badgeColor = "bg-indigo-100 text-indigo-700";
              break;
            case 'DECOMMISSIONED':
              icon = "delete_forever";
              colorClass = "text-red-500 bg-red-50";
              badgeColor = "bg-red-100 text-red-700";
              break;
          }

          return (
            <div key={log.id} className="relative pl-10 group">
              {/* Timeline Node */}
              <div className={`absolute -left-[26px] top-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 ${colorClass}`}>
                 <span className="material-symbols-outlined text-xl">{icon}</span>
              </div>

              {/* Card */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-50 dark:border-slate-800/50 p-8 shadow-xl hover:shadow-2xl transition-all">
                 <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                   <div className="flex items-center gap-3">
                     <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                       {log.actionType}
                     </span>
                     <span className="text-xs font-bold text-slate-400">
                       {new Date(log.createdAt).toLocaleString()}
                     </span>
                   </div>
                   {log.performedBy && (
                     <div className="flex items-center gap-2">
                       <img src={`https://ui-avatars.com/api/?name=${log.performedBy.email?.split('@')[0] || 'User'}&background=f1f5f9&color=64748b`} alt="" className="w-8 h-8 rounded-full border-2 border-slate-100" />
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400">Performed by</p>
                         <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{log.performedBy.email || 'System User'}</p>
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Transfer Detail */}
                 {(log.previousAssignee || log.newAssignee) && (
                   <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl mb-4">
                     {log.previousAssignee && (
                       <div className="flex-1">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Previous Custodian</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{log.previousAssignee.email}</p>
                       </div>
                     )}
                     {log.previousAssignee && log.newAssignee && (
                       <div className="flex items-center justify-center text-slate-300">
                         <span className="material-symbols-outlined">arrow_right_alt</span>
                       </div>
                     )}
                     {log.newAssignee && (
                       <div className="flex-1 text-right">
                         <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">New Custodian</p>
                         <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{log.newAssignee.email}</p>
                       </div>
                     )}
                   </div>
                 )}

                 {/* Metadata */}
                 {log.metadata && Object.keys(log.metadata).length > 0 && (
                   <div className="mt-4">
                     <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Technical Metadata</p>
                     <pre className="text-[10px] font-mono text-slate-500 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl overflow-x-auto">
                       {JSON.stringify(log.metadata, null, 2)}
                     </pre>
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

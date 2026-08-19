import React, { useEffect, useState } from 'react';
import { AssetLifecycleLog } from '../types';

interface Props {
  assetId: string;
  refreshKey?: number;
}


export const AssetLifecycleTimeline: React.FC<Props> = ({ assetId, refreshKey }) => {
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
  }, [assetId, refreshKey]);

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
            case 'NOTE':
              icon = "sticky_note_2";
              colorClass = "text-slate-600 bg-slate-100";
              badgeColor = "bg-slate-200 text-slate-700";
              break;
          }

          return (
            <div key={log.id} className="relative pl-10 group">
              {/* Timeline Node */}
              <div className={`absolute -left-[22px] top-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110 ${colorClass}`}>
                 <span className="material-symbols-outlined text-lg">{icon}</span>
              </div>

              {/* Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-slate-800/60 p-5 md:p-6 shadow-lg hover:shadow-xl transition-all">
                 <div className="flex items-center justify-between gap-2 mb-3">
                   <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                     {log.actionType}
                   </span>
                   <span className="text-[10px] font-bold text-slate-400 shrink-0">
                     {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                   </span>
                 </div>

                 <div className="min-w-0">
                   {/* Manual note */}
                   {log.metadata?.note && (
                     <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed truncate" title={log.metadata.note}>
                       {log.metadata.note}
                     </p>
                   )}

                   {/* Transfer Details / Assignee */}
                   {(log.previousAssignee || log.newAssignee) && (
                     <div className="flex flex-col gap-2 mt-2">
                       {log.previousAssignee && (
                         <div className="min-w-0">
                           <p className="text-[9px] font-black uppercase text-slate-400">Previous Custodian</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={log.previousAssignee.email}>
                             {log.previousAssignee.email}
                           </p>
                         </div>
                       )}
                       {log.newAssignee && (
                         <div className="min-w-0">
                           <p className="text-[9px] font-black uppercase text-slate-400">New Custodian</p>
                           <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={log.newAssignee.email}>
                             {log.newAssignee.email}
                           </p>
                         </div>
                       )}
                     </div>
                   )}

                   {/* Status transition */}
                   {log.metadata?.oldStatus && log.metadata?.newStatus && log.metadata.oldStatus !== log.metadata.newStatus && (
                     <p className="text-xs font-bold mt-1 text-slate-700 dark:text-slate-200 truncate">
                       <span className="text-slate-400 uppercase">{log.metadata.oldStatus}</span>
                       <span className="text-slate-300 mx-1">→</span>
                       <span className="uppercase">{log.metadata.newStatus}</span>
                     </p>
                   )}

                   {/* Changed fields */}
                   {log.metadata?.changes && Object.keys(log.metadata.changes).length > 0 && (
                     <div className="flex flex-wrap gap-1.5 mt-2.5">
                       {Object.entries(log.metadata.changes).map(([k, v]) => (
                         <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-800 rounded text-[10px] font-bold text-slate-500 dark:text-slate-300">
                           <span className="text-slate-400 capitalize">{k}:</span>
                           <span className="text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{v === null || v === '' ? '—' : String(v)}</span>
                         </span>
                       ))}
                     </div>
                   )}

                   {/* Actor */}
                   {log.performedBy && (
                     <div className="min-w-0 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                       <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Performed by</p>
                       <p className="text-[11px] font-bold text-slate-500 truncate" title={log.performedBy.email || 'System User'}>
                         {log.performedBy.email || 'System User'}
                       </p>
                     </div>
                   )}
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

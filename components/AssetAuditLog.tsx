import React, { useEffect, useState } from 'react';
import { AssetLifecycleLog } from '../types';

interface Props {
  assetId: string;
  canLog: boolean;
  /** Bumped by the parent to force a refetch (e.g. after an action elsewhere). */
  refreshKey?: number;
  /** Called after a manual note is saved, so siblings (timeline) can refresh too. */
  onLogged?: () => void;
}

// Fields worth surfacing in the "what changed" summary; everything else is hidden as noise.
const FIELD_LABELS: Record<string, string> = {
  category: 'Category',
  condition: 'Condition',
  location: 'Location',
  department: 'Department',
  manager: 'Manager',
  serialNumber: 'Serial Number',
  modelNumber: 'Model',
  purchaseDate: 'Purchase Date',
  description: 'Description',
  status: 'Status',
};

const actionMeta = (type: string) => {
  switch (type) {
    case 'CREATED': return { icon: 'add_box', color: 'text-blue-600 bg-blue-50', label: 'Created' };
    case 'ASSIGNED': return { icon: 'person_add', color: 'text-emerald-600 bg-emerald-50', label: 'Assigned' };
    case 'REASSIGNED': return { icon: 'sync_alt', color: 'text-emerald-600 bg-emerald-50', label: 'Reassigned' };
    case 'UNASSIGNED': return { icon: 'person_remove', color: 'text-amber-600 bg-amber-50', label: 'Unassigned' };
    case 'UPDATED': return { icon: 'edit', color: 'text-indigo-600 bg-indigo-50', label: 'Updated' };
    case 'DECOMMISSIONED': return { icon: 'no_sim', color: 'text-red-600 bg-red-50', label: 'Decommissioned' };
    case 'NOTE': return { icon: 'sticky_note_2', color: 'text-slate-600 bg-slate-100', label: 'Note' };
    default: return { icon: 'info', color: 'text-slate-500 bg-slate-100', label: type };
  }
};

const changedFields = (metadata: any): { label: string; value: string }[] => {
  const changes = metadata?.changes;
  if (!changes || typeof changes !== 'object') return [];
  return Object.entries(changes)
    .filter(([k]) => FIELD_LABELS[k] !== undefined)
    .map(([k, v]) => ({
      label: FIELD_LABELS[k],
      value: v === null || v === undefined || v === '' ? '—' : String(v),
    }));
};

export const AssetAuditLog: React.FC<Props> = ({ assetId, canLog, refreshKey, onLogged }) => {
  const [logs, setLogs] = useState<AssetLifecycleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('asset_track_token');

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/assets/${assetId}/lifecycle`, {
        headers: { 'Authorization': `Bearer ${token()}` },
      });
      if (res.ok) setLogs(await res.json());
      else console.error('Failed to fetch audit log', await res.text());
    } catch (err) {
      console.error('Failed to fetch audit log', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, refreshKey]);

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/assets/${assetId}/lifecycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token()}`,
        },
        body: JSON.stringify({ note: text }),
      });
      if (res.ok) {
        const updated = await res.json();
        setLogs(Array.isArray(updated) ? updated : logs);
        setNote('');
        onLogged?.();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Failed to save entry');
      }
    } catch {
      setError('Network error — could not save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] border-[4px] border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-inner">
          <span className="material-symbols-outlined font-black">receipt_long</span>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Audit Log</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Every Change &amp; Manual Note</p>
        </div>
      </div>

      {/* Manual entry */}
      {canLog && (
        <form onSubmit={submitNote} className="mb-8">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 p-5 space-y-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a manual log entry — inspection notes, repairs, observations…"
              rows={3}
              className="w-full bg-transparent resize-none text-sm font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-3">
              {error
                ? <p className="text-[11px] font-bold text-red-500">{error}</p>
                : <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attributed to you</span>}
              <button
                type="submit"
                disabled={saving || !note.trim()}
                className="px-6 py-2.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-700 dark:hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving
                  ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  : <span className="material-symbols-outlined text-sm">add</span>}
                {saving ? 'Saving' : 'Add Entry'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <span className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></span>
        </div>
      ) : !logs.length ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-sm font-bold text-slate-500">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-1 max-h-[640px]">
          {logs.map((log) => {
            const meta = actionMeta(log.actionType);
            const fields = changedFields(log.metadata);
            const noteText = log.metadata?.note as string | undefined;
            const who = log.performedBy?.name || log.performedBy?.email || 'System';
            return (
              <div key={log.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${meta.color}`}>
                  <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">{meta.label}</span>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {noteText && (
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words">{noteText}</p>
                  )}

                  {(log.newAssignee || log.previousAssignee) && (
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {log.previousAssignee?.email && <span className="text-slate-400">{log.previousAssignee.email} </span>}
                      {log.previousAssignee && log.newAssignee && <span className="text-slate-300">→ </span>}
                      {log.newAssignee?.email && <span>{log.newAssignee.email}</span>}
                    </p>
                  )}

                  {fields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {fields.map((f) => {
                        const isLong = f.value.length > 25;
                        return (
                          <div key={f.label} className="flex flex-col gap-0.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg max-w-full">
                            <span className="text-[9px] font-black uppercase text-slate-400">{f.label}</span>
                            <span className={`text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-snug ${isLong ? 'break-words whitespace-normal' : 'whitespace-nowrap'}`}>{f.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[10px] font-bold text-slate-400 mt-1.5">by {who}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

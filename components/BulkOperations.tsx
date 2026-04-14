
import React from 'react';
import { createPortal } from 'react-dom';
import { useAssetTracker } from '../AssetTrackerContext';
import { AssetStatus } from '../types';

interface BulkOperationsProps {
  selectedAssetIds: string[];
  setSelectedAssetIds: (ids: string[]) => void;
  isBulkDecommissioning: boolean;
  setIsBulkDecommissioning: (val: boolean) => void;
  isBulkTagging: boolean;
  setIsBulkTagging: (val: boolean) => void;
  isBulkAccepting: boolean;
  setIsBulkAccepting: (val: boolean) => void;
  isBulkAssigningModalOpen: boolean;
  setIsBulkAssigningModalOpen: (val: boolean) => void;
}

export const BulkOperations: React.FC<BulkOperationsProps> = ({
  selectedAssetIds, setSelectedAssetIds,
  isBulkDecommissioning, setIsBulkDecommissioning,
  isBulkTagging, setIsBulkTagging,
  isBulkAccepting, setIsBulkAccepting,
  isBulkAssigningModalOpen, setIsBulkAssigningModalOpen
}) => {
  const { assets, setAssets, allEmployees, team, departments } = useAssetTracker();
  
  const [isBulkAcceptingState, setIsBulkAcceptingState] = React.useState(false);
  const [tagSelection, setTagSelection] = React.useState<string | null>(null);
  const [bulkAssignUserSearch, setBulkAssignUserSearch] = React.useState('');
  const [isBulkAssigning, setIsBulkAssigning] = React.useState(false);

  const applyBulkDecommission = () => {
    setAssets(prev => prev.map(a =>
      selectedAssetIds.includes(a.id) ? { ...a, status: AssetStatus.DECOMMISSIONED } : a
    ));
    setIsBulkDecommissioning(false);
    setSelectedAssetIds([]);
  };

  const applyBulkTag = () => {
    if (!tagSelection) return;
    setAssets(prev => prev.map(a =>
      selectedAssetIds.includes(a.id) ? { ...a, tags: Array.from(new Set([...(a.tags || []), tagSelection])) } : a
    ));
    setIsBulkTagging(false);
    setTagSelection(null);
    setSelectedAssetIds([]);
  };

  const applyBulkAccept = async () => {
    setIsBulkAcceptingState(true);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch('/api/assets/bulk-accept', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ assetIds: selectedAssetIds })
      });
      if (res.ok) {
        setAssets(prev => prev.map(a => selectedAssetIds.includes(a.id) ? { ...a, status: AssetStatus.ACTIVE } : a));
      } else {
        alert("Failed to bulk accept assets.");
      }
    } catch (err) {
      console.error(err);
      alert("Error accepting assets.");
    }
    setIsBulkAcceptingState(false);
    setIsBulkAccepting(false);
    setSelectedAssetIds([]);
  };

  const handleBulkAssign = async (userToAssign: any) => {
    setIsBulkAssigning(true);

    const deptName = userToAssign.department?.name || userToAssign.department || 'Unknown';
    let managerName = '';
    let finalDeptName = deptName;

    const uDeptId = userToAssign.department?.id || userToAssign.department;
    const uDeptName = userToAssign.department?.name || userToAssign.department;

    const fullDept = departments.find(d => d.id === uDeptId || d.name === uDeptName);
    if (fullDept) {
      finalDeptName = fullDept.name;
      if (fullDept.head?.name && fullDept.head?.name !== 'Unassigned') {
        managerName = fullDept.head.name;
      } else if (fullDept.headName && fullDept.headName !== 'Unassigned') {
        managerName = fullDept.headName;
      }
    }

    if (!managerName && userToAssign.hiringManagerId) {
      const mgr = allEmployees.find(emp => emp.userId === userToAssign.hiringManagerId || emp.id === userToAssign.hiringManagerId);
      if (mgr) {
        managerName = mgr.firstName ? `${mgr.firstName} ${mgr.surname}` : mgr.name;
      } else {
        managerName = userToAssign.hiringManagerId;
      }
    }

    const payload = {
      assetIds: selectedAssetIds,
      data: {
        assignedTo: userToAssign.userId || userToAssign.id,
        manager: managerName,
        department: finalDeptName,
        location: userToAssign.location || 'HQ Office'
      }
    };

    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/bulk-assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedAssetsData = await res.json();
        const updatedMap = new Map((updatedAssetsData as any[]).map(a => [a.id, a]));

        setAssets(prev => prev.map(a => updatedMap.has(a.id) ? updatedMap.get(a.id)! : a));

        setSelectedAssetIds([]);
        setIsBulkAssigningModalOpen(false);
        setBulkAssignUserSearch('');
      } else {
        const err = await res.json();
        alert(`Failed to bulk assign assets: ${err.message || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error making bulk assignment");
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const filteredBulkUsers = React.useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!bulkAssignUserSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + (u.surname || u.lastName || '')).toLowerCase().includes(bulkAssignUserSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(bulkAssignUserSearch.toLowerCase())
    );
  }, [bulkAssignUserSearch, allEmployees, team]);

  return createPortal((
    <>
      {/* Bulk Decommission Modal */}
      {isBulkDecommissioning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBulkDecommissioning(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-8 text-center bg-red-50 dark:bg-red-950/20">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl font-black">gavel</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Confirm Bulk Retire</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-2">You are about to decommission <span className="text-red-600">{selectedAssetIds.length}</span> assets. This action is permanent.</p>
            </div>
            <div className="p-6 md:p-8 flex gap-3 bg-white dark:bg-slate-900">
              <button onClick={() => setIsBulkDecommissioning(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={applyBulkDecommission} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-600 text-white shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">Yes, Decommission</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Tag Modal */}
      {isBulkTagging && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBulkTagging(false)}></div>
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Apply Label</h2>
              <p className="text-xs text-slate-400 font-black uppercase tracking-widest mt-1">Bulk Tagging ({selectedAssetIds.length} assets)</p>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['Crucial', 'Mobile', 'Remote', 'Office', 'High-Val'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setTagSelection(tag)}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${tagSelection === tag ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 md:p-8 pt-0 flex gap-3 mt-4">
              <button onClick={() => setIsBulkTagging(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Cancel</button>
              <button onClick={applyBulkTag} disabled={!tagSelection} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Accept Modal */}
      {isBulkAccepting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBulkAccepting(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-8 text-center bg-blue-50 dark:bg-blue-950/20">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl font-black">done_all</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Bulk Acceptance</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-2">You are confirming acceptance of <span className="text-blue-600">{selectedAssetIds.length}</span> assets. This will update their status to Active.</p>
            </div>
            <div className="p-6 md:p-8 flex gap-3 bg-white dark:bg-slate-900">
              <button onClick={() => setIsBulkAccepting(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={applyBulkAccept} disabled={isBulkAcceptingState} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                {isBulkAcceptingState && <span className="material-symbols-outlined text-xs animate-spin">refresh</span>}
                Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assignment Modal */}
      {isBulkAssigningModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBulkAssigningModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl font-black">person_add</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Bulk Assign Assets</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Assigning <span className="text-blue-600">{selectedAssetIds.length}</span> selected assets to one staff member.</p>
            </div>

            <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 flex-1 overflow-visible">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder="Search staff to assign..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all dark:text-white font-bold text-sm shadow-sm"
                  value={bulkAssignUserSearch}
                  onChange={e => setBulkAssignUserSearch(e.target.value)}
                />
              </div>

              <div className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-inner">
                {filteredBulkUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm font-bold">No users found</div>
                ) : (
                  filteredBulkUsers.map(u => {
                    const displayName = u.firstName ? `${u.firstName} ${u.surname}` : u.name;
                    const deptName = u.department?.name || u.department || 'Unknown';
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleBulkAssign(u)}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex items-center gap-4 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black overflow-hidden">
                          {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.firstName ? u.firstName[0] : (u.name ? u.name[0] : '?'))}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black dark:text-white group-hover:text-blue-600 transition-colors">{displayName}</p>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Department: {deptName}</p>
                        </div>
                        {isBulkAssigning ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <span className="material-symbols-outlined animate-spin text-blue-600">refresh</span>
                          </div>
                        ) : (
                          <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">chevron_right</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-950 text-center">
              <button onClick={() => setIsBulkAssigningModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </>
  ), document.body);
};

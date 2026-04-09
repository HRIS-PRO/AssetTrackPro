import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, AssetStatus, Asset } from '../types';
import { useAssetTracker } from '../AssetTrackerContext';
import { AssetProfile } from './AssetProfile';
import { AddAssetWorkflow } from './AddAssetWorkflow';
import { BulkOperations } from './BulkOperations';

interface AssetManagementProps {
  onReportAsset?: (assetId: string) => void;
  searchQuery?: string;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({
  onReportAsset, searchQuery
}) => {
  const {
    user, assets, setAssets, categories, 
    departments, assetLocations, team, allEmployees
  } = useAssetTracker();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('All');

  const onFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, val: string) => {
    setter(val);
    setCurrentPage(1);
  };
  
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetTab, setAssetTab] = useState<'ALL' | 'PENDING_ME'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk Ops Visibility State
  const [isBulkDecommissioning, setIsBulkDecommissioning] = useState(false);
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);
  const [isBulkAssigningModalOpen, setIsBulkAssigningModalOpen] = useState(false);

  // Single Action State
  const [isAcceptingAsset, setIsAcceptingAsset] = useState<string | null>(null);
  const [inlineAssignAssetId, setInlineAssignAssetId] = useState<string | null>(null);
  const [inlineUserSearch, setInlineUserSearch] = useState('');
  const [isInlineAssigning, setIsInlineAssigning] = useState<string | null>(null);

  // Super Admin Action State
  const [isReassigningAssetId, setIsReassigningAssetId] = useState<string | null>(null);
  const [reassignUserSearch, setReassignUserSearch] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);
  const [isDecommissioningAssetId, setIsDecommissioningAssetId] = useState<string | null>(null);
  const [isSubmittingDecommission, setIsSubmittingDecommission] = useState(false);

  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const isAuditor = user?.role === UserRole.AUDITOR;
  const canExportAndSeeUsers = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.AUDITOR;

  const displayAssets = isAdmin ? assets : assets.filter(a => a.assignedTo === user?.id);
  const pendingCount = assets.filter(a => a.status === AssetStatus.PENDING && (a.assignedTo === user?.id)).length;

  const filteredAssets = useMemo(() => {
    return displayAssets.filter(a => {
      if (assetTab === 'PENDING_ME') {
        if (a.status !== AssetStatus.PENDING) return false;
        if (a.assignedTo !== user?.id && a.assignedTo !== user?.userId) return false;
      }
      const query = searchQuery ? searchQuery.toLowerCase() : '';
      return (
        (a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query)) &&
        (selectedCategoryFilter === 'All' || a.category === selectedCategoryFilter) &&
        (selectedStatusFilter === 'All' || a.status === selectedStatusFilter) &&
        (selectedLocationFilter === 'All' || a.location === selectedLocationFilter)
      );
    });
  }, [displayAssets, assetTab, user, searchQuery, selectedCategoryFilter, selectedStatusFilter, selectedLocationFilter]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);

  const viewingAsset = useMemo(() =>
    assets.find(a => a.id === viewingAssetId), [assets, viewingAssetId]
  );

  const filteredInlineUsers = useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!inlineUserSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + (u.surname || u.lastName || '')).toLowerCase().includes(inlineUserSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(inlineUserSearch.toLowerCase())
    );
  }, [inlineUserSearch, allEmployees, team]);

  const filteredReassignUsers = useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!reassignUserSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + (u.surname || u.lastName || '')).toLowerCase().includes(reassignUserSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(reassignUserSearch.toLowerCase())
    );
  }, [reassignUserSearch, allEmployees, team]);

  const { canBulkAssign, canBulkAccept, isOnlyUnassigned } = useMemo(() => {
    const selectedList = assets.filter(a => selectedAssetIds.includes(a.id));
    if (selectedList.length === 0) return { canBulkAssign: false, canBulkAccept: false, isOnlyUnassigned: false };

    const isOnlyUnassigned = selectedList.every(a => (!a.assignedTo || a.status === 'IDLE'));
    const canBulkAssign = isAdmin && isOnlyUnassigned;
    const canBulkAccept = !isOnlyUnassigned && selectedList.some(a => a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user?.id || a.assignedTo === user?.userId));

    return { canBulkAssign, canBulkAccept, isOnlyUnassigned };
  }, [assets, selectedAssetIds, isAdmin, user]);

  const toggleSelectAll = () => {
    const selectableAssets = filteredAssets.filter(a =>
      (a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user?.id || a.assignedTo === user?.userId)) ||
      (isAdmin && (!a.assignedTo || a.status === 'IDLE'))
    );

    if (selectedAssetIds.length === selectableAssets.length && selectableAssets.length > 0) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(selectableAssets.map(a => a.id));
    }
  };

  const toggleSelectAsset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExportInventory = () => {
    setIsExporting(true);
    setTimeout(() => {
      const headers = ['Asset ID', 'Name', 'Category', 'User', 'Department', 'Status', 'Purchase Price', 'Purchase Date', 'Condition', 'Location'];
      const rows = filteredAssets.map(a => {
        const assignedUser = team.find(u => u.id === a.assignedTo)?.name || 'Unassigned';
        return [
          a.id, a.name, a.category, assignedUser, a.department, a.status, a.purchasePrice, a.purchaseDate, a.condition, a.location
        ];
      });

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `asset_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsExporting(false);
    }, 1200);
  };

  const acceptAsset = async (assetId: string) => {
    setIsAcceptingAsset(assetId);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${assetId}/accept`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setAssets(prev => prev.map(a => a.id === assetId ? { ...a, status: AssetStatus.ACTIVE } : a));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAcceptingAsset(null);
    }
  };

  const handleInlineAssign = async (assetId: string, userToAssign: any) => {
    setIsInlineAssigning(assetId);
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
      assignedTo: userToAssign.userId || userToAssign.id,
      manager: managerName,
      department: finalDeptName
    };

    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${assetId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedAsset = await res.json();
        setAssets(prev => prev.map(a => a.id === assetId ? updatedAsset : a));
        setInlineAssignAssetId(null);
        setInlineUserSearch('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsInlineAssigning(null);
    }
  };

  const handleReassign = async (userToAssign: any) => {
    if (!isReassigningAssetId) return;
    setIsSubmittingReassign(true);

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
      assignedTo: userToAssign.userId || userToAssign.id,
      manager: managerName,
      department: finalDeptName
    };

    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${isReassigningAssetId}/reassign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedAsset = await res.json();
        setAssets(prev => prev.map(a => a.id === isReassigningAssetId ? updatedAsset : a));
        setIsReassigningAssetId(null);
        setReassignUserSearch('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  const handleDecommission = async () => {
    if (!isDecommissioningAssetId) return;
    setIsSubmittingDecommission(true);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${isDecommissioningAssetId}/decommission`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const updatedAsset = await res.json();
        setAssets(prev => prev.map(a => a.id === isDecommissioningAssetId ? updatedAsset : a));
        setIsDecommissioningAssetId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingDecommission(false);
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.ACTIVE: return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400';
      case AssetStatus.MAINTENANCE: return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400';
      case AssetStatus.PENDING: return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400';
      case AssetStatus.LOST: return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400';
      case AssetStatus.DECOMMISSIONED: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      default: return 'bg-slate-50 dark:bg-slate-800 text-slate-500';
    }
  };

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('laptop')) return 'laptop_mac';
    if (c.includes('monitor')) return 'monitor';
    if (c.includes('phone') || c.includes('mobile')) return 'smartphone';
    return 'inventory_2';
  };

  const [isImportingBusy, setIsImportingBusy] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const processImport = async (file: File) => {
    setIsImportingBusy(true);
    setImportProgress(10);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const entry: any = {};
          headers.forEach((header, i) => {
            // Map common CSV headers to our internal field names
            const h = header.replace(/\s+/g, '');
            if (h === 'name' || h === 'assetname') entry.name = values[i];
            else if (h === 'category') entry.category = values[i];
            else if (h === 'serial' || h === 'serialnumber') entry.serialNumber = values[i];
            else if (h === 'price' || h === 'purchaseprice') entry.purchasePrice = values[i];
            else if (h === 'date' || h === 'purchasedate') entry.purchaseDate = values[i];
            else if (h === 'condition') entry.condition = values[i];
            else if (h === 'location') entry.location = values[i];
            else if (h === 'department') entry.department = values[i];
            else if (h === 'manager') entry.manager = values[i];
            else if (h === 'assignedto' || h === 'user' || h === 'owner') entry.assignedTo = values[i];
            else if (h === 'description') entry.description = values[i];
          });
          return entry;
        });

        setImportProgress(40);
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/assets/bulk-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          const newAssets = await res.json();
          setAssets(prev => [...newAssets, ...prev]);
          setImportProgress(100);
          setTimeout(() => {
            setIsImporting(false);
            setIsImportingBusy(false);
            setImportProgress(0);
          }, 800);
        } else {
           throw new Error('Import failed at storage level');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to process CSV. Ensure valid format.');
        setIsImportingBusy(false);
      }
    };
    reader.readAsText(file);
  };

  const superAdminModals = createPortal(
    <>
      {/* Reassign Modal */}
      {isReassigningAssetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsReassigningAssetId(null)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center rounded-2xl">
                   <span className="material-symbols-outlined text-3xl font-black">person_add</span>
                 </div>
                 <div>
                   <h2 className="text-xl font-black tracking-tight dark:text-white leading-tight">Reassign Asset</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Select target staff</p>
                 </div>
               </div>
            </div>
            <div className="p-8 space-y-6">
               <div className="relative group">
                 <input
                   type="text"
                   autoFocus
                   placeholder="Search employee name..."
                   className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 transition-all font-bold dark:text-white text-sm outline-none"
                   value={reassignUserSearch}
                   onChange={e => setReassignUserSearch(e.target.value)}
                 />
                 <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
               </div>
               <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                 {filteredReassignUsers.map(u => {
                   const displayName = u.firstName ? `${u.firstName} ${u.surname}` : u.name;
                   return (
                     <button
                        key={u.id}
                        onClick={() => handleReassign(u)}
                        disabled={isSubmittingReassign}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white dark:hover:bg-slate-800 border-2 border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all text-left"
                     >
                       <img src={u.avatar || `https://ui-avatars.com/api/?name=${displayName}`} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 shadow-sm" alt="" />
                       <div className="flex-1 min-w-0">
                         <p className="font-bold text-sm dark:text-white truncate">{displayName}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{u.department?.name || u.department || 'General'}</p>
                       </div>
                       {isSubmittingReassign ? <span className="material-symbols-outlined text-blue-500 animate-spin">sync</span> : <span className="material-symbols-outlined text-slate-300">chevron_right</span>}
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Decommission Modal */}
      {isDecommissioningAssetId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsDecommissioningAssetId(null)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg rounded-[3rem] shadow-2xl p-10 md:p-14 text-center space-y-8 animate-fade-in border border-red-500/20">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-red-500/10">
              <span className="material-symbols-outlined text-4xl">delete_forever</span>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-black italic tracking-tighter dark:text-white uppercase">Retire Equipment?</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-4">
                This action will mark the asset as <span className="text-red-500 underline underline-offset-4">DECOMMISSIONED</span>. It will be removed from active inventory and cannot be reassigned without an audit review.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleDecommission} disabled={isSubmittingDecommission} className="w-full py-5 rounded-2xl bg-red-600 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-red-500/30 hover:bg-red-500 transition-all flex items-center justify-center gap-3">
                {isSubmittingDecommission ? <span className="material-symbols-outlined animate-spin">sync</span> : <span className="material-symbols-outlined text-lg">check_circle</span>}
                Confirm Decommission
              </button>
              <button onClick={() => setIsDecommissioningAssetId(null)} className="w-full py-5 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100 dark:border-slate-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );

  if (viewingAsset) {
    return (
      <AssetProfile
        viewingAsset={viewingAsset}
        user={user!}
        onBack={() => setViewingAssetId(null)}
        getStatusColor={getStatusColor}
        acceptAsset={acceptAsset}
        onReportAsset={onReportAsset}
        setIsReassigningAssetId={setIsReassigningAssetId}
        setIsDecommissioningAssetId={setIsDecommissioningAssetId}
        allEmployees={allEmployees}
        team={team}
        superAdminModals={superAdminModals}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-2 h-10 bg-blue-600 rounded-full"></div>
             <h2 className="text-5xl font-black tracking-tighter dark:text-white">Assets</h2>
          </div>
          <p className="text-slate-400 font-bold ml-5">Centralized inventory control & lifecycle management.</p>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          {canExportAndSeeUsers && (
            <button onClick={handleExportInventory} disabled={isExporting} className="btn-secondary group">
              <span className={`material-symbols-outlined text-xl ${isExporting ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`}>{isExporting ? 'sync' : 'cloud_download'}</span>
              Export
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => setIsImporting(true)} className="btn-secondary group">
                <span className="material-symbols-outlined text-xl group-hover:-translate-y-1 transition-transform">upload_file</span>
                Import
              </button>
              <button onClick={() => setIsAdding(true)} className="btn-primary group">
                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">add</span>
                Add Asset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & View Switcher Toolbar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-8 flex flex-col md:flex-row gap-4 p-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none group-focus-within:text-blue-500">category</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => onFilterChange(setSelectedCategoryFilter, e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-[10px] uppercase tracking-[0.2em] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
          
          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none group-focus-within:text-blue-500">verified</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => onFilterChange(setSelectedStatusFilter, e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-[10px] uppercase tracking-[0.2em] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>

          <div className="flex-1 relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none group-focus-within:text-blue-500">location_on</span>
            <select
              value={selectedLocationFilter}
              onChange={(e) => onFilterChange(setSelectedLocationFilter, e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-black text-[10px] uppercase tracking-[0.2em] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer"
            >
              <option value="All">All Locations</option>
              {assetLocations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="lg:col-span-4 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-200 dark:border-slate-800">
           <div className="flex gap-1">
             <button onClick={() => { setAssetTab('ALL'); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${assetTab === 'ALL' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Inventory</button>
             <button onClick={() => { setAssetTab('PENDING_ME'); setCurrentPage(1); }} className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${assetTab === 'PENDING_ME' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}>
               Assignments {pendingCount > 0 && <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px]">{pendingCount}</span>}
             </button>
           </div>
           
           <div className="flex gap-1 pr-1">
             <button onClick={() => setViewMode('table')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-400'}`}><span className="material-symbols-outlined text-[20px]">table_rows</span></button>
             <button onClick={() => setViewMode('grid')} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-400'}`}><span className="material-symbols-outlined text-[20px]">grid_view</span></button>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-6 w-20">
                    <div className="flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={selectedAssetIds.length > 0 && selectedAssetIds.length === filteredAssets.length} 
                        onChange={toggleSelectAll} 
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 checked:bg-blue-600 transition-all cursor-pointer accent-blue-600"
                      />
                    </div>
                  </th>
                  <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ID / Info</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Custodian</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status & Health</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {paginatedAssets.length > 0 ? paginatedAssets.map(asset => {
                  const assignedUser = allEmployees.find(u => u.id === asset.assignedTo || u.userId === asset.assignedTo) || team.find(u => u.id === asset.assignedTo);
                  const isSelected = selectedAssetIds.includes(asset.id);
                  return (
                    <tr key={asset.id} onClick={() => setViewingAssetId(asset.id)} className={`group hover:bg-slate-50/80 dark:hover:bg-blue-900/10 cursor-pointer transition-all ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                      <td className="px-8 py-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected} 
                            onChange={(e) => toggleSelectAsset(asset.id, e as any)} 
                            className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 checked:bg-blue-600 transition-all cursor-pointer accent-blue-600"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-8">
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:bg-white group-hover:text-blue-600'}`}>
                             <span className="material-symbols-outlined text-2xl">{getCategoryIcon(asset.category)}</span>
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{asset.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-500">#{asset.id.slice(0, 8)}</span>
                               <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.category}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        {assignedUser ? (
                          <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 p-2 pr-4 rounded-2xl w-fit shadow-sm border border-slate-100 dark:border-slate-700/50 group-hover:border-blue-500/30 transition-all">
                            <img src={assignedUser.avatar} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" alt="" />
                            <div className="min-w-0">
                               <p className="text-xs font-black dark:text-white leading-none mb-0.5">{assignedUser.name || assignedUser.firstName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{assignedUser.department || 'General'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            {inlineAssignAssetId === asset.id ? (
                              <div className="absolute top-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-100 dark:border-slate-800 p-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                                <input autoFocus placeholder="Find custodian..." className="w-full px-4 py-2 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-xl mb-3 outline-none focus:ring-2 focus:ring-blue-600" value={inlineUserSearch} onChange={e => setInlineUserSearch(e.target.value)} />
                                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                                  {filteredInlineUsers.map(u => (
                                    <button key={u.id} className="w-full p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left rounded-xl transition-colors" onClick={() => handleInlineAssign(asset.id, u)}>
                                      <p className="text-xs font-black dark:text-white leading-none mb-1">{u.firstName ? `${u.firstName} ${u.surname}` : u.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{u.department || 'General'}</p>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <button onClick={e => { e.stopPropagation(); if(isAdmin) setInlineAssignAssetId(asset.id); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-500/50 transition-all font-black text-[10px] uppercase tracking-[0.2em] group/btn">
                                <span className="material-symbols-outlined text-[16px] group-hover/btn:scale-125 transition-transform">person_add</span>
                                Unassigned
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col gap-2">
                           <span className={`w-fit px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(asset.status)} shadow-sm`}>{asset.status}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.location}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{asset.condition}</span>
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        {asset.status === AssetStatus.PENDING && (asset.assignedTo === user?.id || asset.assignedTo === user?.userId) && (
                          <button 
                            onClick={e => { e.stopPropagation(); acceptAsset(asset.id); }} 
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                          >
                             {isAcceptingAsset === asset.id ? 'Processing...' : 'Accept Assignment'}
                          </button>
                        )}
                        <button className="p-3 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-white dark:hover:bg-slate-800 text-slate-500 transition-all">
                           <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={5} className="py-32 text-center space-y-4">
                       <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800">inventory_2</span>
                       <div>
                         <p className="text-lg font-black dark:text-white">No Assets Found</p>
                         <p className="text-sm font-bold text-slate-400">Try adjusting your filters or search query.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
           {paginatedAssets.length > 0 ? paginatedAssets.map(asset => {
             const isSelected = selectedAssetIds.includes(asset.id);
             return (
               <div 
                 key={asset.id} 
                 onClick={() => setViewingAssetId(asset.id)}
                 className={`group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 p-6 cursor-pointer transition-all ${isSelected ? 'border-blue-600 shadow-2xl' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xl'}`}
               >
                 <button 
                   onClick={e => toggleSelectAsset(asset.id, e as any)}
                   className={`absolute top-6 left-6 w-6 h-6 rounded-lg border-2 z-10 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 scale-0 group-hover:scale-100 opacity-0 group-hover:opacity-100'}`}
                 >
                   {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                 </button>

                 <div className="flex flex-col items-center text-center space-y-5 pt-4">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/40' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:scale-110 group-hover:text-blue-600 group-hover:bg-blue-50'}`}>
                       <span className="material-symbols-outlined text-4xl">{getCategoryIcon(asset.category)}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-lg font-black dark:text-white leading-tight uppercase tracking-tight truncate w-full px-2">{asset.name}</h3>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.category}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">#{asset.id.slice(0, 8)}</span>
                      </div>
                    </div>

                    <div className="w-full pt-4 border-t border-slate-50 dark:border-slate-800 mt-2 flex items-center justify-between">
                       <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(asset.status)}`}>{asset.status}</span>
                       <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-slate-300">location_on</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{asset.location.split(',')[0]}</span>
                       </div>
                    </div>
                 </div>
               </div>
             );
           }) : (
             <div className="col-span-full py-40 text-center space-y-4 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <span className="material-symbols-outlined text-6xl text-slate-100 dark:text-slate-800">sentiment_dissatisfied</span>
                <p className="font-black text-slate-400 uppercase tracking-widest">No matching results found</p>
             </div>
           )}
        </div>
      )}

      {/* Premium Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center items-center gap-4 animate-fade-in relative z-20">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-14 h-14 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 group"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">chevron_left</span>
          </button>
          
          <div className="flex gap-3 bg-white/50 dark:bg-slate-900/50 p-2 rounded-[2rem] backdrop-blur-sm border border-slate-100 dark:border-slate-800">
            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              const isActive = currentPage === page;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-2xl font-black text-xs transition-all duration-300 ${
                    isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                    : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="w-14 h-14 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:pointer-events-none transition-all hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 group"
          >
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">chevron_right</span>
          </button>
        </div>
      )}

      {/* Premium Bulk Operations Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-slate-900 dark:bg-[#020617] text-white px-10 py-5 rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-50 animate-bounce-in border border-white/10 backdrop-blur-3xl">
          <div className="flex items-center gap-4 border-r border-white/10 pr-6">
            <div className="flex -space-x-3">
              {[...Array(Math.min(selectedAssetIds.length, 3))].map((_, i) => (
                 <div key={i} className="w-10 h-10 rounded-full bg-blue-600 border-4 border-slate-900 flex items-center justify-center shadow-lg">
                   <span className="material-symbols-outlined text-lg">inventory_2</span>
                 </div>
              ))}
            </div>
            <div>
              <p className="text-xl font-black leading-none">{selectedAssetIds.length}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Selected</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            {!isOnlyUnassigned && <button onClick={() => setIsBulkTagging(true)} title="Bulk Tag" className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center text-amber-500"><span className="material-symbols-outlined">sell</span></button>}
            {canBulkAccept && <button onClick={() => setIsBulkAccepting(true)} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all">Accept Selected</button>}
            {canBulkAssign && <button onClick={() => setIsBulkAssigningModalOpen(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-500/20 transition-all">Assign Batch</button>}
            {!isOnlyUnassigned && isAdmin && <button onClick={() => setIsBulkDecommissioning(true)} title="Batch Decommission" className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 transition-all flex items-center justify-center text-red-500"><span className="material-symbols-outlined">delete</span></button>}
          </div>
          
          <button onClick={() => setSelectedAssetIds([])} className="ml-2 w-10 h-10 rounded-full hover:bg-white/10 text-slate-400 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isImporting && createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsImporting(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-10 flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center rounded-2xl">
                  <span className="material-symbols-outlined text-4xl font-black">cloud_upload</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight dark:text-white">Batch Import</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Asset Inventory Synchronization</p>
                </div>
              </div>
              <button onClick={() => setIsImporting(false)} className="w-12 h-12 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-300">
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            
            <div className="px-10 pb-10 space-y-8 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
               <div className="grid grid-cols-2 gap-4">
                 <button className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-blue-600 transition-all group">
                    <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-blue-600 transition-colors">description</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">CSV Template</p>
                 </button>
                 <button className="flex flex-col items-center justify-center gap-3 p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-blue-600 transition-all group">
                    <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-blue-600 transition-colors">table_view</span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600">Fetch from HRIS</p>
                 </button>
               </div>
               
               <div 
                 className="relative group cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <input
                   type="file"
                   ref={fileInputRef}
                   className="hidden"
                   accept=".csv"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       processImport(file);
                     }
                   }}
                 />
                 <div className="absolute inset-0 bg-blue-600 rounded-[3rem] opacity-0 group-hover:opacity-10 scale-95 group-hover:scale-100 transition-all"></div>
                 <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-20 text-center space-y-4 transition-all group-hover:border-blue-600">
                    {isImportingBusy ? (
                      <div className="space-y-6 animate-fade-in">
                         <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-blue-500/30 animate-pulse">
                            <span className="material-symbols-outlined text-4xl">sync</span>
                         </div>
                         <div className="space-y-2">
                           <p className="text-lg font-black dark:text-white uppercase tracking-tighter italic">Batch Processing...</p>
                           <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${importProgress}%` }}></div>
                           </div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{importProgress}% Initialized</p>
                         </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl mx-auto flex items-center justify-center text-slate-200 dark:text-slate-800 group-hover:text-blue-600 group-hover:scale-110 transition-all">
                           <span className="material-symbols-outlined text-5xl">upload_file</span>
                        </div>
                        <div>
                          <p className="text-lg font-black dark:text-white">Drop data source here</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">or browse local files</p>
                        </div>
                      </>
                    )}
                 </div>
               </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AddAssetWorkflow isAdding={isAdding} setIsAdding={setIsAdding} />
      
      <BulkOperations 
        selectedAssetIds={selectedAssetIds}
        setSelectedAssetIds={setSelectedAssetIds}
        isBulkDecommissioning={isBulkDecommissioning}
        setIsBulkDecommissioning={setIsBulkDecommissioning}
        isBulkTagging={isBulkTagging}
        setIsBulkTagging={setIsBulkTagging}
        isBulkAccepting={isBulkAccepting}
        setIsBulkAccepting={setIsBulkAccepting}
        isBulkAssigningModalOpen={isBulkAssigningModalOpen}
        setIsBulkAssigningModalOpen={setIsBulkAssigningModalOpen}
      />

      {superAdminModals}
    </div>
  );
};

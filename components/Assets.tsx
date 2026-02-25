
import React, { useState, useMemo } from 'react';
import { User, UserRole, Asset, AssetStatus } from '../types';

interface AssetManagementProps {
  user: User;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
  team: User[];
  onReportAsset?: (assetId: string) => void;
  searchQuery?: string;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({
  user, assets, setAssets, categories, setCategories, departments, setDepartments, team, onReportAsset, searchQuery
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [isAdding, setIsAdding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastAddedAsset, setLastAddedAsset] = useState<Asset | null>(null);
  const [viewingAssetId, setViewingAssetId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetTab, setAssetTab] = useState<'ALL' | 'PENDING_ME'>('ALL');

  // Bulk Ops Modal State
  const [isBulkDecommissioning, setIsBulkDecommissioning] = useState(false);
  const [isBulkTagging, setIsBulkTagging] = useState(false);

  const [isBulkAccepting, setIsBulkAccepting] = useState(false);
  const [isBulkAcceptingState, setIsBulkAcceptingState] = useState(false);
  const [isAcceptingAsset, setIsAcceptingAsset] = useState<string | null>(null);
  const [tagSelection, setTagSelection] = useState<string | null>(null);

  // Inline Assignment State
  const [inlineAssignAssetId, setInlineAssignAssetId] = useState<string | null>(null);
  const [inlineUserSearch, setInlineUserSearch] = useState('');
  const [isInlineAssigning, setIsInlineAssigning] = useState<string | null>(null);

  // Bulk Assignment State
  const [isBulkAssigningModalOpen, setIsBulkAssigningModalOpen] = useState(false);
  const [bulkAssignUserSearch, setBulkAssignUserSearch] = useState('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    condition: 'Brand New',
    category: '',
    serialNumber: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    warrantyExpiry: '',
    assignedTo: '',
    manager: '',
    department: '',
    location: '',
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);

  React.useEffect(() => {
    // Fetch actual employees list to replace mock team
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/employees', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setAllEmployees(data);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };

    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/departments', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          console.log(data)
          setAllDepartments(data);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };

    fetchEmployees();
    fetchDepartments();
  }, []);

  const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN_USER;
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
  const isAuditor = user.role === UserRole.AUDITOR;
  const canExportAndSeeUsers = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.AUDITOR;

  const displayAssets = isAdmin ? assets : assets.filter(a => a.assignedTo === user.id);

  const pendingCount = assets.filter(a => a.status === AssetStatus.PENDING && (a.assignedTo === user.id || a.assignedTo === user?.userId)).length;

  const filteredAssets = displayAssets.filter(a => {
    if (assetTab === 'PENDING_ME') {
      if (a.status !== AssetStatus.PENDING) return false;
      if (a.assignedTo !== user.id && a.assignedTo !== user?.userId) return false;
    }
    const query = searchQuery ? searchQuery.toLowerCase() : '';
    return (
      (a.name.toLowerCase().includes(query) || a.id.toLowerCase().includes(query)) &&
      (selectedCategoryFilter === 'All' || a.category === selectedCategoryFilter) &&
      (selectedStatusFilter === 'All' || a.status === selectedStatusFilter)
    );
  });

  const viewingAsset = useMemo(() =>
    assets.find(a => a.id === viewingAssetId), [assets, viewingAssetId]
  );

  const custodian = useMemo(() =>
    viewingAsset ? allEmployees.find(u => u.id === viewingAsset.assignedTo || u.userId === viewingAsset.assignedTo) || team.find(u => u.id === viewingAsset.assignedTo) : null
    , [viewingAsset, allEmployees, team]);

  const filteredUsers = useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!userSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + u.surname).toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userSearch, allEmployees, team]);

  const filteredInlineUsers = useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!inlineUserSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + u.surname).toLowerCase().includes(inlineUserSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(inlineUserSearch.toLowerCase())
    );
  }, [inlineUserSearch, allEmployees, team]);

  const filteredBulkUsers = useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!bulkAssignUserSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + u.surname).toLowerCase().includes(bulkAssignUserSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(bulkAssignUserSearch.toLowerCase())
    );
  }, [bulkAssignUserSearch, allEmployees, team]);

  const selectedTotalValue = useMemo(() => {
    return assets
      .filter(a => selectedAssetIds.includes(a.id))
      .reduce((sum, a) => sum + (Number(a.purchasePrice) || 0), 0);
  }, [assets, selectedAssetIds]);

  const { canBulkAssign, canBulkAccept, isOnlyUnassigned } = useMemo(() => {
    const selectedList = assets.filter(a => selectedAssetIds.includes(a.id));
    if (selectedList.length === 0) return { canBulkAssign: false, canBulkAccept: false, isOnlyUnassigned: false };

    const isOnlyUnassigned = selectedList.every(a => (!a.assignedTo || a.status === 'IDLE'));
    const canBulkAssign = isAdmin && isOnlyUnassigned;
    const canBulkAccept = !isOnlyUnassigned && selectedList.some(a => a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user.id || a.assignedTo === user?.userId));

    return { canBulkAssign, canBulkAccept, isOnlyUnassigned };
  }, [assets, selectedAssetIds, isAdmin, user]);

  const toggleSelectAll = () => {
    // Selectable assets are either PENDING assets assigned to me, OR if I'm admin, any PENDING or IDLE/unassigned asset.
    const selectableAssets = filteredAssets.filter(a =>
      (a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user.id || a.assignedTo === user?.userId)) ||
      (isAdmin && (!a.assignedTo || a.status === 'IDLE'))
    );

    if (selectedAssetIds.length === selectableAssets.length) {
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

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Category', 'Serial Number', 'Purchase Price', 'Purchase Date', 'Condition', 'Location', 'Department', 'Manager', 'Assigned User ID', 'Description'];
    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "asset_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      } else {
        alert("Failed to accept asset");
      }
    } catch (err) {
      console.error(err);
      alert("Error accepting asset");
    }
    setIsAcceptingAsset(null);
  };

  const handleInlineAssign = async (assetId: string, userToAssign: any) => {
    setIsInlineAssigning(assetId);

    // Resolve department and manager details for this user
    const deptName = userToAssign.department?.name || userToAssign.department || 'Unknown';
    let managerName = '';
    let finalDeptName = deptName;

    const uDeptId = userToAssign.department?.id || userToAssign.department;
    const uDeptName = userToAssign.department?.name || userToAssign.department;

    const fullDept = allDepartments.find(d => d.id === uDeptId || d.name === uDeptName);
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
      } else {
        const err = await res.json();
        alert(`Failed to assign asset: ${err.message || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error assigning asset");
    } finally {
      setIsInlineAssigning(null);
    }
  };

  const handleBulkAssign = async (userToAssign: any) => {
    setIsBulkAssigning(true);

    const deptName = userToAssign.department?.name || userToAssign.department || 'Unknown';
    let managerName = '';
    let finalDeptName = deptName;

    const uDeptId = userToAssign.department?.id || userToAssign.department;
    const uDeptName = userToAssign.department?.name || userToAssign.department;

    const fullDept = allDepartments.find(d => d.id === uDeptId || d.name === uDeptName);
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
        department: finalDeptName
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

  const validate = (type?: 'another' | 'consent') => {
    const newErrors: Record<string, boolean> = {};
    const required = ['name', 'category', 'serialNumber', 'purchasePrice'];

    // Only strictly require assignment details if we are sending for consent
    if (type === 'consent') {
      required.push('assignedTo', 'manager', 'department');
    }

    required.forEach(field => {
      if (!formData[field as keyof typeof formData]) newErrors[field] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (type?: 'another' | 'consent') => {
    if (!validate(type)) return;

    setIsCreatingAsset(true);
    // Switch to FormData for multipart upload
    const submitData = new FormData();
    if (receiptFile) {
      submitData.append('receipt', receiptFile);
    }
    submitData.append('data', JSON.stringify({
      name: formData.name,
      category: formData.category,
      assignedTo: formData.assignedTo,
      department: formData.department,
      purchaseDate: formData.purchaseDate,
      purchasePrice: parseFloat(formData.purchasePrice),
      condition: formData.condition,
      location: formData.location,
      manager: formData.manager,
      serialNumber: formData.serialNumber,
      description: formData.description
    }));

    try {
      const token = localStorage.getItem('asset_track_token');
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: submitData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to create asset: ${errorData.message || response.statusText}`);
        return;
      }

      const newAsset = await response.json();

      setAssets(prev => [newAsset, ...prev]);
      setLastAddedAsset(newAsset);

      if (type === 'another') {
        setFormData({
          name: '', condition: 'Brand New', category: '', serialNumber: '', description: '',
          purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '',
          warrantyExpiry: '', assignedTo: '', manager: '', department: '', location: ''
        });
        setUserSearch('');
        setReceiptFile(null);
      } else {
        setShowSuccess(true);
      }
    } catch (err) {
      console.error("Error creating asset", err);
      alert("An error occurred while creating the asset");
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case AssetStatus.ACTIVE: return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400';
      case AssetStatus.MAINTENANCE: return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400';
      case AssetStatus.PENDING: return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400';
      case AssetStatus.LOST: return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400';
      case AssetStatus.DECOMMISSIONED: return 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  if (viewingAsset) {
    return (
      <div className="space-y-8 animate-fade-in pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              <button onClick={() => setViewingAssetId(null)} className="hover:text-blue-600 transition-colors">Assets</button>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-blue-600 dark:text-blue-400">Asset Profile</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter dark:text-white">{viewingAsset.name}</h2>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(viewingAsset.status)}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                {viewingAsset.status}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{viewingAsset.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            {isSuperAdmin && (
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full border-[3px] border-slate-200 dark:border-slate-800 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <span className="material-symbols-outlined text-sm">qr_code_2</span>
                QR Code
              </button>
            )}
            {(isSuperAdmin || isAuditor) && (
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-8 w-full">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 p-10 flex flex-col items-center justify-center aspect-square shadow-sm transition-colors">
              <div className="w-full h-full bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-700">
                <span className="material-symbols-outlined text-[10rem]">
                  {viewingAsset.category.toLowerCase().includes('laptop') ? 'laptop_mac' :
                    viewingAsset.category.toLowerCase().includes('monitor') ? 'monitor' :
                      viewingAsset.category.toLowerCase().includes('furniture') ? 'chair' : 'inventory_2'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {viewingAsset.status === AssetStatus.PENDING && (viewingAsset.assignedTo === user.id || viewingAsset.assignedTo === user?.userId) && (
                <button
                  onClick={() => acceptAsset(viewingAsset.id)}
                  className="group flex flex-col items-center justify-center gap-3 p-6 bg-blue-50 dark:bg-blue-900/20 border-[3px] border-blue-100 dark:border-blue-800 rounded-3xl hover:border-blue-600 hover:shadow-xl transition-all"
                >
                  <span className="material-symbols-outlined text-blue-400 group-hover:text-blue-600 transition-colors">check_circle</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Accept</span>
                </button>
              )}
              {isSuperAdmin && (
                <button className="group flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-slate-800 rounded-3xl hover:border-blue-600 hover:shadow-xl transition-all">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors">print</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Label</span>
                </button>
              )}
              <button className="group flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-slate-800 rounded-3xl hover:border-amber-500 hover:shadow-xl transition-all">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-amber-500 transition-colors">build</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Repair</span>
              </button>
              <button className="group flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-slate-800 rounded-3xl hover:border-purple-600 hover:shadow-xl transition-all">
                <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-600 transition-colors">assignment_return</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">InOut</span>
              </button>

              <button
                onClick={() => onReportAsset?.(viewingAsset.id)}
                className="group flex flex-col items-center justify-center gap-3 p-6 bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-slate-800 rounded-3xl hover:border-red-600 hover:shadow-xl transition-all"
              >
                <span className="material-symbols-outlined text-slate-400 group-hover:text-red-600 transition-colors">history</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Issue</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8 w-full">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 p-6 md:p-10 shadow-sm overflow-hidden relative">
              <div className="flex items-center gap-4 mb-10 border-b border-slate-50 dark:border-slate-800 pb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl font-black">info</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">General Info</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Asset Name</p>
                    <p className="text-lg font-bold dark:text-white">{viewingAsset.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Asset ID</p>
                    <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded font-mono text-sm font-bold dark:text-slate-300">{viewingAsset.id}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Category</p>
                    <p className="text-sm font-bold dark:text-white">{viewingAsset.category}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Model Number</p>
                    <p className="text-sm font-bold dark:text-white">{viewingAsset.modelNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Serial Number</p>
                    <p className="font-mono text-sm font-bold dark:text-white">{viewingAsset.serialNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Purchase Date</p>
                    <p className="text-sm font-bold dark:text-white">{new Date(viewingAsset.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl">
                    {viewingAsset.description || 'No description provided for this asset.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use the global search input here if passed as a prop, otherwise an empty string 
  // currently filter is unused in the UI but could be hooked up later to the Header.

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Filters & Actions */}
      <div className="flex flex-col gap-4 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">

          {/* Left Side: Dropdown Filters */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-48 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none transition-colors text-lg">category</span>
              <select
                className="w-full pl-12 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 font-bold text-xs dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all cursor-pointer appearance-none shadow-sm"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
            </div>

            <div className="relative flex-1 sm:w-48 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 pointer-events-none transition-colors text-lg">rule</span>
              <select
                className="w-full pl-12 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 font-bold text-xs dark:text-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all cursor-pointer appearance-none shadow-sm"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                {Object.values(AssetStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-lg">expand_more</span>
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            {canExportAndSeeUsers && (
              <button
                onClick={handleExportInventory}
                disabled={isExporting}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm ${isExporting ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
              >
                <span className={`material-symbols-outlined text-sm ${isExporting ? 'animate-spin' : ''}`}>
                  {isExporting ? 'sync' : 'download'}
                </span>
                {isExporting ? 'Wait' : 'Export'}
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => setIsImporting(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  Import
                </button>
                <button
                  onClick={() => setIsAdding(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add Asset
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab Filters */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setAssetTab('ALL')}
          className={`px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all ${assetTab === 'ALL' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl' : 'bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          All Assigned
        </button>
        <button
          onClick={() => setAssetTab('PENDING_ME')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all ${assetTab === 'PENDING_ME' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30' : 'bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
        >
          Pending Acceptance
          {pendingCount > 0 && (
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${assetTab === 'PENDING_ME' ? 'bg-white text-blue-600' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600'}`}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-black/20 transition-colors mb-8">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm border-b-2 border-slate-100 dark:border-slate-800">
                <th className="px-8 py-5 w-16">
                  <div className="flex items-center justify-center">
                    <label className="relative flex items-center justify-center cursor-pointer group">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={
                          filteredAssets.filter(a =>
                            (a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user.id || a.assignedTo === user?.userId)) ||
                            (isAdmin && (!a.assignedTo || a.status === 'IDLE'))
                          ).length > 0 &&
                          selectedAssetIds.length === filteredAssets.filter(a =>
                            (a.status === AssetStatus.PENDING && (isAdmin || a.assignedTo === user.id || a.assignedTo === user?.userId)) ||
                            (isAdmin && (!a.assignedTo || a.status === 'IDLE'))
                          ).length
                        }
                        onChange={toggleSelectAll}
                      />
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-[2.5px] border-slate-300 dark:border-slate-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 dark:peer-checked:bg-blue-500 dark:peer-checked:border-blue-500 transition-all duration-200 ease-out group-hover:border-blue-400"></div>
                      <span className="material-symbols-outlined absolute text-white text-[16px] md:text-[18px] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-300 pointer-events-none drop-shadow-sm font-black">check</span>
                    </label>
                  </div>
                </th>
                <th className="px-4 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Asset ID</th>
                <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Name & Category</th>
                {canExportAndSeeUsers && <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">User</th>}
                <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Dept</th>
                <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Status</th>
                {isAdmin && <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">Price</th>}
                <th className="px-8 py-5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/80">
              {filteredAssets.map((asset) => {
                const assignedUser = allEmployees.find(u => u.id === asset.assignedTo || u.userId === asset.assignedTo) || team.find(u => u.id === asset.assignedTo);
                const canSelect =
                  (asset.status === AssetStatus.PENDING && (isAdmin || asset.assignedTo === user.id || asset.assignedTo === user?.userId)) ||
                  (isAdmin && (!asset.assignedTo || asset.status === 'IDLE'));

                return (
                  <tr
                    key={asset.id}
                    onClick={() => setViewingAssetId(asset.id)}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all duration-200 group cursor-pointer ${selectedAssetIds.includes(asset.id) ? 'bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/60 dark:hover:bg-blue-900/20' : ''}`}
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center">
                        {canSelect && (
                          <label className="relative flex items-center justify-center cursor-pointer group/checkbox" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={selectedAssetIds.includes(asset.id)}
                              onChange={(e) => toggleSelectAsset(asset.id, e as any)}
                            />
                            <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg border-[2.5px] border-slate-300 dark:border-slate-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 dark:peer-checked:bg-blue-500 dark:peer-checked:border-blue-500 transition-all duration-200 ease-out group-hover/checkbox:border-blue-400"></div>
                            <span className="material-symbols-outlined absolute text-white text-[16px] md:text-[18px] opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-50 transition-all duration-300 pointer-events-none drop-shadow-sm font-black">check</span>
                          </label>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 group-hover:text-blue-600 transition-colors">qr_code_2</span>
                        <span className="font-mono text-sm font-bold dark:text-slate-200">{asset.id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[120px] md:max-w-none">{asset.name}</p>
                          {asset.tags?.map(tag => (
                            <div key={tag} className={`w-2 h-2 rounded-full ${tag}`}></div>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{asset.category}</p>
                      </div>
                    </td>
                    {canExportAndSeeUsers && (
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          {assignedUser ? (
                            <>
                              <img src={assignedUser?.avatar} className="w-6 h-6 rounded-full border border-slate-100 hidden sm:block bg-slate-200" alt="" />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{assignedUser.name || assignedUser?.firstName}</span>
                            </>
                          ) : (
                            <div className="relative">
                              {inlineAssignAssetId === asset.id ? (
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 z-50 w-56 flex flex-col shadow-xl rounded-xl overflow-hidden animate-fade-in border border-blue-500/20 bg-white dark:bg-slate-900 ring-4 ring-blue-500/10">
                                  <div className="flex bg-slate-50 dark:bg-slate-800/80 p-1">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-slate-400">search</span>
                                    <input
                                      autoFocus
                                      type="text"
                                      placeholder="Search user to assign..."
                                      className="w-full bg-transparent pl-8 pr-2 py-1.5 text-[10px] font-bold outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                      value={inlineUserSearch}
                                      onChange={e => setInlineUserSearch(e.target.value)}
                                    />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setInlineAssignAssetId(null); setInlineUserSearch(''); }}
                                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">close</span>
                                    </button>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto scrollbar-hide py-1">
                                    {isInlineAssigning === asset.id ? (
                                      <div className="px-4 py-4 text-center">
                                        <span className="material-symbols-outlined text-[16px] text-blue-500 animate-spin">refresh</span>
                                      </div>
                                    ) : filteredInlineUsers.length === 0 ? (
                                      <div className="px-4 py-3 text-[9px] font-bold text-slate-500 text-center uppercase tracking-widest">No users found</div>
                                    ) : (
                                      filteredInlineUsers.map(u => {
                                        const displayName = u.firstName ? `${u.firstName} ${u.surname}` : u.name;
                                        const deptName = u.department?.name || u.department || 'Unknown';
                                        return (
                                          <div
                                            key={u.id}
                                            className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center gap-2"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleInlineAssign(asset.id, u);
                                            }}
                                          >
                                            <img src={u.avatar || `https://ui-avatars.com/api/?name=${displayName}`} className="w-5 h-5 rounded-full object-cover" alt="" />
                                            <div>
                                              <p className="font-bold text-[10px] dark:text-white leading-tight">{displayName}</p>
                                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{deptName}</p>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  disabled={!isAdmin}
                                  onClick={(e) => {
                                    if (isAdmin) {
                                      e.stopPropagation();
                                      setInlineAssignAssetId(asset.id);
                                    }
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isAdmin ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer transition-colors group/assign' : 'cursor-default'}`}
                                >
                                  <span className={`text-[10px] font-bold ${isAdmin ? 'text-slate-600 dark:text-slate-400 group-hover/assign:text-slate-900 dark:group-hover/assign:text-white' : 'italic text-slate-400 dark:text-slate-500'}`}>Unassigned</span>
                                  {isAdmin && <span className="material-symbols-outlined text-[12px] text-slate-400 group-hover/assign:text-slate-600">person_add</span>}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{asset.department}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(asset.status)}`}>
                        {asset.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-6">
                        <span className="font-black text-xs text-slate-900 dark:text-white">₦{asset.purchasePrice.toLocaleString()}</span>
                      </td>
                    )}
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {asset.status === AssetStatus.PENDING && (asset.assignedTo === user.id || asset.assignedTo === user?.userId) && (
                          <button
                            onClick={(e) => { e.stopPropagation(); acceptAsset(asset.id); }}
                            disabled={isAcceptingAsset === asset.id}
                            className={`px-4 py-1.5 flex items-center justify-center gap-1.5 bg-blue-600 text-white font-black rounded-full text-[10px] md:text-[11px] hover:bg-blue-700 transition shadow-md shadow-blue-500/20 active:scale-95 min-w-[80px] ${isAcceptingAsset === asset.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {isAcceptingAsset === asset.id ? (
                              <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span>
                            ) : (
                              'Accept'
                            )}
                          </button>
                        )}
                        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Operations Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-2 sm:px-4 py-2 rounded-full shadow-2xl flex flex-wrap items-center justify-center gap-1 sm:gap-2 z-40 animate-fade-in border border-slate-200 dark:border-slate-800 ring-4 ring-black/5 max-w-[95vw]">
          <div className="flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-2 border-r border-slate-200 dark:border-slate-700">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#1985f0] text-white flex items-center justify-center font-black text-[10px] sm:text-xs">{selectedAssetIds.length}</div>
          </div>

          <div className="flex items-center gap-1">
            {!isOnlyUnassigned && (
              <button onClick={() => setIsBulkTagging(true)} className="p-2 sm:p-3 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/10 text-amber-600 dark:text-amber-500 transition-all font-black" title="Tag">
                <span className="material-symbols-outlined text-lg">sell</span>
              </button>
            )}

            <div className="px-2 text-slate-400 dark:text-slate-500 font-mono text-[10px] font-black hidden sm:block">
              ₦{selectedTotalValue.toLocaleString()}
            </div>

            {canBulkAccept && (
              <button
                onClick={() => setIsBulkAccepting(true)}
                className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest ml-1"
              >
                <span className="material-symbols-outlined text-lg hidden sm:inline">check_circle</span>
                Accept Selected
              </button>
            )}

            {canBulkAssign && (
              <button
                onClick={() => setIsBulkAssigningModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest ml-1"
              >
                <span className="material-symbols-outlined text-lg hidden sm:inline">person_add</span>
                Assign to User
              </button>
            )}

            {!isOnlyUnassigned && isAdmin && (
              <button onClick={() => setIsBulkDecommissioning(true)} className="p-2 sm:p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition-all font-black ml-1" title="Decommission">
                <span className="material-symbols-outlined text-lg">delete_sweep</span>
              </button>
            )}
          </div>

          <button
            onClick={() => setSelectedAssetIds([])}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 transition-all ml-1 sm:ml-2"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {isBulkAssigningModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsBulkAssigningModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-fade-in flex flex-col">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800/80">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-2xl font-black">person_add</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Assign {selectedAssetIds.length} Assets</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">Select a user to assign these assets to.</p>
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
                        className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors ${isBulkAssigning ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${displayName}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs dark:text-white truncate">{displayName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{deptName}</p>
                        </div>
                        {isBulkAssigning && <span className="material-symbols-outlined text-slate-400 animate-spin">refresh</span>}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsBulkAssigningModalOpen(false)}
                disabled={isBulkAssigning}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stern Warning: Decommission Modal */}
      {isBulkDecommissioning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md" onClick={() => setIsBulkDecommissioning(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-red-500/50 p-8 md:p-12 text-center space-y-8">
            <div className="w-16 md:w-20 h-16 md:h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <span className="material-symbols-outlined text-4xl">warning</span>
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stern Warning</h2>
              <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                <span className="text-red-600 font-black">IRREVERSIBLE ACTION.</span> You are about to decommission <span className="font-black text-slate-900 dark:text-white">{selectedAssetIds.length} assets</span>.
                They will be permanently removed from active inventory.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={applyBulkDecommission}
                className="w-full py-4 rounded-full bg-red-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-red-500/30 hover:bg-red-500 transition-all"
              >
                Confirm Decommission
              </button>
              <button
                onClick={() => setIsBulkDecommissioning(false)}
                className="w-full py-4 rounded-full border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Tagging Modal */}
      {isBulkTagging && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsBulkTagging(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 p-8 space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-black dark:text-white">Apply Visual Tags</h2>
              <p className="text-sm font-bold text-slate-400">Mark <span className="text-blue-600">{selectedAssetIds.length} assets</span></p>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { name: 'Priority', color: 'bg-red-500' },
                { name: 'System', color: 'bg-blue-500' },
                { name: 'Operational', color: 'bg-green-500' },
                { name: 'Warning', color: 'bg-amber-500' },
                { name: 'Special', color: 'bg-purple-500' }
              ].map(tag => (
                <button
                  key={tag.color}
                  onClick={() => setTagSelection(tag.color)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all ${tagSelection === tag.color ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className={`w-8 h-8 rounded-full ${tag.color} shadow-lg`}></div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 truncate w-full text-center">{tag.name}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsBulkTagging(false)}
                className="flex-1 py-4 rounded-full border-2 border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest text-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={applyBulkTag}
                disabled={!tagSelection}
                className={`flex-1 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest shadow-xl transition-all ${!tagSelection ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Bulk Accept Summary */}
      {isBulkAccepting && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsBulkAccepting(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-8 md:p-10 text-center space-y-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black dark:text-white">Bulk Accept</h2>
                <p className="text-sm text-slate-500 font-bold">Accept assignment of <span className="text-slate-900 dark:text-white font-black">{selectedAssetIds.length} assets</span>.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setIsBulkAccepting(false)}
                  className="flex-1 py-4 rounded-full border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-white font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={applyBulkAccept}
                  disabled={isBulkAcceptingState}
                  className={`flex-1 flex justify-center items-center py-4 rounded-full bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all ${isBulkAcceptingState ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isBulkAcceptingState ? <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> : 'Accept Assets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => setIsImporting(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  <span>Assets</span>
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                  <span className="text-blue-600 dark:text-blue-400">Import Assets</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight dark:text-white">Bulk Import</h2>
              </div>
              <button onClick={() => setIsImporting(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 md:space-y-10">
              <div className="flex flex-col md:flex-row gap-6 items-start bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">download</span>
                </div>
                <div className="space-y-3">
                  <h4 className="text-base md:text-lg font-black dark:text-white leading-none">Template</h4>
                  <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">Download our CSV template to prepare your data.</p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-xl"
                  >
                    Get CSV
                  </button>
                </div>
              </div>

              <div className="p-10 md:p-16 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-blue-600 transition-all bg-slate-50/50 dark:bg-slate-800/20 relative">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" />
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all">
                  <span className="material-symbols-outlined text-3xl md:text-4xl">upload_file</span>
                </div>
                <div className="text-center">
                  <p className="text-base md:text-lg font-black dark:text-white">Upload File</p>
                  <p className="text-xs md:text-sm font-bold text-slate-400">Ready to sync</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex gap-4">
              <button
                onClick={() => setIsImporting(false)}
                className="flex-1 py-4 rounded-full font-black text-xs tracking-tight border-2 border-slate-200 dark:border-slate-700 dark:text-white"
              >
                Cancel
              </button>
              <button className="flex-1 py-4 rounded-full bg-blue-600 text-white font-black text-xs tracking-tight shadow-xl">
                Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ASSET WORKFLOW */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => !showSuccess && setIsAdding(false)}></div>

          <div className="relative bg-white dark:bg-slate-950 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]">

            {!showSuccess ? (
              <>
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex justify-between items-center shrink-0">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      <button onClick={() => setIsAdding(false)} className="hover:text-blue-600">Assets</button>
                      <span className="material-symbols-outlined text-xs">chevron_right</span>
                      <span className="text-blue-600 dark:text-blue-400">Add New Asset</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight dark:text-white">Register Equipment</h2>
                  </div>
                  <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 scrollbar-hide">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm font-black">info</span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">1. Basic Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Asset Name {errors.name && <span className="text-red-500 lowercase font-bold" aria-live="polite">— Required</span>}</label>
                        <input
                          type="text"
                          placeholder="e.g. MacBook Pro 16-inch"
                          className={`w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.name ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm`}
                          value={formData.name}
                          onChange={e => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: false }); }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Asset Condition</label>
                        <select
                          className="w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm"
                          value={formData.condition}
                          onChange={e => setFormData({ ...formData, condition: e.target.value })}
                        >
                          <option>Brand New</option>
                          <option>Good/Like New</option>
                          <option>Fairly Good</option>
                          <option>Bad Condition</option>
                          <option>Very bad Condition</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Category {errors.category && <span className="text-red-500 lowercase font-bold">— Required</span>}</label>
                        <div className="flex gap-2">
                          {isCreatingCategory ? (
                            <div className="flex-1 flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                className="flex-1 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-blue-500 outline-none font-bold text-sm"
                                placeholder="Category name..."
                                value={newCategoryInput}
                                onChange={e => setNewCategoryInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && (setCategories([...categories, newCategoryInput]), setFormData({ ...formData, category: newCategoryInput }), setIsCreatingCategory(false), setNewCategoryInput(''))}
                              />
                              <button onClick={() => setIsCreatingCategory(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex gap-2">
                              <select
                                className={`flex-1 px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.category ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm`}
                                value={formData.category}
                                onChange={e => { setFormData({ ...formData, category: e.target.value }); if (errors.category) setErrors({ ...errors, category: false }); }}
                              >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c}>{c}</option>)}
                              </select>
                              <button onClick={() => setIsCreatingCategory(true)} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-blue-500/20 shrink-0">
                                <span className="material-symbols-outlined text-sm">add</span>
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3 px-2">
                          {categories.map(c => (
                            <div key={c} className="flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400">
                              {c}
                              <button onClick={() => setCategories(categories.filter(x => x !== c))} className="material-symbols-outlined text-[14px] hover:text-red-500 transition-colors">close</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Serial Number {errors.serialNumber && <span className="text-red-500 lowercase font-bold">— Required</span>}</label>
                        <input
                          type="text"
                          placeholder="e.g. SN-A2780-XYZ"
                          className={`w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.serialNumber ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-mono font-bold shadow-inner text-sm`}
                          value={formData.serialNumber}
                          onChange={e => { setFormData({ ...formData, serialNumber: e.target.value }); if (errors.serialNumber) setErrors({ ...errors, serialNumber: false }); }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Purchase Amount {errors.purchasePrice && <span className="text-red-500 lowercase font-bold">— Required</span>}</label>
                        <div className={`flex items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-6 py-3 border-2 ${errors.purchasePrice ? 'border-red-500/50' : 'border-transparent'} focus-within:ring-2 focus-within:ring-blue-600 transition-all shadow-inner`}>
                          <span className="text-slate-400 font-bold mr-2 text-sm">₦</span>
                          <input
                            type="number"
                            className="w-full bg-transparent border-none outline-none font-bold dark:text-white text-sm"
                            placeholder="0.00"
                            value={formData.purchasePrice}
                            onChange={e => { setFormData({ ...formData, purchasePrice: e.target.value }); if (errors.purchasePrice) setErrors({ ...errors, purchasePrice: false }); }}
                          />
                          <span className="text-[10px] font-black text-slate-400 ml-2">NGN</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Purchase Date</label>
                        <input
                          type="date"
                          className="w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm"
                          value={formData.purchaseDate}
                          onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Description</label>
                        <textarea
                          rows={2}
                          placeholder="Technical specifications and internal notes..."
                          className="w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm resize-none"
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Warranty Expiry (Optional)</label>
                        <input
                          type="date"
                          className="w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm"
                          value={formData.warrantyExpiry}
                          onChange={e => setFormData({ ...formData, warrantyExpiry: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm font-black">person</span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">2. Assignment details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2 relative">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Assigned User {errors.assignedTo && <span className="text-red-500 lowercase font-bold">— Required for consent</span>}</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search staff..."
                            className={`w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.assignedTo ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm`}
                            value={userSearch}
                            onFocus={() => setShowUserDropdown(true)}
                            onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                          />
                          {showUserDropdown && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] overflow-hidden max-h-48 overflow-y-auto scrollbar-hide animate-fade-in">
                              {filteredUsers.map(u => {
                                // Determine display name and ID depending on if it's API data or Mock data
                                const displayName = u.firstName ? `${u.firstName} ${u.surname}` : u.name;
                                const assigneeId = u.userId || u.id;
                                const deptName = u.department?.name || u.department || 'Unknown';

                                return (
                                  <div
                                    key={u.id}
                                    onClick={() => {
                                      // Auto-fill manager and department logic
                                      let managerName = '';
                                      let finalDeptName = deptName;

                                      // The user's department property usually contains an ID.
                                      const uDeptId = u.department?.id || u.department;
                                      const uDeptName = u.department?.name || u.department;

                                      const fullDept = allDepartments.find(d => d.id === uDeptId || d.name === uDeptName);
                                      if (fullDept) {
                                        finalDeptName = fullDept.name;
                                        if (fullDept.head?.name && fullDept.head?.name !== 'Unassigned') {
                                          managerName = fullDept.head.name;
                                        } else if (fullDept.headName && fullDept.headName !== 'Unassigned') {
                                          managerName = fullDept.headName;
                                        }
                                      }

                                      // Fallback to employee's hiringManagerId if department head is not found
                                      if (!managerName && u.hiringManagerId) {
                                        const mgr = allEmployees.find(emp => emp.userId === u.hiringManagerId || emp.id === u.hiringManagerId);
                                        if (mgr) {
                                          managerName = mgr.firstName ? `${mgr.firstName} ${mgr.surname}` : mgr.name;
                                        } else {
                                          managerName = u.hiringManagerId;
                                        }
                                      }

                                      setFormData({
                                        ...formData,
                                        assignedTo: assigneeId,
                                        department: finalDeptName,
                                        manager: managerName || formData.manager // update if found
                                      });
                                      setUserSearch(displayName);
                                      setShowUserDropdown(false);
                                      if (errors.assignedTo) setErrors({ ...errors, assignedTo: false });
                                    }}
                                    className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 last:border-0"
                                  >
                                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${displayName}`} className="w-8 h-8 rounded-full object-cover" alt="" />
                                    <div>
                                      <p className="font-bold text-xs dark:text-white">{displayName}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase">{deptName}</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Staff Manager {errors.manager && <span className="text-red-500 lowercase font-bold">— Required</span>}</label>
                        <input
                          type="text"
                          readOnly
                          className={`w-full px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 ${errors.manager ? 'border-red-500/50' : 'border-transparent'} outline-none text-slate-500 dark:text-slate-400 font-bold shadow-inner text-sm cursor-not-allowed`}
                          value={formData.manager || ''}
                          placeholder="Auto-filled upon assignment"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Department {errors.department && <span className="text-red-500 lowercase font-bold">— Required</span>}</label>
                        <input
                          type="text"
                          readOnly
                          className={`w-full px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 ${errors.department ? 'border-red-500/50' : 'border-transparent'} outline-none text-slate-500 dark:text-slate-400 font-bold shadow-inner text-sm cursor-not-allowed`}
                          value={formData.department || ''}
                          placeholder="Auto-filled upon assignment"
                        />
                      </div>

                      <div className="space-y-2 lg:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Physical Location</label>
                        <input
                          type="text"
                          placeholder="e.g. HQ Floor 3, Desk 42"
                          className="w-full px-6 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold shadow-inner text-sm"
                          value={formData.location}
                          onChange={e => setFormData({ ...formData, location: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm font-black">photo_camera</span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">3. Media Upload</h3>
                    </div>

                    <div className="p-16 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-blue-600 transition-all bg-slate-50/50 dark:bg-slate-800/20 relative">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setReceiptFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-all scale-100 group-hover:scale-110">
                        <span className="material-symbols-outlined text-4xl">
                          {receiptFile ? 'check_circle' : 'cloud_upload'}
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-base md:text-lg font-black dark:text-white">
                          {receiptFile ? receiptFile.name : 'Upload Asset Condition Photo'}
                        </p>
                        <p className="text-xs md:text-sm font-bold text-slate-400">
                          {receiptFile ? 'File attached successfully' : 'or drag and drop file here'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 backdrop-blur-md flex flex-wrap gap-3 shrink-0 justify-center">
                  <button
                    onClick={() => setIsAdding(false)}
                    disabled={isCreatingAsset}
                    className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 border-slate-200 dark:border-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm ${isCreatingAsset ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cancel
                  </button>

                  {formData.assignedTo ? (
                    <button
                      onClick={() => handleSave('consent')}
                      disabled={isCreatingAsset}
                      className={`flex-[2] min-w-[220px] py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${isCreatingAsset ? 'opacity-70 cursor-not-allowed hidden' : ''}`}
                    >
                      {isCreatingAsset ? (
                        <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">signature</span>
                          Save & Send for Consent
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSave()}
                      disabled={isCreatingAsset}
                      className={`flex-[2] min-w-[220px] py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${isCreatingAsset ? 'opacity-70 cursor-not-allowed hidden' : ''}`}
                    >
                      {isCreatingAsset ? (
                        <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">save</span>
                          Save Asset
                        </>
                      )}
                    </button>
                  )}

                  {/* Keep the loading button always visible when loading to prevent layout shift */}
                  {isCreatingAsset && (
                    <button
                      disabled
                      className="flex-[2] min-w-[220px] py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg opacity-70 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                      Processing...
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 md:p-20 text-center space-y-8 flex flex-col items-center animate-fade-in overflow-y-auto">
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20">
                  <span className="material-symbols-outlined text-5xl">check_circle</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter dark:text-white mb-2">Registration Complete</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold max-w-sm mx-auto">
                    Asset <strong>{lastAddedAsset?.id}</strong> recorded.
                    {lastAddedAsset?.assignedTo && ` Consent workflow has been dispatched to ${lastAddedAsset.manager || 'their manager'}.`}
                  </p>
                </div>

                <div className="p-8 bg-white rounded-[2.5rem] shadow-2xl border-4 border-slate-50 flex flex-col items-center gap-6">
                  <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center relative group overflow-hidden">
                    <span className="material-symbols-outlined text-7xl text-slate-300">qr_code_2</span>
                    <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="bg-white px-4 py-2 rounded-full font-black text-[10px] text-blue-600 shadow-xl uppercase tracking-widest">Download QR</button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full max-w-md">
                  <button
                    onClick={() => { setShowSuccess(false); setIsAdding(false); }}
                    className="flex-1 py-4 rounded-full font-black text-xs uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] transition-all shadow-xl"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      setShowSuccess(false);
                      setFormData({
                        name: '', condition: 'Brand New', category: '', serialNumber: '', description: '',
                        purchaseDate: new Date().toISOString().split('T')[0], purchasePrice: '',
                        warrantyExpiry: '', assignedTo: '', manager: '', department: '', location: ''
                      });
                      setUserSearch('');
                    }}
                    className="flex-1 py-4 rounded-full font-black text-xs uppercase tracking-widest border-2 border-slate-200 dark:border-slate-800 dark:text-white hover:bg-slate-50 transition-all"
                  >
                    Add More
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

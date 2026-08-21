import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAssetTracker } from '../AssetTrackerContext';
import { useToast } from './Toast';
import { User, Asset } from '../types';

export const ConsentManagement: React.FC = () => {
  const { team, assets, loading, triggerByodConsent, pendingByodUserIds: globalPendingByod, signedByodRecords } = useAssetTracker();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'signed' | 'pending' | 'unrequested'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [directLoadingUserId, setDirectLoadingUserId] = useState<string | null>(null);
  const [pendingConsentUserIds, setPendingConsentUserIds] = useState<Record<string, boolean>>({});

  // Modal states for Trigger Consent Request
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [consentModuleType, setConsentModuleType] = useState<'byod' | 'asset'>('asset');
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL'); // 'ALL' or user.id
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  // Helper to retrieve assigned assets for a user strictly from real assets context
  const getUserAssignedAssets = (member: { id: string; email: string; name?: string }): Asset[] => {
    return assets.filter(a => a.assignedTo === member.id || a.assignedTo === member.email);
  };

  // Build live directory members from real team, assets, & BYOD consent context
  const liveDirectoryMembers = useMemo(() => {
    return team.map((member) => {
      const memberAssets = getUserAssignedAssets(member);
      
      let assetStatus: 'signed' | 'pending' | 'unrequested' = 'unrequested';
      let assetName: string | undefined = undefined;

      if (pendingConsentUserIds[member.id]) {
        assetStatus = 'pending';
        assetName = memberAssets.map(a => a.name).join(', ') || undefined;
      } else if (memberAssets.length > 0) {
        const allSigned = memberAssets.every(a => !!a.hrConsentSubmitted);
        if (allSigned) {
          assetStatus = 'signed';
          assetName = memberAssets.map(a => a.name).join(', ');
        } else {
          assetStatus = 'pending';
          assetName = memberAssets.filter(a => !a.hrConsentSubmitted).map(a => a.name).join(', ');
        }
      }

      let byodStatus: 'signed' | 'unrequested' | 'pending' = 'unrequested';
      let byodDevCount: number | undefined = undefined;

      const signedByodRecord = signedByodRecords[member.id];
      if (signedByodRecord) {
        byodStatus = 'signed';
        byodDevCount = signedByodRecord.selectedDevices?.length || 1;
      } else if (globalPendingByod[member.id] || globalPendingByod['ALL']) {
        byodStatus = 'pending';
      }

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        department: member.department || 'Operations',
        roleLabel: (member.role || 'USER').replace(/_/g, ' '),
        avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366F1&color=fff`,
        byodStatus,
        byodDevCount,
        assetStatus,
        assetName,
        assignedAssets: memberAssets,
        originalMember: member as User
      };
    });
  }, [team, assets, pendingConsentUserIds, globalPendingByod, signedByodRecords]);

  // Recipient list for modal: When Asset Custody is selected, ONLY staff with assigned assets show!
  const recipientsList = useMemo(() => {
    if (consentModuleType === 'asset') {
      return liveDirectoryMembers.filter(m => m.assignedAssets.length > 0);
    }
    return liveDirectoryMembers;
  }, [consentModuleType, liveDirectoryMembers]);

  // Auto-sync selectedUserId when recipients list changes or modal type changes
  useEffect(() => {
    if (consentModuleType === 'byod') {
      setSelectedUserId('ALL');
    } else {
      if (recipientsList.length > 0) {
        const exists = recipientsList.some(r => r.id === selectedUserId);
        if (!exists || selectedUserId === 'ALL') {
          setSelectedUserId(recipientsList[0].id);
        }
      } else {
        setSelectedUserId('');
      }
    }
  }, [consentModuleType, recipientsList]);

  const selectedUser = useMemo(() => {
    if (selectedUserId === 'ALL') return null;
    return liveDirectoryMembers.find(m => m.id === selectedUserId) || recipientsList[0] || null;
  }, [selectedUserId, liveDirectoryMembers, recipientsList]);

  const assignedAssetsForSelectedUser = useMemo(() => {
    if (!selectedUser) return [];
    return selectedUser.assignedAssets;
  }, [selectedUser]);

  // Auto-sync selectedAssetId when selected user changes
  useEffect(() => {
    if (consentModuleType === 'asset' && assignedAssetsForSelectedUser.length > 0) {
      if (assignedAssetsForSelectedUser.length > 1) {
        setSelectedAssetId('ALL');
      } else {
        setSelectedAssetId(assignedAssetsForSelectedUser[0].id);
      }
    } else {
      setSelectedAssetId('');
    }
  }, [consentModuleType, assignedAssetsForSelectedUser]);

  const openTriggerModalForMember = (member: typeof liveDirectoryMembers[0], type: 'byod' | 'asset' = 'asset') => {
    setConsentModuleType(type);
    setSelectedUserId(member.id);
    setIsTriggerModalOpen(true);
  };

  const handleSendTriggerConsentRequest = async () => {
    if (isSending) return;
    setIsSending(true);

    try {
      const token = localStorage.getItem('asset_track_token');

      if (consentModuleType === 'asset') {
        if (!selectedUser) return;
        await fetch(`/api/assets/user/${selectedUser.id}/request-consent`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.error(err));

        setPendingConsentUserIds(prev => ({ ...prev, [selectedUser.id]: true }));

        const targetAssetObj = assignedAssetsForSelectedUser.find(a => a.id === selectedAssetId);
        const assetDisplay = targetAssetObj ? targetAssetObj.name : (selectedAssetId === 'ALL' ? 'all assigned assets' : 'assigned hardware');

        addToast({
          title: 'Consent Request Sent',
          message: `Asset custody sign-off request successfully sent to ${selectedUser.name} for ${assetDisplay}!`,
          type: 'success'
        });
      } else {
        // BYOD Policy mode: target all employees or selected employee (no asset attached)
        triggerByodConsent(selectedUserId);
        if (selectedUserId === 'ALL') {
          liveDirectoryMembers.forEach(m => {
            setPendingConsentUserIds(prev => ({ ...prev, [m.id]: true }));
          });
          addToast({
            title: 'BYOD Policy Consent Requests Sent',
            message: `BYOD Policy consent requests successfully dispatched to all ${liveDirectoryMembers.length || 1} staff members!`,
            type: 'success'
          });
        } else if (selectedUser) {
          setPendingConsentUserIds(prev => ({ ...prev, [selectedUser.id]: true }));
          addToast({
            title: 'BYOD Policy Consent Request Sent',
            message: `BYOD Policy consent request successfully sent to ${selectedUser.name}!`,
            type: 'success'
          });
        }
      }

      setIsTriggerModalOpen(false);
    } catch (err) {
      console.error('Failed to send consent request', err);
      addToast({
        title: 'Error',
        message: 'Failed to send consent request. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDirectAssetConsentRequest = async (member: typeof liveDirectoryMembers[0]) => {
    if (directLoadingUserId) return;
    setDirectLoadingUserId(member.id);

    try {
      const token = localStorage.getItem('asset_track_token');
      await fetch(`/api/assets/user/${member.id}/request-consent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error(err));

      setPendingConsentUserIds(prev => ({ ...prev, [member.id]: true }));

      addToast({
        title: 'Consent Request Dispatched',
        message: `Asset custody consent request successfully sent to ${member.name}!`,
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to request consent', err);
      addToast({
        title: 'Error',
        message: 'Failed to send asset consent request. Please try again.',
        type: 'error'
      });
    } finally {
      setDirectLoadingUserId(null);
    }
  };

  // Direct table BYOD Request trigger: Dispatches BYOD request immediately with success message
  const handleDirectByodConsentRequest = (member: { id: string; name: string }) => {
    triggerByodConsent(member.id);
    addToast({
      title: 'BYOD Request Sent',
      message: `BYOD Policy consent request successfully sent to ${member.name}!`,
      type: 'success'
    });
  };

  // Filter by search term & status filter
  const filteredDirectory = useMemo(() => {
    return liveDirectoryMembers.filter(m => {
      const query = searchTerm.toLowerCase();
      const matchesSearch = 
        m.name.toLowerCase().includes(query) ||
        m.department.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        (m.assetName && m.assetName.toLowerCase().includes(query));

      const matchesStatus = 
        statusFilter === 'all' || 
        m.assetStatus === statusFilter || 
        m.byodStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [liveDirectoryMembers, searchTerm, statusFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredDirectory.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDirectory.slice(start, start + itemsPerPage);
  }, [filteredDirectory, currentPage]);

  // Active KPI Calculations strictly based on live assets & team
  const assignedAssets = useMemo(() => assets.filter(a => !!a.assignedTo), [assets]);
  const totalAssignedAssetCount = assignedAssets.length;
  const signedAssetCount = useMemo(() => assignedAssets.filter(a => !!a.hrConsentSubmitted).length, [assignedAssets]);
  const pendingAssetCount = useMemo(() => assignedAssets.filter(a => !a.hrConsentSubmitted || a.status === 'PENDING').length, [assignedAssets]);

  const effectiveTotalAssetCount = totalAssignedAssetCount > 0 ? totalAssignedAssetCount : liveDirectoryMembers.length;
  const effectiveSignedAssetCount = totalAssignedAssetCount > 0 
    ? signedAssetCount 
    : liveDirectoryMembers.filter(m => m.assetStatus === 'signed').length;
  const effectivePendingAssetCount = totalAssignedAssetCount > 0
    ? pendingAssetCount
    : liveDirectoryMembers.filter(m => m.assetStatus === 'pending' || m.assetStatus === 'unrequested').length;

  const compliancePercentage = effectiveTotalAssetCount > 0 
    ? Math.round((effectiveSignedAssetCount / effectiveTotalAssetCount) * 100) 
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10 shrink-0">
            <span className="material-symbols-outlined text-3xl font-bold">verified_user</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Consent Management</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Official employee sign-offs for BYOD Policy & Company Asset Custody.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">security</span>
            Request Consent
          </button>
        </div>
      </div>

      {/* Metric KPI Cards (4 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Overall Compliance */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Overall Compliance</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 dark:border-indigo-500/30">
              <span className="material-symbols-outlined text-lg">verified</span>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl my-1"></div>
            ) : (
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{compliancePercentage}%</p>
            )}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, loading ? 0 : compliancePercentage))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 2: BYOD Consents */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">BYOD Consents</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 dark:border-indigo-500/30">
              <span className="material-symbols-outlined text-lg">smartphone</span>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl my-1"></div>
            ) : (
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {liveDirectoryMembers.filter(m => m.byodStatus === 'signed').length} <span className="text-slate-400 dark:text-slate-500 text-2xl font-bold">/ {liveDirectoryMembers.length}</span>
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-1">Personal devices registered</p>
          </div>
        </div>

        {/* Metric 3: Asset Consents */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Asset Consents</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 dark:border-blue-500/30">
              <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl my-1"></div>
            ) : (
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {effectiveSignedAssetCount} <span className="text-slate-400 dark:text-slate-500 text-2xl font-bold">/ {effectiveTotalAssetCount}</span>
              </p>
            )}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-1">Hardware custody signed</p>
          </div>
        </div>

        {/* Metric 4: Pending Action */}
        <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm flex flex-col justify-between space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">Pending Action</span>
            <div className="w-8 h-8 rounded-xl bg-amber-600/10 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 dark:border-amber-500/30">
              <span className="material-symbols-outlined text-lg">pending_actions</span>
            </div>
          </div>
          <div>
            {loading ? (
              <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl my-1"></div>
            ) : (
              <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{effectivePendingAssetCount}</p>
            )}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mt-1">Outstanding sign-offs</p>
          </div>
        </div>
      </div>

      {/* Organization Consent Directory Section */}
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Organization Consent Directory</h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Monitor signed BYOD and Asset Custody agreements for all employees.
            </p>
          </div>
          <button
            onClick={() => setIsTriggerModalOpen(true)}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Consent
          </button>
        </div>

        {/* Search & Filter Control Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search staff, dept, or asset..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#162032] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-hide">
            {(['all', 'signed', 'pending', 'unrequested'] as const).map(st => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  statusFilter === st 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-[#162032] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table Rows or Loading Skeleton */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
                <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Loading Consent Directory...</h3>
                <p className="text-xs text-slate-400 mt-1">Fetching employee consent records and assigned assets.</p>
              </div>
              <div className="space-y-3 max-w-2xl mx-auto pt-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-[#162032]/60 border border-slate-800/60 rounded-2xl animate-pulse flex items-center p-4 justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800"></div>
                      <div className="space-y-1.5 text-left">
                        <div className="h-3 w-32 bg-slate-800 rounded"></div>
                        <div className="h-2 w-20 bg-slate-800/70 rounded"></div>
                      </div>
                    </div>
                    <div className="h-6 w-24 bg-slate-800 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : paginatedMembers.length > 0 ? (
            paginatedMembers.map((member) => (
              <div
                key={member.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-5 rounded-2xl bg-slate-50/80 dark:bg-[#162032]/80 border border-slate-200/80 dark:border-slate-800/70 hover:border-indigo-500/30 transition-all group"
              >
                {/* Column 1: Staff Details */}
                <div className="md:col-span-4 flex items-center gap-4">
                  <img
                    src={member.avatar}
                    alt={member.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-500 transition-all shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">{member.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                      {member.department} • <span className="text-indigo-600 dark:text-indigo-400">{member.roleLabel}</span>
                    </p>
                  </div>
                </div>

                {/* Column 2: BYOD Policy Consent Status */}
                <div className="md:col-span-4 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">BYOD Policy Consent</p>
                  {member.byodStatus === 'signed' ? (
                    <button
                      onClick={() => navigate(`/consent/byod/${member.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/60 transition-all cursor-pointer"
                      title="Click to view signed BYOD document"
                    >
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Signed ({member.byodDevCount || 1} Categories)
                    </button>
                  ) : member.byodStatus === 'pending' ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-950/60 border border-amber-500/40 text-amber-400">
                        <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                        Pending
                      </span>
                      <button
                        onClick={() => handleDirectByodConsentRequest(member)}
                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest underline underline-offset-4"
                      >
                        Resend
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDirectByodConsentRequest(member)}
                      className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1 transition-colors group/btn"
                    >
                      <span className="material-symbols-outlined text-sm group-hover/btn:scale-125 transition-transform">send</span>
                      Request BYOD Sign-off
                    </button>
                  )}
                </div>

                {/* Column 3: Asset Custody Consent Status */}
                <div className="md:col-span-4 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Asset Custody Consent</p>
                  {member.assetStatus === 'signed' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 truncate max-w-full">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Signed ({member.assetName || 'Asset'})
                    </span>
                  ) : member.assetStatus === 'pending' ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-950/60 border border-amber-500/40 text-amber-400">
                        <span className="material-symbols-outlined text-[13px]">hourglass_top</span>
                        Pending
                      </span>
                      <button
                        onClick={() => handleDirectAssetConsentRequest(member)}
                        disabled={directLoadingUserId === member.id}
                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest underline underline-offset-4 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {directLoadingUserId === member.id ? (
                          <>
                            <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                            Sending...
                          </>
                        ) : (
                          'Resend'
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => openTriggerModalForMember(member, 'asset')}
                      className="text-xs font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider flex items-center gap-1 transition-colors group/btn"
                    >
                      <span className="material-symbols-outlined text-sm group-hover/btn:scale-125 transition-transform">add</span>
                      Request Asset Sign-off
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center bg-[#162032]/40 border border-slate-800 rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-slate-600">search_off</span>
              <p className="text-sm font-bold text-slate-400 mt-2">No matching staff members found.</p>
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCurrentPage(1); }}
                className="mt-3 text-xs font-black text-indigo-400 hover:underline uppercase tracking-wider"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <p className="text-xs font-semibold text-slate-400">
              Showing Page <span className="text-white font-bold">{currentPage}</span> of <span className="text-white font-bold">{totalPages}</span> ({filteredDirectory.length} total staff)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-[#162032] border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl bg-[#162032] border border-slate-800 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TRIGGER CONSENT REQUEST MODAL */}
      {isTriggerModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0F172A] border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 pb-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <span className="material-symbols-outlined text-xl">security</span>
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Trigger Consent Request</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Dispatch official agreement sign-off requests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTriggerModalOpen(false)}
                className="w-9 h-9 rounded-full bg-[#162032] border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto scrollbar-hide">
              {/* 1. Module Selector: BYOD vs Asset Custody */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  CONSENT MODULE TYPE
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsentModuleType('byod')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                      consentModuleType === 'byod'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-[#162032] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="material-symbols-outlined text-2xl text-indigo-400">devices</span>
                      {consentModuleType === 'byod' && <span className="material-symbols-outlined text-sm text-indigo-400 font-bold">check_circle</span>}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">BYOD Policy</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">Personal Device Registration</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsentModuleType('asset')}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                      consentModuleType === 'asset'
                        ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-[#162032] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="material-symbols-outlined text-2xl text-indigo-400">assignment_turned_in</span>
                      {consentModuleType === 'asset' && <span className="material-symbols-outlined text-sm text-indigo-400 font-bold">check_circle</span>}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Asset Custody</p>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5">Company Hardware Assigned</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Target Recipient Dropdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    TARGET RECIPIENT
                  </label>
                  {consentModuleType === 'asset' && (
                    <span className="text-[9px] font-bold text-slate-500">
                      Showing staff with assigned assets only
                    </span>
                  )}
                </div>

                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-4 py-3.5 bg-[#162032] border border-slate-800 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  {consentModuleType === 'byod' && (
                    <option value="ALL">⚡ Entire Team (All Employees)</option>
                  )}
                  {recipientsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — ({m.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Target Asset Dropdown (Only for Asset Custody mode) */}
              {consentModuleType === 'asset' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    TARGET ASSET
                  </label>
                  <select
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-[#162032] border border-slate-800 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    {assignedAssetsForSelectedUser.length > 1 && (
                      <option value="ALL">📦 All Assigned Assets ({assignedAssetsForSelectedUser.length} items)</option>
                    )}
                    {assignedAssetsForSelectedUser.map((ast) => (
                      <option key={ast.id} value={ast.id}>
                        {ast.name} ({ast.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 md:p-8 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsTriggerModalOpen(false)}
                className="px-6 py-3 rounded-2xl bg-[#162032] border border-slate-800 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSendTriggerConsentRequest}
                disabled={isSending}
                className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">sync</span>
                    SENDING...
                  </>
                ) : (
                  'SEND REQUEST'
                )}
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

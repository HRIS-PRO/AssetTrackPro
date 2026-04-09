
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserRole, AuditCycle, VerificationStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Label } from 'recharts';
import { useAssetTracker } from '../AssetTrackerContext';
import { AuditLog } from './AuditLog';

export const Audits: React.FC = () => {
  const { user, assets, allEmployees, team } = useAssetTracker();
  const [auditCycles, setAuditCycles] = useState<AuditCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<AuditCycle | null>(null);
  const [activeTab, setActiveTab] = useState<'cycles' | 'stream'>('cycles');
  
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAuditToExport, setSelectedAuditToExport] = useState<AuditCycle | null>(null);
  const [verificationResults, setVerificationResults] = useState<VerificationStatus[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditView, setAuditView] = useState<'mine'|'all'>('mine');

  const [newAudit, setNewAudit] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  });
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingAudit, setIsCreatingAudit] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const isAuditor = user?.role === UserRole.AUDITOR;
  const isAdminUser = user?.role === UserRole.ADMIN_USER;
  const isStandardUser = user?.role === UserRole.USER;

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch(`/api/audits?t=${new Date().getTime()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          setAuditCycles(data);
          
          const allVerifications: VerificationStatus[] = [];
          data.forEach((cycle: any) => {
            if (cycle.verifications) {
              allVerifications.push(...cycle.verifications);
            }
          });
          setVerificationResults(allVerifications);
        }
      } catch (err) {
        console.error("Failed to fetch audits", err);
      }
    };
    fetchAudits();
  }, []);

  const canStartAudit = isSuperAdmin || isAuditor;
  const hasActiveAudit = auditCycles.some(c => c.status === 'In Progress');
  const canFinishAudit = isSuperAdmin || isAuditor;
  const canExportAudit = isSuperAdmin || isAuditor;
  const canViewCompletedAudits = isSuperAdmin || isAuditor || isAdminUser;
  const canSeeAnalytics = isSuperAdmin || isAuditor;

  const filteredCycles = useMemo(() => {
    if (canViewCompletedAudits) return auditCycles;
    return auditCycles.filter(c => c.status !== 'Completed');
  }, [auditCycles, canViewCompletedAudits]);

  const verificationAssets = useMemo(() => {
    let base = assets;
    if (auditView === 'mine' && user) {
      base = assets.filter(a => a.assignedTo === user.id || a.assignedTo === user.userId);
    }
    if (searchTerm) {
      base = base.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return base;
  }, [assets, auditView, user, searchTerm]);

  const selectedAsset = useMemo(() => {
    const id = selectedAssetId || (verificationAssets.length > 0 ? verificationAssets[0].id : null);
    return assets.find(a => a.id === id);
  }, [selectedAssetId, verificationAssets, assets]);

  const currentResult = useMemo(() => {
    if (!activeCycle || !selectedAsset) return null;
    return verificationResults.find(r => r.assetId === selectedAsset.id && r.cycleId === activeCycle.id);
  }, [verificationResults, selectedAsset, activeCycle]);

  const handleVerifyAction = async (result: VerificationStatus['result']) => {
    if (!activeCycle || !selectedAsset || !result || isVerifying) return;
    setIsVerifying(true);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/audits/${activeCycle.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ assetId: selectedAsset.id, result, notes: currentNotes })
      });
      
      if (!res.ok) throw new Error("Verification failed.");
      
      const newResult = await res.json();

      setVerificationResults(prev => {
        const filtered = prev.filter(r => !(r.assetId === selectedAsset.id && r.cycleId === activeCycle.id));
        return [...filtered, newResult];
      });

      const cycleIdx = auditCycles.findIndex(c => c.id === activeCycle.id);
      if (cycleIdx > -1) {
        const updatedCycles = [...auditCycles];
        const cycleResultsCount = verificationResults.filter(r => r.cycleId === activeCycle.id && r.assetId !== selectedAsset.id).length + 1;
        updatedCycles[cycleIdx].completion = Math.round((cycleResultsCount / (verificationAssets.length || 1)) * 100);
        setAuditCycles(updatedCycles);
      }

      const currentIndex = verificationAssets.findIndex(a => a.id === selectedAsset.id);
      if (currentIndex < verificationAssets.length - 1) {
        setSelectedAssetId(verificationAssets[currentIndex + 1].id);
        setCurrentNotes('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingAudit) return;
    setIsCreatingAudit(true);
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newAudit)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create audit cycle");
      }
      const cycle: AuditCycle = await res.json();
      setAuditCycles(prev => [cycle, ...prev]);
      setIsCreateModalOpen(false);
      setNewAudit({ name: '', startDate: new Date().toISOString().split('T')[0], endDate: '' });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error creating audit');
    } finally {
      setIsCreatingAudit(false);
    }
  };

  const auditPerformanceData = useMemo(() => {
    const targetCycle = activeCycle || auditCycles.find(c => c.status === 'In Progress') || auditCycles[0];
    const cycleResults = verificationResults.filter(r => r.cycleId === targetCycle?.id);
    const verified = cycleResults.filter(r => r.result === 'Verified').length;
    const missing = cycleResults.filter(r => r.result === 'Missing').length;
    const damaged = cycleResults.filter(r => r.result === 'Damaged').length;
    const unclear = cycleResults.filter(r => r.result === 'Unclear').length;
    const pending = Math.max(0, (targetCycle ? assets.length : 0) - cycleResults.length);

    return [
      { name: 'Verified', value: verified || 0, color: '#22c55e' },
      { name: 'Missing', value: missing || 0, color: '#ef4444' },
      { name: 'Damaged', value: damaged || 0, color: '#f59e0b' },
      { name: 'Unclear', value: unclear || 0, color: '#64748b' },
      { name: 'Pending', value: pending || 0, color: '#3b82f6' },
    ];
  }, [verificationResults, activeCycle, assets.length, auditCycles]);

  const handleExport = (cycle: AuditCycle) => {
    setSelectedAuditToExport(cycle);
    setIsExportModalOpen(true);
  };

  const performExport = () => {
    const headers = ['Asset ID', 'Name', 'Category', 'Condition', 'Status', 'Audit Result', 'Timestamp', 'Notes'];
    const rows = assets.map(a => {
      const result = verificationResults.find(r => r.assetId === a.id && r.cycleId === selectedAuditToExport?.id);
      return [a.id, a.name, a.category, a.condition, a.status, result?.result || 'Pending', result?.timestamp || '-', result?.notes || '-'];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_report_${selectedAuditToExport?.displayId || selectedAuditToExport?.id}.csv`);
    document.body.appendChild(link);
    link.click();
    setIsExportModalOpen(false);
  };

  if (activeCycle) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] animate-fade-in pb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <button onClick={() => { setActiveCycle(null); setSelectedAssetId(null); }} className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center hover:shadow-lg transition-all dark:text-white border border-slate-100 dark:border-slate-700 shadow-sm">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h2 className="text-2xl font-black tracking-tight dark:text-white">{activeCycle.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-48 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${activeCycle.completion}%` }}></div>
                </div>
                <span className="text-xs font-black text-slate-400 dark:text-slate-500">{activeCycle.completion}% Complete</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
             <button className="px-8 py-3 rounded-full font-black tracking-tight border-2 border-slate-200 dark:border-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Save Progress</button>
             {canFinishAudit && (
               <button className="px-8 py-3 rounded-full font-black tracking-tight bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all">Finish Audit</button>
             )}
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
          <div className="lg:w-1/3 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
              <button className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-blue-600 text-white font-black tracking-tight hover:bg-blue-500 transition-all border border-blue-600/10 shadow-lg shadow-blue-500/20">
                <span className="material-symbols-outlined">qr_code_scanner</span>
                Scan Barcode
              </button>
              <div className="flex items-center justify-between mb-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Assets</p>
                 {!isStandardUser && (
                   <button 
                     onClick={() => setAuditView(v => v === 'mine' ? 'all' : 'mine')}
                     className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full transition-all"
                   >
                     {auditView === 'mine' ? 'Show All Company Assets' : 'Show Only My Assets'}
                   </button>
                 )}
              </div>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Search item..." 
                  className="w-full px-6 py-3 rounded-full bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold dark:text-white focus:ring-2 focus:ring-blue-600 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {verificationAssets.map((asset) => {
                const isSelected = selectedAsset?.id === asset.id;
                const result = verificationResults.find(r => r.assetId === asset.id && r.cycleId === activeCycle.id);
                return (
                  <div 
                    key={asset.id} 
                    onClick={() => { setSelectedAssetId(asset.id); setCurrentNotes(result?.notes || ''); }}
                    className={`p-4 rounded-3xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-blue-600'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm truncate">{asset.name}</p>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'opacity-70' : 'opacity-40'}`}>{asset.id}</span>
                      </div>
                      {result && (
                        <span className={`material-symbols-outlined text-sm ${isSelected ? 'text-white' : result.result === 'Verified' ? 'text-green-500' : result.result === 'Missing' ? 'text-red-500' : 'text-amber-500'}`}>
                          {result.result === 'Verified' ? 'check_circle' : result.result === 'Missing' ? 'cancel' : result.result === 'Damaged' ? 'report_problem' : 'help'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col shadow-sm">
            {selectedAsset ? (
              <>
                <div className="mb-12">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Verification Entry</h3>
                   <div className="flex items-start gap-8">
                      <div className="w-32 h-32 rounded-[2rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 shrink-0">
                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                      </div>
                      <div>
                        <p className="text-4xl font-black tracking-tighter dark:text-white leading-tight">{selectedAsset.name}</p>
                        <p className="text-sm font-bold text-slate-500">{selectedAsset.id} • {selectedAsset.category}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mt-2">Location: {selectedAsset.location}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  {[
                    { label: 'Verified', icon: 'check_circle', result: 'Verified' as const, color: 'green' },
                    { label: 'Missing', icon: 'cancel', result: 'Missing' as const, color: 'red' },
                    { label: 'Damaged', icon: 'report_problem', result: 'Damaged' as const, color: 'amber' },
                    { label: 'Unclear', icon: 'help', result: 'Unclear' as const, color: 'slate' }
                  ].map(btn => (
                    <button 
                      key={btn.label} 
                      disabled={isVerifying}
                      onClick={() => handleVerifyAction(btn.result)}
                      className={`flex flex-col items-center gap-3 p-8 rounded-[2rem] border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                        currentResult?.result === btn.result 
                        ? `border-${btn.color}-600 bg-${btn.color}-50 dark:bg-${btn.color}-900/10 text-${btn.color}-600 dark:text-${btn.color}-400` 
                        : 'border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-600 bg-transparent'
                      }`}
                    >
                      {isVerifying && currentResult?.result === btn.result ? (
                        <span className="material-symbols-outlined animation-spin text-3xl">sync</span>
                      ) : (
                        <span className="material-symbols-outlined text-3xl">{btn.icon}</span>
                      )}
                      
                      <span className="font-black text-[10px] uppercase tracking-widest">
                        {isVerifying && currentResult?.result === btn.result ? 'Processing...' : btn.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Notes & Observations</label>
                  <textarea 
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    placeholder="Enter condition notes..." 
                    className="w-full h-full min-h-[100px] p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800 border-none resize-none font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white shadow-inner"
                  ></textarea>
                </div>
                
                <div className="mt-8 flex justify-between items-center">
                   <p className="text-xs font-bold text-slate-400">
                     {currentResult ? `Last action: ${currentResult.result} at ${currentResult.timestamp}` : 'Awaiting verification'}
                   </p>
                   <button 
                    onClick={() => {
                      const idx = verificationAssets.findIndex(a => a.id === selectedAsset.id);
                      if (idx < verificationAssets.length - 1) {
                        setSelectedAssetId(verificationAssets[idx + 1].id);
                        setCurrentNotes('');
                      }
                    }}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-10 py-4 rounded-full font-black tracking-tight flex items-center gap-2 shadow-lg"
                   >
                     Skip / Next
                     <span className="material-symbols-outlined">arrow_forward</span>
                   </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-6">inventory_2</span>
                <h3 className="text-2xl font-black dark:text-white">Selection Required</h3>
                <p className="text-slate-400 font-bold max-w-xs">Select an asset from the list to begin verification.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
       <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter dark:text-white">Audit Hub</h2>
            <p className="text-slate-400 font-bold">Manage system-wide asset verification cycles.</p>
          </div>
          <div className="flex gap-4">
             {canStartAudit && !hasActiveAudit && (
               <button 
                 onClick={() => setIsCreateModalOpen(true)}
                 className="bg-blue-600 text-white px-8 py-4 rounded-full font-black tracking-tight shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
               >
                 Start New Audit
               </button>
             )}
          </div>
       </div>

       {/* Tab Switcher */}
       <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-px">
         <button 
           onClick={() => setActiveTab('cycles')}
           className={`px-8 py-4 font-black uppercase text-xs tracking-widest transition-all relative ${activeTab === 'cycles' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
         >
           Audit Cycles
           {activeTab === 'cycles' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
         </button>
         <button 
           onClick={() => setActiveTab('stream')}
           className={`px-8 py-4 font-black uppercase text-xs tracking-widest transition-all relative ${activeTab === 'stream' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
         >
           Activity Stream
           {activeTab === 'stream' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
         </button>
       </div>

       {activeTab === 'cycles' ? (
         <>
           {canSeeAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-xl font-black tracking-tight dark:text-white">Inventory Integrity</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Cycle Distribution</p>
                      </div>
                      <div className="flex gap-2">
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Trend</span>
                         </div>
                      </div>
                   </div>

                   <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={auditPerformanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e120" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} 
                        />
                        <Tooltip 
                          cursor={{fill: '#f1f5f9', opacity: 0.1}}
                          contentStyle={{
                            borderRadius: '24px', 
                            border: 'none', 
                            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                            backgroundColor: '#0f172a',
                            padding: '16px'
                          }}
                          itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={45}>
                          {auditPerformanceData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              fillOpacity={0.8}
                              className="hover:fill-opacity-100 transition-all duration-300"
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                   </div>
                 </div>

                 <div className="bg-slate-900 dark:bg-blue-950 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden text-white flex flex-col items-center group">
                   <div className="absolute inset-0 bg-blue-600/5 rotate-12 -translate-y-1/2 -translate-x-1/2 blur-3xl group-hover:bg-blue-600/10 transition-all"></div>
                   
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 relative z-10">Verification Yield</h3>
                   
                   <div className="w-56 h-56 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={auditPerformanceData} 
                          innerRadius={65} 
                          outerRadius={85} 
                          paddingAngle={8} 
                          dataKey="value" 
                          stroke="none"
                          startAngle={180}
                          endAngle={-180}
                        >
                          {auditPerformanceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                          <Label 
                            width={30} 
                            position="center"
                            content={({ viewBox: { cx, cy } }: any) => {
                              const total = auditPerformanceData.reduce((acc, curr) => acc + curr.value, 0);
                              const verified = auditPerformanceData.find(d => d.name === 'Verified')?.value || 0;
                              const percentage = total > 0 ? Math.round((verified / total) * 100) : 0;
                              return (
                                <g>
                                  <text x={cx} y={cy - 5} textAnchor="middle" dominantBaseline="middle" className="fill-white text-4xl font-black italic tracking-tighter">
                                    {percentage}%
                                  </text>
                                  <text x={cx} y={cy + 25} textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px] font-black uppercase tracking-widest">
                                    Accuracy
                                  </text>
                                </g>
                              );
                            }}
                          />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                   </div>
                   
                   <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 relative z-10">
                      {auditPerformanceData.slice(0, 4).map(item => (
                        <div key={item.name} className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.name}</span>
                        </div>
                      ))}
                   </div>
                   
                   <span className="material-symbols-outlined text-[15rem] absolute -right-20 -bottom-20 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">shutter_speed</span>
                 </div>
              </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredCycles.length > 0 ? (
                filteredCycles.map(cycle => (
                  <div key={cycle.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 hover:shadow-xl transition-all relative overflow-hidden shadow-sm group">
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cycle.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'}`}>
                          {cycle.status}
                        </span>
                        <h3 className="text-2xl font-black tracking-tight mt-4 dark:text-white leading-tight">{cycle.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{cycle.displayId || cycle.id}</p>
                      </div>
                      {canExportAudit && (
                        <button onClick={() => handleExport(cycle)} className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <span className="material-symbols-outlined">download</span>
                        </button>
                      )}
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-8">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${cycle.completion}%` }}></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cycle.startDate} — {cycle.endDate}</span>
                      <button onClick={() => setActiveCycle(cycle)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-md group-hover:scale-105">
                        {cycle.status === 'Completed' ? 'View Final Report' : 'Resume Audit'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                 <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                    <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 mb-4">event_busy</span>
                    <p className="text-slate-400 font-bold max-w-sm mx-auto">No active audit cycles. A Super Admin or Auditor must start one before verification can begin.</p>
                    {canStartAudit && !hasActiveAudit && (
                      <button onClick={() => setIsCreateModalOpen(true)} className="mt-6 text-blue-600 font-black uppercase text-xs tracking-[0.2em] hover:underline transition-all underline-offset-8">Create First Cycle Now</button>
                    )}
                 </div>
              )}
           </div>
         </>
       ) : (
         <div className="h-[calc(100vh-25rem)]">
            <AuditLog title="System-wide Audit Trail" showViewHistory={false} />
         </div>
       )}

       {isCreateModalOpen && createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={() => setIsCreateModalOpen(false)}></div>
             <div className="relative bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row h-[85vh]">
               {/* Side Manifest Info */}
               <div className="md:w-72 bg-slate-900 p-12 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] translate-x-10 -translate-y-10"></div>
                  <div className="space-y-10 relative z-10">
                     <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40">
                        <span className="material-symbols-outlined text-3xl">fact_check</span>
                     </div>
                     <div className="space-y-4">
                        <h2 className="text-3xl font-black tracking-tight leading-tight italic">Initiate Audit Manifest</h2>
                        <p className="text-xs font-bold text-slate-400 leading-relaxed">Establish a new verification cycle to maintain inventory integrity across all departments.</p>
                     </div>
                     <div className="pt-8 border-t border-white/10 space-y-6">
                        <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined text-blue-500 text-sm">check_circle</span>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">System Synchronized</span>
                        </div>
                        <div className="flex items-center gap-4">
                           <span className="material-symbols-outlined text-blue-500 text-sm">lock</span>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Immutable logs</span>
                        </div>
                     </div>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">AssetTrackPro / v2.1</div>
               </div>

               {/* Configuration Form */}
               <form onSubmit={handleCreateAudit} className="flex-1 flex flex-col min-w-0">
                 <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-950">
                   <div>
                      <h3 className="text-2xl font-black tracking-tighter dark:text-white leading-none">Configuration</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{assets.length} Assets in scope</p>
                   </div>
                   <button type="button" onClick={() => setIsCreateModalOpen(false)} className="w-14 h-14 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-300">
                     <span className="material-symbols-outlined text-3xl">close</span>
                   </button>
                 </div>

                 <div className="p-12 space-y-10 overflow-y-auto bg-slate-50/30 dark:bg-slate-950 flex-1">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                     <div className="col-span-full space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-4">Audit Objective & Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. Q4 2024 Headquarters High-Value Audit" 
                          className="w-full px-8 py-5 rounded-[2.5rem] bg-white dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:text-white font-black italic text-lg outline-none transition-all shadow-xl shadow-slate-300/10 dark:shadow-none"
                          value={newAudit.name}
                          onChange={e => setNewAudit(prev => ({ ...prev, name: e.target.value }))}
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-4">Deployment Start</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">calendar_month</span>
                          <input 
                            required
                            type="date" 
                            className="w-full pl-16 pr-8 py-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:text-white font-bold text-sm outline-none transition-all shadow-sm"
                            value={newAudit.startDate}
                            onChange={e => setNewAudit(prev => ({ ...prev, startDate: e.target.value }))}
                          />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-4">Target Completion</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">event_upcoming</span>
                          <input 
                            required
                            type="date" 
                            className="w-full pl-16 pr-8 py-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 dark:text-white font-bold text-sm outline-none transition-all shadow-sm"
                            value={newAudit.endDate}
                            onChange={e => setNewAudit(prev => ({ ...prev, endDate: e.target.value }))}
                          />
                        </div>
                     </div>

                     <div className="col-span-full space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-4">Assigned Personnel (Auditors)</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                           {allEmployees.filter(e => e.role === 'AUDITOR' || e.role === 'SUPER_ADMIN').slice(0, 5).map(aud => (
                             <button type="button" key={aud.id} className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-900 border-2 border-blue-600 rounded-2xl shadow-sm transition-all">
                                <img src={aud.avatar} className="w-6 h-6 rounded-lg" alt="" />
                                <span className="text-[10px] font-black dark:text-white uppercase tracking-tight">{aud.firstName || aud.name}</span>
                                <span className="material-symbols-outlined text-blue-600 text-sm">person_check</span>
                             </button>
                           ))}
                           <button type="button" className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">
                              <span className="material-symbols-outlined text-sm">add</span>
                           </button>
                        </div>
                     </div>
                   </div>
                 </div>

                 <div className="p-10 bg-white dark:bg-slate-950 flex gap-4 border-t border-slate-100 dark:border-slate-800">
                   <button disabled={isCreatingAudit} type="button" onClick={() => setIsCreateModalOpen(false)} className="px-10 py-5 rounded-3xl font-black uppercase text-xs tracking-widest border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50">Cancel</button>
                   <button disabled={isCreatingAudit} type="submit" className="flex-1 py-5 rounded-3xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 group">
                     {isCreatingAudit ? (
                        <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                     ) : (
                        <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">bolt</span>
                     )}
                     {isCreatingAudit ? 'Deploying Manifest...' : 'Deploy Manifest'}
                   </button>
                 </div>
               </form>
             </div>
          </div>,
          document.body
        )}

       {isExportModalOpen && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)}></div>
             <div className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in border border-white/10">
               <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <h2 className="text-3xl font-black tracking-tight dark:text-white">Export Results</h2>
                 <button onClick={() => setIsExportModalOpen(false)} className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
                   <span className="material-symbols-outlined">close</span>
                 </button>
               </div>
               <div className="p-10 space-y-6">
                 <p className="text-sm font-bold text-slate-500">Select columns to include for <span className="text-slate-900 dark:text-white">{selectedAuditToExport?.name}</span></p>
                 <div className="grid grid-cols-2 gap-4">
                   {['Asset ID', 'Asset Name', 'Category', 'Condition', 'Result Status', 'Timestamp', 'Notes', 'Location'].map(col => (
                     <label key={col} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                       <input type="checkbox" defaultChecked className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-0" />
                       <span className="text-sm font-bold dark:text-white group-hover:text-blue-600 transition-colors">{col}</span>
                     </label>
                   ))}
                 </div>
               </div>
               <div className="p-10 bg-slate-50 dark:bg-slate-800/50 flex gap-4">
                 <button onClick={() => setIsExportModalOpen(false)} className="flex-1 py-4 rounded-full font-black tracking-tight border-2 border-slate-200 dark:border-slate-700 dark:text-white hover:bg-slate-100 transition-colors">Cancel</button>
                 <button onClick={performExport} className="flex-1 py-4 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black tracking-tight shadow-xl hover:scale-105 active:scale-95 transition-all">Download CSV</button>
               </div>
             </div>
          </div>,
          document.body
        )}
    </div>
  );
};

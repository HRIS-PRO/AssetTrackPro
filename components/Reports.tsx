
import React, { useState, useMemo, useEffect } from 'react';
import { User, Asset, AssetStatus, UserRole } from '../types';

interface ReportsProps {
  user: User;
  assets: Asset[];
  categories: { id: string, name: string }[];
  departments: { id: string, name: string }[];
}

type ReportType = 'inventory' | 'compliance';

export const Reports: React.FC<ReportsProps> = ({ user, assets, categories, departments }) => {
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [isExporting, setIsExporting] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['id', 'name', 'department', 'purchasePrice', 'status']);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');

  const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.AUDITOR;

  const [auditData, setAuditData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/audits', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setAuditData(data);
        }
      } catch (err) {
        console.error("Failed to fetch audits", err);
      }
    };
    fetchAudits();
  }, []);

  const complianceScore = useMemo(() => {
    if (auditData.length === 0 || assets.length === 0) return '0%';
    
    // Use the most recently created audit that has verifications
    const sortedAudits = [...auditData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latestAudit = sortedAudits.find(a => a.verifications && a.verifications.length > 0);
    
    if (!latestAudit) return '0%';

    const verifiedCount = latestAudit.verifications.filter((v: any) => v.result === 'Verified').length;
    // Calculate against total assets at the time, or current assets
    const score = Math.round((verifiedCount / assets.length) * 100);
    return `${score}%`;
  }, [auditData, assets]);

  const kpis = useMemo(() => {
    const totalVal = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const decommissioned = assets.filter(a => a.status === AssetStatus.DECOMMISSIONED || a.status === AssetStatus.LOST).length;
    return [
      { label: 'TOTAL INVENTORY VALUE', value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(totalVal), icon: 'payments', color: 'blue' },
      { label: 'COMPLIANCE SCORE', value: complianceScore, icon: 'verified_user', color: 'green' },
      { label: 'TOTAL ASSETS', value: assets.length, icon: 'inventory', color: 'purple' },
      { label: 'DECOMMISSIONED', value: decommissioned, icon: 'delete_forever', color: 'red' },
    ];
  }, [assets]);

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Asset Name' },
    { key: 'department', label: 'Department' },
    { key: 'category', label: 'Category' },
    { key: 'purchasePrice', label: 'Price' },
    { key: 'status', label: 'Status' },
    { key: 'purchaseDate', label: 'Purchased' },
  ];

  const filteredData = useMemo(() => {
    return assets.filter(a =>
      (selectedDept === 'All' || a.department === selectedDept) &&
      (selectedCat === 'All' || a.category === selectedCat)
    );
  }, [assets, selectedDept, selectedCat]);

  const getStatusBadge = (status: AssetStatus) => {
    let colors = 'bg-slate-100 text-slate-700';
    if (status === AssetStatus.ACTIVE) colors = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === AssetStatus.PENDING) colors = 'bg-amber-100 text-amber-700';
    if (status === AssetStatus.MAINTENANCE) colors = 'bg-blue-100 text-blue-700';
    if (status === AssetStatus.LOST || status === AssetStatus.DECOMMISSIONED) colors = 'bg-red-100 text-red-700';
    return <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colors}`}>{status}</span>;
  };

  if (!isAdmin) return <div className="p-20 text-center font-black text-2xl opacity-20">UNAUTHORIZED ACCESS</div>;

  return (
    <div className="space-y-10 pb-20 animate-fade-in">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 shadow-[0_8px_0px_0px_rgba(241,245,249,1)] dark:shadow-[0_8px_0px_0px_rgba(15,23,42,1)] group transition-all hover:-translate-y-1">
            <p className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">{kpi.label}</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black tracking-tighter dark:text-white leading-none">{kpi.value}</span>
              <span className={`material-symbols-outlined text-3xl text-${kpi.color}-500 group-hover:scale-125 transition-transform`}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'inventory', label: 'Inventory Report', icon: 'inventory_2' },
          { key: 'compliance', label: 'Compliance Audit', icon: 'verified_user' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setReportType(tab.key as ReportType)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${reportType === tab.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 border-[3px] border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300'
              }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ---- Premium Sidebar ---- */}
        <div className="lg:col-span-3 space-y-5 sticky top-32">

          {/* Column Visibility Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-[3px] border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">view_column</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Column Visibility</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              {columns.map(col => {
                const active = visibleColumns.includes(col.key);
                return (
                  <button
                    key={col.key}
                    onClick={() => setVisibleColumns(prev => active ? prev.filter(k => k !== col.key) : [...prev, col.key])}
                    className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    {col.label}
                    {active && <span className="material-symbols-outlined text-[13px] opacity-80">check</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Filters Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border-[3px] border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">filter_alt</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick Filters</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[17px] pointer-events-none">corporate_fare</span>
                <select
                  className="w-full pl-10 pr-9 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 font-bold text-xs dark:text-white outline-none cursor-pointer appearance-none transition-all"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[17px] pointer-events-none">expand_more</span>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[17px] pointer-events-none">category</span>
                <select
                  className="w-full pl-10 pr-9 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 font-bold text-xs dark:text-white outline-none cursor-pointer appearance-none transition-all"
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[17px] pointer-events-none">expand_more</span>
              </div>

              {(selectedDept !== 'All' || selectedCat !== 'All') && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedDept !== 'All' && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                      {selectedDept}
                      <button onClick={() => setSelectedDept('All')} className="hover:opacity-70">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  )}
                  {selectedCat !== 'All' && (
                    <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-black">
                      {selectedCat}
                      <button onClick={() => setSelectedCat('All')} className="hover:opacity-70">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Download Button */}
          <button
            onClick={() => { 
              setIsExporting(true); 
              
              try {
                // 1. Define Headers
                const headers = [
                  'ID', 'Asset Name', 'Category', 'Department', 'Status', 
                  'Purchase Date', 'Purchase Price (₦)', 'Condition', 'Location', 
                  'Manager', 'Description', 'Model Number', 'Serial Number'
                ];
                
                // 2. Map data
                const csvRows = [headers.join(',')];
                
                filteredData.forEach(asset => {
                  const values = [
                    asset.id,
                    `"${(asset.name || '').replace(/"/g, '""')}"`,
                    `"${(asset.category || '').replace(/"/g, '""')}"`,
                    `"${(asset.department || '').replace(/"/g, '""')}"`,
                    asset.status,
                    asset.purchaseDate,
                    asset.purchasePrice, // Formatted as raw number, header says Naira
                    `"${(asset.condition || '').replace(/"/g, '""')}"`,
                    `"${(asset.location || '').replace(/"/g, '""')}"`,
                    `"${(asset.manager || '').replace(/"/g, '""')}"`,
                    `"${(asset.description || '').replace(/"/g, '""')}"`,
                    `"${(asset.modelNumber || '').replace(/"/g, '""')}"`,
                    `"${(asset.serialNumber || '').replace(/"/g, '""')}"`
                  ];
                  csvRows.push(values.join(','));
                });
                
                // 3. Create Blob and Download URL
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                
                // 4. Trigger Download
                const link = document.createElement('a');
                link.setAttribute('href', url);
                
                const dateSuffix = new Date().toISOString().split('T')[0];
                const filename = reportType === 'inventory' 
                    ? `inventory-report-${dateSuffix}.csv` 
                    : `compliance-audit-${dateSuffix}.csv`;
                    
                link.setAttribute('download', filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } catch (error) {
                console.error("Export failed", error);
                alert("Failed to export report.");
              } finally {
                setIsExporting(false); 
              }
            }}
            disabled={isExporting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            <span className={`material-symbols-outlined text-sm ${isExporting ? 'animate-spin' : ''}`}>{isExporting ? 'sync' : 'file_download'}</span>
            {isExporting ? 'Generating...' : 'Download Report'}
          </button>
        </div>

        {/* ---- Data Table ---- */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col min-h-[600px] shadow-sm">
          <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[18px]">table_chart</span>
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight dark:text-white leading-none">Live Data Preview</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">{reportType === 'inventory' ? 'Inventory Report' : 'Compliance Audit'}</p>
              </div>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-50/60 dark:from-slate-800/80 dark:to-slate-800/40">
                  {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                    <th key={col.key} className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/80">
                {filteredData.map((asset, i) => (
                  <tr
                    key={asset.id}
                    className={`group transition-all duration-150 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${i % 2 !== 0 ? 'bg-slate-50/30 dark:bg-slate-800/20' : ''}`}
                  >
                    {visibleColumns.includes('id') && (
                      <td className="px-8 py-5">
                        <span className="font-mono text-xs font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{asset.id}</span>
                      </td>
                    )}
                    {visibleColumns.includes('name') && <td className="px-8 py-5 font-bold dark:text-white text-sm">{asset.name}</td>}
                    {visibleColumns.includes('department') && <td className="px-8 py-5 text-sm font-bold text-slate-500 dark:text-slate-400">{asset.department || '—'}</td>}
                    {visibleColumns.includes('category') && (
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">{asset.category}</span>
                      </td>
                    )}
                    {visibleColumns.includes('purchasePrice') && <td className="px-8 py-5 font-black text-sm dark:text-white">₦{asset.purchasePrice.toLocaleString()}</td>}
                    {visibleColumns.includes('status') && <td className="px-8 py-5">{getStatusBadge(asset.status)}</td>}
                    {visibleColumns.includes('purchaseDate') && <td className="px-8 py-5 text-xs font-bold text-slate-400">{asset.purchaseDate}</td>}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-28 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300">filter_list_off</span>
                </div>
                <div>
                  <p className="font-black text-slate-400">No matching records</p>
                  <p className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-1">Try adjusting or clearing your filters</p>
                </div>
                {(selectedDept !== 'All' || selectedCat !== 'All') && (
                  <button
                    onClick={() => { setSelectedDept('All'); setSelectedCat('All'); }}
                    className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

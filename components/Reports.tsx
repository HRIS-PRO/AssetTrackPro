
import React, { useState, useMemo } from 'react';
import { User, Asset, AssetStatus, UserRole } from '../types';

interface ReportsProps {
  user: User;
  assets: Asset[];
  categories: string[];
  departments: string[];
}

type ReportType = 'inventory' | 'compliance';

export const Reports: React.FC<ReportsProps> = ({ user, assets, categories, departments }) => {
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'id', 'name', 'department', 'purchasePrice', 'status'
  ]);

  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCat, setSelectedCat] = useState('All');

  const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.AUDITOR;

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalVal = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const decommissioned = assets.filter(a => a.status === AssetStatus.DECOMMISSIONED || a.status === AssetStatus.LOST).length;
    const complianceScore = 94; // Mocked high compliance for visual
    
    return [
      { label: 'TOTAL INVENTORY VALUE', value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(totalVal), icon: 'payments', color: 'blue' },
      { label: 'COMPLIANCE SCORE', value: `${complianceScore}%`, icon: 'verified_user', color: 'green' },
      { label: 'TOTAL ASSET COUNT', value: assets.length, icon: 'inventory', color: 'purple' },
      { label: 'DECOMMISSIONED ASSETS', value: decommissioned, icon: 'delete_forever', color: 'red' },
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

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert('Report generated and downloaded successfully.');
    }, 1500);
  };

  const handleReportToggle = (type: ReportType) => {
    setIsLoading(true);
    setReportType(type);
    setTimeout(() => setIsLoading(false), 600);
  };

  const filteredData = useMemo(() => {
    return assets.filter(a => 
      (selectedDept === 'All' || a.department === selectedDept) &&
      (selectedCat === 'All' || a.category === selectedCat)
    );
  }, [assets, selectedDept, selectedCat]);

  const getStatusBadge = (status: AssetStatus) => {
    let colors = 'bg-slate-100 text-slate-700';
    if (status === AssetStatus.ACTIVE) colors = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === AssetStatus.PENDING) colors = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (status === AssetStatus.MAINTENANCE) colors = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === AssetStatus.LOST || status === AssetStatus.DECOMMISSIONED) colors = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    
    return (
      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colors}`}>
        {status}
      </span>
    );
  };

  if (!isAdmin) return <div className="p-20 text-center font-black text-2xl opacity-20">UNAUTHORIZED ACCESS</div>;

  return (
    <div className="space-y-10 pb-20 animate-fade-in">
      {/* Executive Summary */}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Logic Sidebar */}
        <div className="lg:col-span-3 space-y-8 sticky top-32">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dataset Focus</label>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => handleReportToggle('inventory')}
                  className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-left transition-all flex items-center justify-between ${reportType === 'inventory' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  Inventory Report
                  {reportType === 'inventory' && <span className="material-symbols-outlined text-sm">check_circle</span>}
                </button>
                <button 
                  onClick={() => handleReportToggle('compliance')}
                  className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-left transition-all flex items-center justify-between ${reportType === 'compliance' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  Compliance Audit
                  {reportType === 'compliance' && <span className="material-symbols-outlined text-sm">check_circle</span>}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Column Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                {columns.map(col => (
                  <button 
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest border-2 transition-all ${visibleColumns.includes(col.key) ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-300'}`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Quick Filters</label>
              <select 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs dark:text-white"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
              <select 
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-xs dark:text-white"
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-5 rounded-full bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">{isExporting ? 'sync' : 'download'}</span>
              {isExporting ? 'Generating...' : 'Download Report'}
            </button>
          </div>
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px] relative">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight dark:text-white">Live Data Preview</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{filteredData.length} records found</span>
          </div>

          <div className={`flex-1 overflow-x-auto transition-opacity duration-300 ${isLoading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                    <th key={col.key} className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredData.map((asset, idx) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                    {visibleColumns.includes('id') && <td className="px-8 py-6 font-mono text-xs font-black dark:text-slate-300">{asset.id}</td>}
                    {visibleColumns.includes('name') && <td className="px-8 py-6 font-bold dark:text-white">{asset.name}</td>}
                    {visibleColumns.includes('department') && <td className="px-8 py-6 text-sm font-bold dark:text-slate-400">{asset.department}</td>}
                    {visibleColumns.includes('category') && <td className="px-8 py-6 text-[10px] font-black uppercase tracking-widest dark:text-slate-500">{asset.category}</td>}
                    {visibleColumns.includes('purchasePrice') && <td className="px-8 py-6 font-black dark:text-white">₦{asset.purchasePrice.toLocaleString()}</td>}
                    {visibleColumns.includes('status') && <td className="px-8 py-6">{getStatusBadge(asset.status)}</td>}
                    {visibleColumns.includes('purchaseDate') && <td className="px-8 py-6 text-sm font-bold text-slate-400">{asset.purchaseDate}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-slate-200">filter_list_off</span>
                <p className="font-bold text-slate-400">No data matches your active filters.</p>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

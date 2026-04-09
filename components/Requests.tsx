
import React, { useState, useMemo } from 'react';
import { UserRole, EquipmentRequest, AssetReport, ReportStatus, RequestStatus, RequestPriority } from '../types';
import { RequestDetailsModal } from './RequestDetailsModal';
import { useAssetTracker } from '../AssetTrackerContext';

interface RequestsProps {
  onRequestAsset: () => void;
}

type ActiveTab = 'Provisioning' | 'AssetReports';
type SubToggle = 'All' | 'Mine';

export const Requests: React.FC<RequestsProps> = ({ onRequestAsset }) => {
  const { 
    user, 
    requests, 
    managedRequests, 
    faultyReports, 
    managedReports 
  } = useAssetTracker();

  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER;
  const [activeTab, setActiveTab] = useState<ActiveTab>('Provisioning');
  const [subToggle, setSubToggle] = useState<SubToggle>(isAdmin ? 'All' : 'Mine');

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<AssetReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [isUpdatingRequest, setIsUpdatingRequest] = useState<string | null>(null);

  const selectedRequest = useMemo(() => {
    const all = [...requests, ...managedRequests];
    return all.find(r => r.id === selectedRequestId) || null;
  }, [selectedRequestId, requests, managedRequests]);

  const filteredRequests = useMemo(() => {
    return subToggle === 'Mine' ? requests : managedRequests;
  }, [subToggle, requests, managedRequests]);

  const allFilteredReports = useMemo(() => {
    return subToggle === 'Mine' ? faultyReports : managedReports;
  }, [subToggle, faultyReports, managedReports]);

  const [reportStatusFilter, setReportStatusFilter] = useState<'ALL' | ReportStatus>('ALL');

  const filteredFaultyReports = useMemo(() => {
    const base = allFilteredReports;
    if (reportStatusFilter === 'ALL') return base;
    return base.filter(r => r.status === reportStatusFilter);
  }, [allFilteredReports, reportStatusFilter]);

  const handleUpdateRequestStatus = async (requestId: string, status: RequestStatus | 'REJECTED') => {
    setIsUpdatingRequest(requestId);
    try {
      const token = localStorage.getItem('asset_track_token');
      await fetch(`/api/equipment-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error('Failed to update request status', err);
    } finally {
      setIsUpdatingRequest(null);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: ReportStatus) => {
    if (!isAdmin) return;
    setIsUpdatingStatus(reportId);
    try {
      const token = localStorage.getItem('asset_track_token');
      await fetch(`/api/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const getReportStatusStyle = (status: ReportStatus) => {
    if (status === ReportStatus.RESOLVED) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
    if (status === ReportStatus.IN_REVIEW) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  };

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'Provisioning', label: 'Provisioning', icon: 'add_shopping_cart' },
    { key: 'AssetReports', label: 'Asset Reports', icon: 'report_problem' },
  ];

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tighter dark:text-white">Requests</h2>
          <p className="text-slate-400 dark:text-slate-500 font-bold">Track equipment requests and asset issue reports.</p>
        </div>
        <button
          onClick={onRequestAsset}
          className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-black tracking-tight shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 hover:bg-blue-500"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Request
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full w-fit shadow-sm flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.key
                ? tab.key === 'AssetReports'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              {tab.label}
              {tab.key === 'AssetReports' && faultyReports.filter(r => r.status === ReportStatus.PENDING).length > 0 && activeTab !== 'AssetReports' && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black ml-1">
                  {faultyReports.filter(r => r.status === ReportStatus.PENDING).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
          <button
            onClick={() => setSubToggle('All')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subToggle === 'All' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >
            Managed Items
          </button>
          <button
            onClick={() => setSubToggle('Mine')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subToggle === 'Mine' ? 'bg-white dark:bg-slate-950 text-blue-600 shadow-sm' : 'text-slate-400'}`}
          >
            My Requests
          </button>
        </div>
      </div>

      {activeTab === 'Provisioning' && (
        <div className="grid grid-cols-1 gap-6">
          {filteredRequests.length > 0 ? filteredRequests.map(req => (
            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col md:flex-row gap-8 items-center group shadow-sm hover:shadow-xl transition-all">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 dark:text-slate-600 shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 group-hover:text-blue-600 transition-colors">
                <span className="material-symbols-outlined text-3xl">
                  {req.categoryName?.toLowerCase().includes('laptop') ? 'laptop_mac' :
                    req.categoryName?.toLowerCase().includes('monitor') ? 'monitor' :
                      req.categoryName?.toLowerCase().includes('mobile') ? 'smartphone' : 'inventory_2'}
                </span>
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${req.priority === RequestPriority.HIGH || req.priority === RequestPriority.CRITICAL ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                    {req.priority} Priority
                  </span>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest font-mono">#{req.id.slice(0, 8)} • {new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="text-xl font-black tracking-tight dark:text-white truncate">{req.categoryName} Request</h3>
                <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">{subToggle === 'All' ? `BY: ${req.userName}` : 'MY REQUEST'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{req.justification}</p>
              </div>

              <div className="w-full md:w-auto flex items-center gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                {[1, 2, 3, 4].map(step => {
                  const statusMap: Record<string, number> = {
                    'PENDING_HOD': 1,
                    'PENDING_HOO': 2,
                    'PENDING_CATEGORY_ADMIN': 3,
                    'APPROVED': 4,
                    'REJECTED': 0
                  };
                  const currentStep = statusMap[req.status] || 0;
                  const isCompleted = req.status === 'APPROVED' ? step <= 4 : step < currentStep;
                  const isActive = step === currentStep;
                  const isRejected = req.status === 'REJECTED';

                  return (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${isRejected ? 'bg-red-100 text-red-400 border border-red-200' :
                        isCompleted ? 'bg-green-500 text-white' :
                          isActive ? 'bg-blue-600 text-white shadow-lg' :
                            'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                        }`}>
                        {isCompleted ? <span className="material-symbols-outlined text-sm">check</span> : step}
                      </div>
                      {step < 4 && <div className={`w-6 h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                    </div>
                  );
                })}
                <div className="ml-4 min-w-[120px]">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status Flow</p>
                  <p className={`text-sm font-bold ${req.status === 'APPROVED' ? 'text-green-500' : req.status === 'REJECTED' ? 'text-red-500' : 'dark:text-white'}`}>{req.status.replace(/_/g, ' ')}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRequestId(req.id)}
                className="w-full md:w-auto px-8 py-4 rounded-full font-black tracking-tight border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all dark:text-white"
              >
                Details
              </button>
            </div>
          )) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
              <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 mb-4 block">search_off</span>
              <p className="font-bold text-slate-400">No {subToggle === 'Mine' ? 'personal' : 'managed'} requests found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'AssetReports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black tracking-tight dark:text-white">
                {subToggle === 'All' ? 'Managed Category Reports' : 'My Submitted Reports'}
              </h3>
              <p className="text-sm font-bold text-slate-400">
                {subToggle === 'All'
                  ? 'Reports for assets in categories you manage'
                  : 'Track the status of issues you have reported'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', ReportStatus.PENDING, ReportStatus.IN_REVIEW, ReportStatus.RESOLVED] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setReportStatusFilter(s)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reportStatusFilter === s
                    ? s === ReportStatus.RESOLVED ? 'bg-green-600 text-white'
                      : s === ReportStatus.IN_REVIEW ? 'bg-blue-600 text-white'
                        : s === ReportStatus.PENDING ? 'bg-amber-500 text-white'
                          : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                  {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredFaultyReports.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">inbox</span>
              </div>
              <p className="font-black text-slate-400 text-sm uppercase tracking-widest">No reports found</p>
              <p className="text-slate-400 text-xs font-bold">
                {reportStatusFilter !== 'ALL'
                  ? `No ${reportStatusFilter.replace('_', ' ').toLowerCase()} reports`
                  : subToggle === 'All'
                    ? 'No reports submitted for your asset categories yet'
                    : 'You have not submitted any asset reports yet'}
              </p>
            </div>
          )}

          {filteredFaultyReports.length > 0 && (
            <div className="grid gap-4">
              {filteredFaultyReports.map(report => (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 rounded-[2rem] border-[3px] border-slate-100 dark:border-slate-800 p-6 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${report.status === ReportStatus.RESOLVED ? 'bg-green-500' :
                      report.status === ReportStatus.IN_REVIEW ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-black dark:text-white text-lg leading-tight uppercase tracking-tight">{report.assetName || report.assetId || 'Unknown Asset'}</p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                              SN: {report.assetSerialNumber || report.assetId || 'N/A'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                              {subToggle === 'All' && report.userName && (
                                <span className="flex items-center">
                                  <span className="material-symbols-outlined text-[12px] mr-1">person</span>
                                  {report.userName}
                                </span>
                              )}
                              {report.assetCategory && (
                                <span className={`flex items-center ${subToggle === 'All' && report.userName ? 'ml-3' : ''}`}>
                                  <span className="material-symbols-outlined text-[12px] mr-1">category</span>
                                  {report.assetCategory}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${getReportStatusStyle(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed line-clamp-2">{report.comment}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => { setSelectedReport(report); setIsDetailModalOpen(true); }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-black text-[10px] uppercase tracking-widest"
                        >
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          View Details
                        </button>

                        {isAdmin && report.status === ReportStatus.PENDING && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, ReportStatus.IN_REVIEW)}
                            disabled={isUpdatingStatus === report.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-60"
                          >
                            <span className={`material-symbols-outlined text-sm ${isUpdatingStatus === report.id ? 'animate-spin' : ''}`}>
                              {isUpdatingStatus === report.id ? 'refresh' : 'visibility'}
                            </span>
                            Mark In Review
                          </button>
                        )}

                        {isAdmin && report.status !== ReportStatus.RESOLVED && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, ReportStatus.RESOLVED)}
                            disabled={isUpdatingStatus === report.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-600 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest disabled:opacity-60"
                          >
                            <span className={`material-symbols-outlined text-sm ${isUpdatingStatus === report.id ? 'animate-spin' : ''}`}>
                              {isUpdatingStatus === report.id ? 'refresh' : 'check_circle'}
                            </span>
                            Mark Resolved
                          </button>
                        )}

                        {!isAdmin && report.status === ReportStatus.RESOLVED && (
                          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-black text-[10px] uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm">task_alt</span>
                            Issue Resolved
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border-[3px] border-slate-100 dark:border-slate-800">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <span className="material-symbols-outlined">report_problem</span>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight dark:text-white">Report Details</h2>
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mt-1 ${selectedReport.status === ReportStatus.RESOLVED ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                    selectedReport.status === ReportStatus.IN_REVIEW ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                    {selectedReport.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Asset Name</p>
                  <p className="font-black dark:text-white text-lg">{selectedReport.assetName || selectedReport.assetId || 'Unknown Asset'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Serial Number</p>
                  <p className="font-black text-blue-600 dark:text-blue-400">{selectedReport.assetSerialNumber || selectedReport.assetId || 'N/A'}</p>
                </div>
                {isAdmin && selectedReport.userName && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reported By</p>
                    <p className="font-black dark:text-white">{selectedReport.userName}</p>
                  </div>
                )}
                {selectedReport.assetCategory && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</p>
                    <p className="font-black dark:text-white">{selectedReport.assetCategory}</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Detailed Comment</p>
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-medium dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedReport.comment}</p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap gap-3">
                <button
                  onClick={() => { handleUpdateReportStatus(selectedReport.id, ReportStatus.IN_REVIEW); setIsDetailModalOpen(false); }}
                  disabled={selectedReport.status !== ReportStatus.PENDING || isUpdatingStatus === selectedReport.id}
                  className="flex-1 py-4 px-6 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Move to In Review
                </button>
                <button
                  onClick={() => { handleUpdateReportStatus(selectedReport.id, ReportStatus.RESOLVED); setIsDetailModalOpen(false); }}
                  disabled={selectedReport.status === ReportStatus.RESOLVED || isUpdatingStatus === selectedReport.id}
                  className="flex-1 py-4 px-6 rounded-2xl bg-green-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Mark as Resolved
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequestId(null)}
        onUpdateStatus={handleUpdateRequestStatus}
        currentUser={user}
        isUpdating={isUpdatingRequest === selectedRequestId}
      />
    </div>
  );
};

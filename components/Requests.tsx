
import React, { useState, useMemo } from 'react';
import { User, UserRole, EquipmentRequest } from '../types';
import { RequestDetailsModal } from './RequestDetailsModal';

interface RequestsProps {
  user: User;
  onRequestAsset: () => void;
}

export const Requests: React.FC<RequestsProps> = ({ user, onRequestAsset }) => {
  const isAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN_USER;
  const [activeTab, setActiveTab] = useState<'All' | 'Mine'>(isAdmin ? 'All' : 'Mine');
  
  // Convert mock requests to state to allow functional updates
  const [requests, setRequests] = useState<EquipmentRequest[]>([
    { id: 'REQ-001', userId: 'u4', category: 'Laptop', priority: 'High', justification: 'Need upgraded RAM for design tasks.', status: 'Pending Approval', timestamp: '2024-03-10 09:30' },
    { id: 'REQ-002', userId: 'u2', category: 'Monitor', priority: 'Standard', justification: 'Dual screen setup needed for coding.', status: 'Approved', timestamp: '2024-03-08 14:20' },
    { id: 'REQ-003', userId: 'u1', category: 'Mobile Device', priority: 'Critical', justification: 'Broken screen on production testing device.', status: 'Initiated', timestamp: '2024-03-11 11:45' },
  ]);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'Mine') {
      return requests.filter(req => req.userId === user.id);
    }
    return isAdmin ? requests : requests.filter(req => req.userId === user.id);
  }, [activeTab, user.id, isAdmin, requests]);

  const selectedRequest = useMemo(() => 
    requests.find(r => r.id === selectedRequestId) || null
  , [selectedRequestId, requests]);

  const handleUpdateStatus = (id: string, newStatus: EquipmentRequest['status']) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status: newStatus } : req));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
       <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tighter dark:text-white">Equipment Requests</h2>
            <p className="text-slate-400 dark:text-slate-500 font-bold">Request new assets or track approval status.</p>
          </div>
          <button 
            onClick={onRequestAsset}
            className="bg-blue-600 text-white px-8 py-4 rounded-full font-black tracking-tight shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            New Request
          </button>
       </div>

       <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-full w-fit shadow-sm">
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('All')} 
              className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'All' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Global Requests
            </button>
          )}
          <button 
            onClick={() => setActiveTab('Mine')} 
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'Mine' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
          >
            My Requests
          </button>
       </div>

       <div className="grid grid-cols-1 gap-6">
          {filteredRequests.length > 0 ? filteredRequests.map(req => (
            <div key={req.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 flex flex-col md:flex-row gap-8 items-center group shadow-sm hover:shadow-xl transition-all">
               <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 dark:text-slate-600 shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 group-hover:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined text-3xl">
                    {req.category.toLowerCase().includes('laptop') ? 'laptop_mac' : 
                     req.category.toLowerCase().includes('monitor') ? 'monitor' : 
                     req.category.toLowerCase().includes('mobile') ? 'smartphone' : 'inventory_2'}
                  </span>
               </div>
               
               <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      req.priority === 'High' || req.priority === 'Critical' ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {req.priority} Priority
                    </span>
                    <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest font-mono">{req.id} • {req.timestamp}</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight dark:text-white truncate">{req.category} {req.id.includes('REQ') ? 'Request' : 'Upgrade'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{req.justification}</p>
               </div>

               <div className="w-full md:w-auto flex items-center gap-4 py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl">
                  {[1, 2, 3].map(step => (
                    <div key={step} className="flex items-center">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                         (req.status === 'Approved' || req.status === 'Rejected') && step <= 3 ? 'bg-green-500 text-white' :
                         (req.status === 'Pending Approval' && step === 1) ? 'bg-green-500 text-white' :
                         (req.status === 'Pending Approval' && step === 2) ? 'bg-blue-600 text-white shadow-lg' :
                         (req.status === 'Initiated' && step === 1) ? 'bg-blue-600 text-white shadow-lg' :
                         'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                       }`}>
                         {((req.status === 'Approved' || req.status === 'Rejected') && step <= 2) || (req.status === 'Pending Approval' && step === 1) ? <span className="material-symbols-outlined text-sm">check</span> : step}
                       </div>
                       {step < 3 && <div className="w-10 h-0.5 bg-slate-200 dark:bg-slate-700"></div>}
                    </div>
                  ))}
                  <div className="ml-4 min-w-[100px]">
                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</p>
                     <p className={`text-sm font-bold ${req.status === 'Approved' ? 'text-green-500' : req.status === 'Rejected' ? 'text-red-500' : 'dark:text-white'}`}>{req.status}</p>
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
               <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800 mb-4">search_off</span>
               <p className="font-bold text-slate-400">No requests found.</p>
            </div>
          )}
       </div>

       {/* Detailed Request Modal Integration */}
       <RequestDetailsModal 
         request={selectedRequest}
         onClose={() => setSelectedRequestId(null)}
         onUpdateStatus={handleUpdateStatus}
         currentUser={user}
       />
    </div>
  );
};

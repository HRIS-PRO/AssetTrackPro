
import React from 'react';
import { User, UserRole, EquipmentRequest } from '../types';
import { MOCK_USERS } from '../constants';

interface RequestDetailsModalProps {
  request: EquipmentRequest | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: EquipmentRequest['status']) => void;
  currentUser: User;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({ 
  request, 
  onClose, 
  onUpdateStatus, 
  currentUser 
}) => {
  if (!request) return null;

  const requester = MOCK_USERS.find(u => u.id === request.userId);
  const isAdmin = currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN_USER;
  const canAct = isAdmin && (request.status === 'Pending Approval' || request.status === 'Initiated');

  const steps = [
    { label: 'Initiated', status: 'completed' },
    { label: 'Pending Approval', status: request.status === 'Initiated' ? 'active' : 'completed' },
    { label: 'Decision', status: (request.status === 'Approved' || request.status === 'Rejected') ? 'completed' : 'pending' }
  ];

  const getPriorityColor = (p: string) => {
    if (p === 'Critical') return 'text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_-5px_rgba(239,68,68,0.5)]';
    if (p === 'High') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
  };

  const getStatusColor = (s: string) => {
    if (s === 'Approved') return 'text-green-500';
    if (s === 'Rejected') return 'text-red-500';
    return 'text-blue-500';
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative bg-[#111827] w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-10 pb-0 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">fact_check</span>
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white leading-none mb-1">REQUEST REVIEW</h2>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{request.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
          {/* User & Meta Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">REQUESTER</label>
              <div className="flex items-center gap-3">
                <img src={requester?.avatar} className="w-10 h-10 rounded-full border border-slate-800" alt="" />
                <div>
                  <p className="font-bold text-white text-sm leading-none mb-1">{requester?.name}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{requester?.department}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PRIORITY</label>
              <div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${getPriorityColor(request.priority)}`}>
                  {request.priority} PRIORITY
                </span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">CATEGORY</label>
              <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center gap-4">
                <span className="material-symbols-outlined text-blue-500">
                  {request.category.toLowerCase().includes('laptop') ? 'laptop_mac' : 'inventory_2'}
                </span>
                <span className="font-bold text-white uppercase tracking-widest text-sm">{request.category}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">JUSTIFICATION</label>
              <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 text-slate-300 font-bold text-sm leading-relaxed italic">
                "{request.justification}"
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">APPROVAL LIFECYCLE</label>
            <div className="flex items-center gap-2 px-4">
              {steps.map((step, i) => (
                <React.Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-2 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 
                      step.status === 'active' ? 'bg-[#1985f0] border-[#1985f0] text-white shadow-[0_0_15px_rgba(25,133,240,0.5)]' :
                      'border-slate-800 text-slate-600'
                    }`}>
                      {step.status === 'completed' ? <span className="material-symbols-outlined text-sm">check</span> : (i + 1)}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest absolute -bottom-6 whitespace-nowrap ${step.status === 'pending' ? 'text-slate-600' : 'text-slate-400'}`}>
                      {step.label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-[2px] mx-2 ${step.status === 'completed' ? 'bg-green-500' : 'bg-slate-800'}`}></div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-10 pt-6 border-t border-slate-800 bg-[#0f172a]/50">
          {canAct ? (
            <div className="flex gap-4">
              <button 
                onClick={() => onUpdateStatus(request.id, 'Rejected')}
                className="flex-1 py-4 rounded-2xl border-2 border-red-500/20 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-[0_0_20px_-5px_rgba(239,68,68,0.1)]"
              >
                REJECT REQUEST
              </button>
              <button 
                onClick={() => onUpdateStatus(request.id, 'Approved')}
                className="flex-[2] py-4 rounded-2xl bg-[#1985f0] text-white font-black text-xs uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(25,133,240,0.5)] hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                APPROVE PROVISIONING
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">CURRENT STATUS</p>
                <p className={`text-lg font-black uppercase tracking-tighter ${getStatusColor(request.status)}`}>{request.status}</p>
              </div>
              <button 
                onClick={onClose}
                className="px-10 py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all"
              >
                DISMISS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

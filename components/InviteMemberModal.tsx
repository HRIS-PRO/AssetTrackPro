
import React, { useState } from 'react';
import { UserRole } from '../types';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; email: string; role: UserRole }) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.USER);

  if (!isOpen) return null;

  const roles = [
    { id: UserRole.SUPER_ADMIN, label: 'SUPER ADMIN' },
    { id: UserRole.ADMIN_USER, label: 'ADMIN USER' },
    { id: UserRole.AUDITOR, label: 'AUDITOR' },
    { id: UserRole.USER, label: 'USER' },
  ];

  const handleConfirm = () => {
    if (name && email) {
      onConfirm({ name, email, role: selectedRole });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative bg-[#111827] w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden animate-fade-in p-10 md:p-12">
        {/* Close Button Header Area */}
        <div className="flex justify-start mb-6">
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          <div className="ml-4 w-12 h-12 rounded-2xl bg-[#1985f0]/10 flex items-center justify-center text-[#1985f0]">
            <span className="material-symbols-outlined text-2xl font-bold">person_add</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-3 mb-10">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">INVITE MEMBER</h2>
          <p className="text-slate-400 font-bold text-lg">Provision access according to specialized operational roles.</p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">LEGAL NAME</label>
            <input
              type="text"
              placeholder="e.g. Jonathan Ive"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-8 py-5 rounded-2xl bg-[#0f172a] border border-slate-800 text-white font-bold placeholder-slate-600 focus:ring-2 focus:ring-[#1985f0]/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">CORPORATE EMAIL</label>
            <input
              type="email"
              placeholder="j.ive@acmecorp.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-8 py-5 rounded-2xl bg-[#0f172a] border border-slate-800 text-white font-bold placeholder-slate-600 focus:ring-2 focus:ring-[#1985f0]/50 outline-none transition-all"
            />
          </div>

          {/* Role Grid */}
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">WORKSPACE ASSIGNMENT</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 border-2 ${selectedRole === role.id
                      ? 'bg-[#1985f0] text-white border-[#1985f0] shadow-[0_0_25px_-5px_rgba(25,133,240,0.6)]'
                      : 'bg-[#0f172a] text-slate-500 border-slate-800 hover:border-slate-700'
                    }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={onClose}
            className="w-full sm:w-1/3 py-5 rounded-2xl border-2 border-slate-800 text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all"
          >
            DISCARD
          </button>
          <button
            onClick={handleConfirm}
            className="w-full sm:flex-1 py-5 rounded-2xl bg-[#1985f0] text-white font-black text-sm uppercase tracking-widest shadow-[0_0_25px_-5px_rgba(25,133,240,0.5)] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            <span className="material-symbols-outlined !text-[20px]">send</span>
            CONFIRM INVITATION
          </button>
        </div>
      </div>
    </div>
  );
};

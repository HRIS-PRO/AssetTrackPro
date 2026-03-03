
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { DEPARTMENTS } from '../constants';

interface EditMemberModalProps {
  member: User | null;
  onClose: () => void;
  onConfirm: (updatedMember: User) => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ member, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.USER);
  const [department, setDepartment] = useState('');

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email);
      setRole(member.role);
      setDepartment(member.department);
    }
  }, [member]);

  if (!member) return null;

  const roles = [
    { id: UserRole.SUPER_ADMIN, label: 'SUPER ADMIN' },
    { id: UserRole.ADMIN_USER, label: 'ADMIN USER' },
    { id: UserRole.AUDITOR, label: 'AUDITOR' },
    { id: UserRole.USER, label: 'USER' },
  ];

  const handleSave = () => {
    if (name && email) {
      onConfirm({
        ...member,
        name,
        email,
        role,
        department
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={onClose}></div>

      <div className="relative bg-[#111827] w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-800 overflow-hidden animate-fade-in p-10 md:p-12">
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">edit_square</span>
            </div>
            <div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">EDIT PROFILE</h2>
              <p className="text-slate-400 font-bold text-sm">Update operational access and organizational data.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">LEGAL NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-[#0f172a] border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600/50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">CORPORATE EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-6 py-4 rounded-2xl bg-[#0f172a] border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">DEPARTMENT</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-[#0f172a] border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-blue-600/50 appearance-none"
            >
              {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">ROLE ASSIGNMENT</label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${role === r.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-700'
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            DISCARD CHANGES
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 transition-all"
          >
            SAVE MODIFICATIONS
          </button>
        </div>
      </div>
    </div>
  );
};

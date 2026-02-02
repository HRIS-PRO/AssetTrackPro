
import React from 'react';
import { User } from '../types';

interface ProfileProps {
  user: User;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
  const cards = [
    { label: 'Employee ID', value: user.employeeId, icon: 'badge' },
    { label: 'Department', value: user.department, icon: 'corporate_fare' },
    { label: 'Manager', value: user.reportingManager || 'N/A', icon: 'person_outline' },
    { label: 'Location', value: user.location, icon: 'location_on' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-12 animate-fade-in pb-20">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="relative">
          <div className="w-48 h-48 rounded-full border-8 border-blue-600/10 dark:border-blue-500/5 p-2 transition-colors">
            <img src={user.avatar} className="w-full h-full rounded-full object-cover shadow-2xl border-4 border-white dark:border-slate-800" alt="" />
          </div>
          <button className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center hover:scale-110 transition-all shadow-blue-500/20">
            <span className="material-symbols-outlined">edit</span>
          </button>
        </div>
        
        <div>
           <h2 className="text-5xl font-black tracking-tighter dark:text-white mb-2">{user.name}</h2>
           <p className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">{user.role.replace('_', ' ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {cards.map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-sm transition-colors hover:shadow-lg">
             <span className="material-symbols-outlined text-slate-300 dark:text-slate-700">{card.icon}</span>
             <p className="text-sm font-black dark:text-white">{card.value}</p>
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="p-10 bg-slate-900 dark:bg-slate-800 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl transition-colors">
         <div className="space-y-1">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Linked to Enterprise Systems</p>
            <h3 className="text-2xl font-black tracking-tight">HRIS.Pro Enterprise Sync</h3>
            <p className="text-xs text-green-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Synchronized 2m ago
            </p>
         </div>
         <button className="px-10 py-4 rounded-full bg-white/10 hover:bg-white/20 transition-all font-black tracking-tight text-sm">
           Configure Integration
         </button>
      </div>
    </div>
  );
};

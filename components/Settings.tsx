
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { InviteMemberModal } from './InviteMemberModal';
import { EditMemberModal } from './EditMemberModal';

interface SettingsProps {
  user: User;
  team: User[];
  setTeam: React.Dispatch<React.SetStateAction<User[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  departments: string[];
  setDepartments: React.Dispatch<React.SetStateAction<string[]>>;
}

export const Settings: React.FC<SettingsProps> = ({ 
  user, 
  team, 
  setTeam, 
  categories, 
  setCategories, 
  departments, 
  setDepartments 
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [newCat, setNewCat] = useState('');
  const [newDept, setNewDept] = useState('');
  const [orgName, setOrgName] = useState('AssetTrackPro Enterprise');
  const [orgColor, setOrgColor] = useState('#2563eb');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Member Management State
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [revokingMember, setRevokingMember] = useState<User | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings_suggest' },
    { id: 'team', label: 'Team', icon: 'group' },
    { id: 'security', label: 'Security', icon: 'security' },
    { id: 'taxonomy', label: 'Taxonomy', icon: 'category' },
    { id: 'integrations', label: 'Integrations', icon: 'hub' },
    { id: 'billing', label: 'Billing', icon: 'credit_card' },
  ];

  const sessions = [
    { device: 'MacBook Pro 16-inch', location: 'Lagos, Nigeria', ip: '192.168.1.1', status: 'Active now', current: true },
    { device: 'iPhone 15 Pro', location: 'Lagos, Nigeria', ip: '192.168.1.42', status: '2 hours ago', current: false },
    { device: 'Chrome on Windows', location: 'London, UK', ip: '82.145.2.11', status: 'Yesterday', current: false },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = () => {
    if (newCat && !categories.includes(newCat)) {
      setCategories([...categories, newCat]);
      setNewCat('');
    }
  };

  const handleAddDepartment = () => {
    if (newDept && !departments.includes(newDept)) {
      setDepartments([...departments, newDept]);
      setNewDept('');
    }
  };

  const handleInviteConfirm = (data: { name: string; email: string; role: UserRole }) => {
    const newUser: User = {
      id: `u${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role,
      department: 'General',
      employeeId: `ATP-${Math.floor(Math.random() * 1000)}`,
      location: 'Unassigned',
      avatar: `https://picsum.photos/seed/${data.name.split(' ')[0]}/200`
    };
    setTeam(prev => [...prev, newUser]);
  };

  const updateMember = (updated: User) => {
    setTeam(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditingMember(null);
  };

  const revokeAccess = () => {
    if (revokingMember) {
      setTeam(prev => prev.filter(m => m.id !== revokingMember.id));
      setRevokingMember(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
       {/* Tab Navigation - Horizontal Scroll on Mobile */}
       <div className="flex overflow-x-auto scrollbar-hide gap-2 p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] w-full md:w-fit shadow-sm">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
       </div>

       <div className="transition-all duration-300">
         {activeTab === 'general' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in slide-in-from-bottom-2">
             {/* Organization Profile */}
             <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                   <span className="material-symbols-outlined font-black">corporate_fare</span>
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Organization Profile</h3>
               </div>
               <div className="space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Organization Name</label>
                   <input 
                    type="text" 
                    value={orgName} 
                    onChange={e => setOrgName(e.target.value)}
                    className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contact Email</label>
                   <input 
                    type="email" 
                    value="admin@assettrack.pro" 
                    readOnly
                    className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-inner" 
                   />
                 </div>
               </div>
             </div>

             {/* Corporate Identity */}
             <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                   <span className="material-symbols-outlined font-black">palette</span>
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Corporate Identity</h3>
               </div>
               <div className="space-y-8">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Brand Primary Color</label>
                   <div className="flex gap-4">
                     <input 
                      type="color" 
                      value={orgColor} 
                      onChange={e => setOrgColor(e.target.value)}
                      className="w-14 h-14 rounded-2xl cursor-pointer border-none bg-transparent" 
                     />
                     <input 
                      type="text" 
                      value={orgColor.toUpperCase()} 
                      onChange={e => setOrgColor(e.target.value)}
                      className="flex-1 px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner" 
                     />
                   </div>
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">System Logo</label>
                   <div className="p-10 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 bg-slate-50/50 dark:bg-slate-800/20 group cursor-pointer hover:border-blue-600 transition-all">
                     <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-blue-600 transition-colors">upload_file</span>
                     <p className="text-xs font-black uppercase tracking-widest text-slate-400">Drag & Drop Logo Here</p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {activeTab === 'taxonomy' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in slide-in-from-bottom-2">
             {/* Categories Management */}
             <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                   <span className="material-symbols-outlined font-black">category</span>
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Asset Categories</h3>
               </div>
               
               <div className="flex flex-wrap gap-3">
                 {categories.length > 0 ? categories.map(cat => (
                   <div key={cat} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 dark:shadow-none transition-all hover:scale-105">
                     {cat}
                     <button onClick={() => setCategories(categories.filter(c => c !== cat))} className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">close</button>
                   </div>
                 )) : <p className="text-sm italic text-slate-400">No entries defined</p>}
               </div>

               <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <input 
                  type="text" 
                  placeholder="New category name..." 
                  className="flex-1 px-8 py-4 rounded-full bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner"
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddCategory()}
                 />
                 <button 
                  onClick={handleAddCategory}
                  className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                 >
                   Add Entry
                 </button>
               </div>
             </div>

             {/* Departments Management */}
             <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                   <span className="material-symbols-outlined font-black">apartment</span>
                 </div>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Business Units / Depts</h3>
               </div>
               
               <div className="flex flex-wrap gap-3">
                 {departments.length > 0 ? departments.map(dept => (
                   <div key={dept} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-200 dark:shadow-none transition-all hover:scale-105">
                     {dept}
                     <button onClick={() => setDepartments(departments.filter(d => d !== dept))} className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">close</button>
                   </div>
                 )) : <p className="text-sm italic text-slate-400">No entries defined</p>}
               </div>

               <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                 <input 
                  type="text" 
                  placeholder="New department name..." 
                  className="flex-1 px-8 py-4 rounded-full bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner"
                  value={newDept}
                  onChange={e => setNewDept(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddDepartment()}
                 />
                 <button 
                  onClick={handleAddDepartment}
                  className="px-8 py-4 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                 >
                   Add Entry
                 </button>
               </div>
             </div>
           </div>
         )}

         {activeTab === 'security' && (
           <div className="space-y-8 animate-fade-in slide-in-from-bottom-2">
             {/* MFA Toggle */}
             <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
               <div className="flex items-center gap-6">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                   <span className="material-symbols-outlined text-3xl font-black">shield_lock</span>
                 </div>
                 <div>
                   <h3 className="text-xl font-black tracking-tight dark:text-white">Multi-Factor Authentication</h3>
                   <p className="text-sm font-bold text-slate-400">Enhance security with second-step cryptographic verification.</p>
                 </div>
               </div>
               <button 
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`w-20 h-10 rounded-full relative transition-all duration-300 ${mfaEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'}`}
               >
                 <div className={`absolute top-1 w-8 h-8 rounded-full bg-white shadow-lg transition-all duration-300 ${mfaEnabled ? 'left-11' : 'left-1'}`}></div>
               </button>
             </div>

             {/* Authorized Sessions */}
             <div className="bg-white dark:bg-slate-900 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
               <div className="p-10 border-b border-slate-50 dark:border-slate-800 flex items-center gap-4">
                 <span className="material-symbols-outlined text-slate-400">key_visualizer</span>
                 <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Authorized Sessions</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-slate-50 dark:bg-slate-800/50">
                       <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Device</th>
                       <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Location</th>
                       <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">IP Address</th>
                       <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                       <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {sessions.map((session, i) => (
                       <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-3">
                              <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-600 transition-colors">
                                {session.device.includes('iPhone') ? 'smartphone' : 'laptop'}
                              </span>
                              <p className="font-bold dark:text-white">{session.device}</p>
                            </div>
                         </td>
                         <td className="px-10 py-6 text-sm font-bold dark:text-slate-400">{session.location}</td>
                         <td className="px-10 py-6 font-mono text-xs font-black dark:text-slate-500">{session.ip}</td>
                         <td className="px-10 py-6">
                           <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${session.current ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                             {session.status}
                           </span>
                         </td>
                         <td className="px-10 py-6 text-right">
                           {!session.current && (
                             <button className="px-6 py-2 rounded-full border-2 border-red-100 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                               Revoke Access
                             </button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
         )}

         {activeTab === 'team' && (
           <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm transition-colors animate-fade-in slide-in-from-bottom-2">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tight dark:text-white">Team Management</h2>
                <button 
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-blue-600 text-white px-8 py-4 rounded-full font-black tracking-tight shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Invite Member
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Name & Role</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Department</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Last Login</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {team.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img src={member.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-700 group-hover:border-blue-500 transition-all" alt="" />
                            <div>
                              <p className="font-bold dark:text-white">{member.name}</p>
                              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{member.role.replace('_', ' ')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold dark:text-slate-300">{member.department}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">Active</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-sm font-bold text-slate-400 dark:text-slate-600">2h ago</span>
                        </td>
                        <td className="px-8 py-6 text-right relative">
                           <button 
                             onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === member.id ? null : member.id); }}
                             className="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 dark:text-slate-500"
                           >
                             <span className="material-symbols-outlined">more_vert</span>
                           </button>

                           {openMenuId === member.id && (
                             <div 
                               ref={menuRef}
                               className="absolute right-8 top-16 w-48 glass-panel rounded-2xl shadow-2xl overflow-hidden z-[100] animate-fade-in border border-slate-200 dark:border-slate-800 text-left"
                             >
                               <button 
                                 onClick={() => { setEditingMember(member); setOpenMenuId(null); }}
                                 className="w-full px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 text-xs font-bold dark:text-white transition-colors"
                               >
                                 <span className="material-symbols-outlined text-sm">edit</span>
                                 Edit Profile
                               </button>
                               <button 
                                 onClick={() => { setRevokingMember(member); setOpenMenuId(null); }}
                                 className="w-full px-5 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 text-xs font-bold text-red-600 transition-colors"
                               >
                                 <span className="material-symbols-outlined text-sm">lock_person</span>
                                 Revoke Access
                               </button>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
         )}

         {['integrations', 'billing'].includes(activeTab) && (
           <div className="p-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center shadow-sm transition-colors animate-fade-in slide-in-from-bottom-2">
              <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-700 mb-4">construction</span>
              <h3 className="text-2xl font-black tracking-tight dark:text-white">Module Under Construction</h3>
              <p className="text-slate-400 dark:text-slate-500 font-bold max-w-sm mx-auto mt-2">We're building this configuration panel to bring you more granular control over your assets.</p>
           </div>
         )}
       </div>

       {/* Invitation Modal */}
       <InviteMemberModal 
         isOpen={isInviteModalOpen}
         onClose={() => setIsInviteModalOpen(false)}
         onConfirm={handleInviteConfirm}
       />

       {/* Edit Member Modal */}
       <EditMemberModal 
         member={editingMember}
         onClose={() => setEditingMember(null)}
         onConfirm={updateMember}
       />

       {/* Revocation Warning Modal */}
       {revokingMember && (
         <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md" onClick={() => setRevokingMember(null)}></div>
           <div className="relative bg-[#111827] w-full max-w-lg rounded-[3rem] shadow-2xl border border-red-500/30 overflow-hidden animate-fade-in p-10 md:p-12 text-center">
             <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
               <span className="material-symbols-outlined text-4xl">security_update_warning</span>
             </div>
             <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4 leading-none">REVOKE ACCESS?</h2>
             <p className="text-slate-400 font-bold text-sm leading-relaxed mb-10">
               You are about to terminate all system credentials for <span className="text-white font-black">{revokingMember.name}</span>. This action is effective immediately and will log them out of all active sessions.
             </p>
             <div className="flex flex-col gap-3">
               <button 
                 onClick={revokeAccess}
                 className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-500 transition-all active:scale-95"
               >
                 CONFIRM REVOCATION
               </button>
               <button 
                 onClick={() => setRevokingMember(null)}
                 className="w-full py-4 rounded-2xl border-2 border-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
               >
                 CANCEL
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

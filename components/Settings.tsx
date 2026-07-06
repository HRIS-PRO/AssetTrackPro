
import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { InviteMemberModal } from './InviteMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { useAssetTracker } from '../AssetTrackerContext';
import { THEMES, applyTheme } from '../themes';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Settings: React.FC = () => {
  const {
    user,
    team, setTeam,
    categories, setCategories,
    departments, setDepartments,
    assetLocations, setAssetLocations,
    orgSettings, saveOrgSettings
  } = useAssetTracker();

  const [activeTab, setActiveTab] = useState('general');
  const [newCat, setNewCat] = useState('');
  const [selectedSA, setSelectedSA] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newLoc, setNewLoc] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditCategory, setIsEditCategory] = useState(false);
  const [isEditLocation, setIsEditLocation] = useState(false);

  // General tab form state (synced from saved org settings)
  const [formName, setFormName] = useState(orgSettings.orgName);
  const [formEmail, setFormEmail] = useState(orgSettings.contactEmail);
  const [formTheme, setFormTheme] = useState(orgSettings.theme);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const savedThemeRef = useRef(orgSettings.theme);

  const isOrgAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER;

  // Re-sync the form whenever fresh settings arrive from the server
  useEffect(() => {
    setFormName(orgSettings.orgName);
    setFormEmail(orgSettings.contactEmail);
    setFormTheme(orgSettings.theme);
    savedThemeRef.current = orgSettings.theme;
  }, [orgSettings]);

  // If a previewed theme was never saved, revert to the saved one on unmount
  useEffect(() => {
    return () => applyTheme(savedThemeRef.current);
  }, []);

  const isDirty =
    formName !== orgSettings.orgName ||
    formEmail !== orgSettings.contactEmail ||
    formTheme !== orgSettings.theme;

  const nameError = formName.trim().length < 2 ? 'Organization name must be at least 2 characters' : null;
  const emailError = !EMAIL_REGEX.test(formEmail.trim()) ? 'Enter a valid contact email' : null;
  const formValid = !nameError && !emailError;

  const handleThemePreview = (themeId: string) => {
    if (!isOrgAdmin) return;
    setFormTheme(themeId);
    applyTheme(themeId, false); // live preview without persisting
  };

  const handleDiscardGeneral = () => {
    setFormName(orgSettings.orgName);
    setFormEmail(orgSettings.contactEmail);
    setFormTheme(orgSettings.theme);
    setSaveError(null);
    applyTheme(orgSettings.theme);
  };

  const handleSaveGeneral = async () => {
    if (!formValid || isSavingGeneral) return;
    setIsSavingGeneral(true);
    setSaveError(null);
    try {
      await saveOrgSettings({
        orgName: formName.trim(),
        contactEmail: formEmail.trim(),
        theme: formTheme
      });
      savedThemeRef.current = formTheme;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save organization settings');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Member Management State
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [revokingMember, setRevokingMember] = useState<User | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const superAdmins = team.filter(m => m.role === UserRole.SUPER_ADMIN || m.role === UserRole.ADMIN_USER);

  const tabs = [
    { id: 'general', label: 'General', icon: 'settings_suggest' },
    { id: 'team', label: 'Team', icon: 'group' },
    { id: 'taxonomy', label: 'Taxonomy', icon: 'category' },
  ];

  const fetchAssetTrackerUsers = async () => {
    try {
      const token = localStorage.getItem('asset_track_token') || localStorage.getItem('hris_token');
      const res = await fetch(`/api/users/apps/asset-tracker`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const mappedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          role: u.role || 'Unassigned',
          department: u.department || 'General',
          location: u.location || 'HQ',
          employeeId: `EMP-${u.id.substring(0, 6)}`,
          avatar: `https://ui-avatars.com/api/?name=${u.firstName || 'User'}+${u.lastName || ''}&background=0D8ABC&color=fff&rounded=true`
        }));
        setTeam(mappedUsers);
      }
    } catch (err) {
      console.error('Failed to fetch AssetTracker users', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      fetchAssetTrackerUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCategory = async () => {
    setIsEditCategory(true);
    if (newCat && !categories.some(c => c.name === newCat)) {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/asset-categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newCat,
            managedById: selectedSA || undefined
          })
        });
        if (res.ok) {
          const added = await res.json();
          setCategories([...categories, added]);
          setNewCat('');
          setSelectedSA('');
        }
      } catch (err) {
        console.error("Failed to add category", err);
      } finally {
        setIsEditCategory(false);
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/asset-categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete category", err);
    }
  };

  const handleAddLocation = async () => {
    setIsEditLocation(true);
    if (newLoc && !assetLocations.some(l => l.name === newLoc)) {
      try {
        const token = localStorage.getItem('asset_track_token');
        const res = await fetch('/api/asset-locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: newLoc })
        });
        if (res.ok) {
          const added = await res.json();
          setAssetLocations([...assetLocations, added]);
          setNewLoc('');
        }
      } catch (err) {
        console.error("Failed to add location", err);
      } finally {
        setIsEditLocation(false);
      }
    }
  };

  const handleDeleteLocation = async (id: string) => {
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/asset-locations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAssetLocations(assetLocations.filter(l => l.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete location", err);
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

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
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
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      disabled={!isOrgAdmin}
                      className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {isOrgAdmin && nameError && formName !== orgSettings.orgName && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-2">{nameError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Contact Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      disabled={!isOrgAdmin}
                      className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {isOrgAdmin && emailError && formEmail !== orgSettings.contactEmail && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 ml-2">{emailError}</p>
                    )}
                  </div>
                  {!isOrgAdmin && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      Only administrators can modify these settings
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <span className="material-symbols-outlined font-black">palette</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Workspace Theme</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Applies to the entire app for everyone</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {THEMES.map(theme => {
                    const selected = formTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => handleThemePreview(theme.id)}
                        disabled={!isOrgAdmin}
                        title={theme.description}
                        className={`relative p-4 rounded-3xl border-[3px] transition-all text-left disabled:cursor-not-allowed ${selected
                          ? 'border-slate-900 dark:border-white shadow-xl scale-[1.03]'
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:scale-[1.02]'}`}
                      >
                        <div className="flex gap-1.5 mb-3">
                          <span className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: theme.palette['400'] }}></span>
                          <span className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: theme.palette['600'] }}></span>
                          <span className="w-6 h-6 rounded-full shadow-inner" style={{ backgroundColor: theme.palette['800'] }}></span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">{theme.name}</p>
                        {selected && (
                          <span className="absolute top-3 right-3 material-symbols-outlined text-sm font-black text-slate-900 dark:text-white">check_circle</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {isOrgAdmin && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border-[3px] border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                <div className="flex items-center gap-3 min-h-[1.5rem]">
                  {saveError && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {saveError}
                    </p>
                  )}
                  {saveSuccess && !saveError && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Settings saved — theme is now live for everyone
                    </p>
                  )}
                  {!saveError && !saveSuccess && isDirty && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      Unsaved changes
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleDiscardGeneral}
                    disabled={!isDirty || isSavingGeneral}
                    className="px-8 py-4 rounded-full border-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-40"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveGeneral}
                    disabled={!isDirty || !formValid || isSavingGeneral}
                    className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingGeneral
                      ? <span className="material-symbols-outlined text-sm font-black animate-spin">sync</span>
                      : <span className="material-symbols-outlined text-sm font-black">save</span>}
                    {isSavingGeneral ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'taxonomy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black">category</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Asset Categories</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                {categories.map(cat => (
                  <div key={cat.id} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105">
                    {cat.name}
                    <button onClick={() => handleDeleteCategory(cat.id)} className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">close</button>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Workstation"
                      className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner"
                      value={newCat}
                      onChange={e => setNewCat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Managing Admin</label>
                    <div className="relative">
                      <select
                        value={selectedSA}
                        onChange={e => setSelectedSA(e.target.value)}
                        className="w-full px-8 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="">Select Admin...</option>
                        {superAdmins.map(sa => (
                          <option key={sa.id} value={sa.id}>{sa.email}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCat || isEditCategory}
                  className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEditCategory ? <span className="material-symbols-outlined text-sm font-black animate-spin">sync</span> : <span className="material-symbols-outlined text-sm font-black">add_circle</span>}
                  {isEditCategory ? 'Registering...' : 'Register Asset Category'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border-[3px] border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined font-black">location_on</span>
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Physical Locations</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                {assetLocations.map(loc => (
                  <div key={loc.id} className="group flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105">
                    {loc.name}
                    <button onClick={() => handleDeleteLocation(loc.id)} className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">close</button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
                <input
                  type="text"
                  placeholder="New location..."
                  className="flex-1 px-8 py-4 rounded-full bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner"
                  value={newLoc}
                  onChange={e => setNewLoc(e.target.value)}
                />
                <button
                  onClick={handleAddLocation}
                  disabled={!newLoc || isEditLocation}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isEditLocation ? <span className="material-symbols-outlined text-sm animate-spin">sync</span> : null}
                  {isEditLocation ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Name & Role</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Department</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
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
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onConfirm={handleInviteConfirm}
      />

      <EditMemberModal
        member={editingMember}
        onClose={() => setEditingMember(null)}
        onConfirm={updateMember}
      />

      {revokingMember && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-md" onClick={() => setRevokingMember(null)}></div>
          <div className="relative bg-[#111827] w-full max-w-lg rounded-[3rem] shadow-2xl border border-red-500/30 overflow-hidden animate-fade-in p-10 text-center">
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <span className="material-symbols-outlined text-4xl">security_update_warning</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-4">REVOKE ACCESS?</h2>
            <p className="text-slate-400 font-bold text-sm leading-relaxed mb-10">
              You are about to terminate all system credentials for <span className="text-white font-black">{revokingMember.name}</span>.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={revokeAccess}
                className="w-full py-4 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-all"
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

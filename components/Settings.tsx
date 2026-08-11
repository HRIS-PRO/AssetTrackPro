
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole } from '../types';
import { InviteMemberModal } from './InviteMemberModal';
import { EditMemberModal } from './EditMemberModal';
import { useAssetTracker } from '../AssetTrackerContext';
import { THEMES, applyTheme } from '../themes';
import { useToast } from './Toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Settings: React.FC = () => {
  const {
    user,
    assets,
    team, setTeam,
    categories, setCategories,
    departments, setDepartments,
    assetLocations, setAssetLocations,
    orgSettings, saveOrgSettings
  } = useAssetTracker();
  const { addToast } = useToast();

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
  const [formMnemonic, setFormMnemonic] = useState(orgSettings.orgMnemonic || 'NF');
  const [newCatMnemonic, setNewCatMnemonic] = useState('');
  const [formEmail, setFormEmail] = useState(orgSettings.contactEmail);
  const [formTheme, setFormTheme] = useState(orgSettings.theme);
  const [formLogo, setFormLogo] = useState<string | null>(orgSettings.logoUrl || null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const savedThemeRef = useRef(orgSettings.theme);

  const isOrgAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER;

  // Re-sync the form whenever fresh settings arrive from the server
  useEffect(() => {
    setFormName(orgSettings.orgName);
    setFormMnemonic(orgSettings.orgMnemonic || 'NF');
    setFormEmail(orgSettings.contactEmail);
    setFormTheme(orgSettings.theme);
    setFormLogo(orgSettings.logoUrl || null);
    savedThemeRef.current = orgSettings.theme;
  }, [orgSettings]);

  // If a previewed theme was never saved, revert to the saved one on unmount
  useEffect(() => {
    return () => applyTheme(savedThemeRef.current);
  }, []);

  const isDirty =
    formName !== orgSettings.orgName ||
    formMnemonic !== (orgSettings.orgMnemonic || 'NF') ||
    formEmail !== orgSettings.contactEmail ||
    formTheme !== orgSettings.theme ||
    formLogo !== (orgSettings.logoUrl || null);

  const nameError = formName.trim().length < 2 ? 'Organization name must be at least 2 characters' : null;
  const emailError = !EMAIL_REGEX.test(formEmail.trim()) ? 'Enter a valid contact email' : null;
  const formValid = !nameError && !emailError;

  const handleThemePreview = (themeId: string) => {
    if (!isOrgAdmin) return;
    setFormTheme(themeId);
    applyTheme(themeId, false); // live preview without persisting
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Logo image size must be less than 2MB");
      return;
    }

    setLogoError(null);
    setIsUploadingLogo(true);

    try {
      const token = localStorage.getItem('asset_track_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/org-settings/logo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        let message = 'Failed to upload logo';
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch { /* non-JSON error body */ }
        throw new Error(message);
      }

      const data = await res.json();
      setFormLogo(data.logoUrl);
      await saveOrgSettings({ logoUrl: data.logoUrl });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Logo upload failed", err);
      setLogoError(err.message || 'Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setFormLogo(null);
    setLogoError(null);
    try {
      await saveOrgSettings({ logoUrl: null });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to remove logo", err);
    }
  };

  const handleDiscardGeneral = () => {
    setFormName(orgSettings.orgName);
    setFormMnemonic(orgSettings.orgMnemonic || 'NF');
    setFormEmail(orgSettings.contactEmail);
    setFormTheme(orgSettings.theme);
    setFormLogo(orgSettings.logoUrl || null);
    setSaveError(null);
    setLogoError(null);
    applyTheme(orgSettings.theme);
  };

  const handleSaveGeneral = async () => {
    if (!formValid || isSavingGeneral) return;
    setIsSavingGeneral(true);
    setSaveError(null);
    try {
      await saveOrgSettings({
        orgName: formName.trim(),
        orgMnemonic: formMnemonic.trim().toUpperCase(),
        contactEmail: formEmail.trim(),
        theme: formTheme,
        logoUrl: formLogo
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
  const [consentModalTarget, setConsentModalTarget] = useState<User | null>(null);
  const [loadingOption, setLoadingOption] = useState<'byod' | 'asset' | 'both' | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleExecuteConsentRequest = async (type: 'byod' | 'asset' | 'both') => {
    if (!consentModalTarget || loadingOption) return;
    setLoadingOption(type);
    try {
      const token = localStorage.getItem('asset_track_token');
      const memberId = consentModalTarget.id;

      if (type === 'asset' || type === 'both') {
        await fetch(`/api/assets/user/${memberId}/request-consent`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).catch(err => console.error(err));
      }

      const typeLabel = type === 'byod' ? 'BYOD policy consent' : (type === 'asset' ? 'Asset custody consent' : 'BYOD & Asset custody consents');
      
      addToast({
        title: 'Consent Request Dispatched',
        message: `${typeLabel} request successfully sent to ${consentModalTarget.name}!`,
        type: 'success'
      });

      setConsentModalTarget(null);
    } catch (err) {
      console.error('Failed to request consent', err);
      addToast({
        title: 'Error',
        message: 'Failed to send consent request. Please try again.',
        type: 'error'
      });
    } finally {
      setLoadingOption(null);
    }
  };

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
            mnemonic: newCatMnemonic.trim().toUpperCase() || undefined,
            managedById: selectedSA || undefined
          })
        });
        if (res.ok) {
          const added = await res.json();
          setCategories([...categories, added]);
          setNewCat('');
          setNewCatMnemonic('');
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-2">
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Company Code</label>
                      <input
                        type="text"
                        placeholder="NF"
                        maxLength={6}
                        value={formMnemonic}
                        onChange={e => setFormMnemonic(e.target.value.toUpperCase())}
                        disabled={!isOrgAdmin}
                        className="w-full px-6 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center tracking-wider text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
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

                {/* App Branding Logo Section */}
                <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">App Branding Logo</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Displayed on navigation header & sidebar</p>
                    </div>
                    {formLogo && isOrgAdmin && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                      >
                        Reset Logo
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-6 p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    {formLogo ? (
                      <img
                        src={formLogo}
                        alt="Custom App Logo"
                        className="w-16 h-16 rounded-2xl object-cover shadow-md border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-md">
                        <span className="material-symbols-outlined font-black text-3xl">inventory_2</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                        disabled={!isOrgAdmin || isUploadingLogo}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={!isOrgAdmin || isUploadingLogo}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          {isUploadingLogo ? 'Uploading...' : formLogo ? 'Change Logo' : 'Upload App Logo'}
                        </button>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        PNG, JPG, SVG, WebP • Max size 2MB
                      </p>
                      {logoError && (
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{logoError}</p>
                      )}
                    </div>
                  </div>
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
                    <span>{cat.name}</span>
                    {cat.mnemonic && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 dark:text-blue-600 text-[10px] font-black">{cat.mnemonic.toUpperCase()}</span>
                    )}
                    <button onClick={() => handleDeleteCategory(cat.id)} className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">close</button>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-2">
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
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category Code</label>
                    <input
                      type="text"
                      placeholder="e.g. LAP"
                      maxLength={6}
                      className="w-full px-6 py-4 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-black text-center text-sm tracking-wider dark:text-white focus:ring-2 focus:ring-blue-600 shadow-inner"
                      value={newCatMnemonic}
                      onChange={e => setNewCatMnemonic(e.target.value.toUpperCase())}
                    />
                  </div>
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
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Unsigned Assets</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {team.map((member) => {
                    const unsignedAssets = assets.filter(a => 
                      (a.assignedTo === member.id || a.assignedTo === member.email || a.assignedTo === member.employeeId) && 
                      (a.status === 'PENDING' || !a.consentSignature)
                    );
                    return (
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
                          {unsignedAssets.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 w-fit flex items-center gap-1.5 shadow-sm border border-amber-200 dark:border-amber-700/40">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                {unsignedAssets.length} Unsigned {unsignedAssets.length === 1 ? 'Asset' : 'Assets'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[180px]" title={unsignedAssets.map(a => a.name).join(', ')}>
                                {unsignedAssets.map(a => a.name).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-fit flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/40">
                              <span className="material-symbols-outlined text-[12px]">check_circle</span>
                              All Signed
                            </span>
                          )}
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
                              className="absolute right-8 top-16 w-52 glass-panel rounded-2xl shadow-2xl overflow-hidden z-[100] animate-fade-in border border-slate-200 dark:border-slate-800 text-left"
                            >
                              <button
                                onClick={() => { setConsentModalTarget(member); setOpenMenuId(null); }}
                                className="w-full px-5 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors border-b border-slate-100 dark:border-slate-800/60"
                              >
                                <span className="material-symbols-outlined text-sm">verified_user</span>
                                Request Consent
                              </button>
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
                    );
                  })}
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

      {/* Request Consent Sign-off Modal */}
      {consentModalTarget && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md" onClick={() => setConsentModalTarget(null)}></div>
          <div className="relative z-10 w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-fade-in p-7 text-left text-white my-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white leading-tight">Request Consent Sign-off</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Target: {consentModalTarget.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setConsentModalTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Subtitle / Instruction */}
            <p className="text-xs font-bold text-slate-300 mb-4 tracking-wide">Select which type of consent agreement to request:</p>

            {/* Options Cards */}
            <div className="space-y-3 mb-8">
              
              {/* Option 1: BYOD Policy Consent */}
              <button
                onClick={() => handleExecuteConsentRequest('byod')}
                disabled={!!loadingOption}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-[#162032] border transition-all group text-left ${
                  loadingOption === 'byod' ? 'border-indigo-500 bg-indigo-950/20 opacity-90' : 'border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#1c2940]'
                } ${loadingOption && loadingOption !== 'byod' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  {loadingOption === 'byod' ? (
                    <span className="material-symbols-outlined text-2xl animate-spin text-indigo-400">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">devices</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">BYOD Policy Consent</h4>
                    {loadingOption === 'byod' && <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 animate-pulse">Sending...</span>}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {loadingOption === 'byod' ? 'Dispatching security & MDM consent email...' : 'Personal device security & MDM terms'}
                  </p>
                </div>
              </button>

              {/* Option 2: Asset Custody Consent */}
              <button
                onClick={() => handleExecuteConsentRequest('asset')}
                disabled={!!loadingOption}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-[#162032] border transition-all group text-left ${
                  loadingOption === 'asset' ? 'border-indigo-500 bg-indigo-950/20 opacity-90' : 'border-slate-800/80 hover:border-indigo-500/50 hover:bg-[#1c2940]'
                } ${loadingOption && loadingOption !== 'asset' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  {loadingOption === 'asset' ? (
                    <span className="material-symbols-outlined text-2xl animate-spin text-indigo-400">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">inventory_2</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">Asset Custody Consent</h4>
                    {loadingOption === 'asset' && <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 animate-pulse">Sending...</span>}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    {loadingOption === 'asset' ? 'Dispatching hardware custody email...' : 'Company-owned hardware custody sign-off'}
                  </p>
                </div>
              </button>

              {/* Option 3: Request Both Consents */}
              <button
                onClick={() => handleExecuteConsentRequest('both')}
                disabled={!!loadingOption}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:from-indigo-500 hover:to-indigo-400 transition-all group text-left border border-indigo-400/30 ${
                  loadingOption === 'both' ? 'opacity-90 ring-2 ring-indigo-400' : ''
                } ${loadingOption && loadingOption !== 'both' ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                  {loadingOption === 'both' ? (
                    <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">task_alt</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-white">Request Both Consents</h4>
                    {loadingOption === 'both' && <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-100 animate-pulse">Sending...</span>}
                  </div>
                  <p className="text-[11px] font-semibold text-indigo-100 mt-0.5">
                    {loadingOption === 'both' ? 'Dispatching BYOD & Asset Custody emails...' : 'Trigger BYOD & Asset Custody sign-offs'}
                  </p>
                </div>
              </button>

            </div>

            {/* Footer Cancel Button */}
            <div className="text-center pt-2">
              <button
                onClick={() => setConsentModalTarget(null)}
                className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-white transition-colors"
              >
                CANCEL
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

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

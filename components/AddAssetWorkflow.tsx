
import React from 'react';
import { createPortal } from 'react-dom';
import { Asset, UserRole } from '../types';
import { useAssetTracker } from '../AssetTrackerContext';

interface AddAssetWorkflowProps {
  isAdding: boolean;
  setIsAdding: (val: boolean) => void;
  onAssetAdded?: (asset: Asset) => void;
}

export const AddAssetWorkflow: React.FC<AddAssetWorkflowProps> = ({
  isAdding, setIsAdding, onAssetAdded
}) => {
  const { 
    categories, setCategories, departments, 
    assetLocations, team, allEmployees, superAdmins, setAssets 
  } = useAssetTracker();

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [lastAddedAsset, setLastAddedAsset] = React.useState<Asset | null>(null);
  const [isCreatingAsset, setIsCreatingAsset] = React.useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [newCategoryInput, setNewCategoryInput] = React.useState('');
  const [selectedSA, setSelectedSA] = React.useState('');
  const [userSearch, setUserSearch] = React.useState('');
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});

  const [formData, setFormData] = React.useState({
    name: '',
    condition: 'Brand New',
    category: '',
    serialNumber: '',
    description: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    assignedTo: '',
    manager: '',
    department: '',
    location: '',
  });

  const validate = (type?: 'consent') => {
    const newErrors: Record<string, boolean> = {};
    const required = ['name', 'category', 'serialNumber', 'purchasePrice'];
    if (type === 'consent') required.push('assignedTo', 'manager', 'department');
    required.forEach(field => {
      if (!formData[field as keyof typeof formData]) newErrors[field] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (type?: 'consent') => {
    if (!validate(type)) return;
    setIsCreatingAsset(true);
    const submitData = new FormData();
    if (receiptFile) submitData.append('receipt', receiptFile);
    submitData.append('data', JSON.stringify({
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice)
    }));

    try {
      const token = localStorage.getItem('asset_track_token');
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: submitData
      });
      if (response.ok) {
        const newAsset = await response.json();
        setAssets(prev => [newAsset, ...prev]);
        setLastAddedAsset(newAsset);
        onAssetAdded?.(newAsset);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const filteredUsers = React.useMemo(() => {
    const listToSearch = allEmployees.length > 0 ? allEmployees : team;
    if (!userSearch) return listToSearch;
    return listToSearch.filter(u =>
      (u.firstName + ' ' + (u.surname || u.lastName || '')).toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [userSearch, allEmployees, team]);

  if (!isAdding) return null;

  return createPortal((
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => !showSuccess && setIsAdding(false)}></div>

      <div className="relative bg-white dark:bg-slate-950 w-full max-w-5xl h-[85vh] rounded-[3.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row">
        
        {!showSuccess ? (
          <>
            {/* Left Sidebar: Context & Info */}
            <div className="hidden md:flex md:w-80 bg-slate-900 dark:bg-[#020617] p-12 flex-col justify-between text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px]"></div>
               <div className="relative z-10 space-y-12">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                     <span className="material-symbols-outlined text-3xl font-black">inventory</span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter italic leading-none mb-4 uppercase">UNITS<br/>REGISTRY</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Hardware lifecycle initialization. Record hardware metadata and establish chain of custody.</p>
                  </div>
                  
                  <div className="space-y-6">
                     <div className="flex items-center gap-4 group">
                        <div className="w-1 h-1 bg-blue-600 rounded-full group-hover:scale-150 transition-transform"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">I. Metadata Entry</p>
                     </div>
                     <div className="flex items-center gap-4 group">
                        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">II. Custody Mapping</p>
                     </div>
                     <div className="flex items-center gap-4 group opacity-50">
                        <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">III. System Dispatch</p>
                     </div>
                  </div>
               </div>
               
               <div className="relative z-10 pt-10 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Secure Protocol v2.4</p>
               </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
               <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Initialize Hardware Node</h3>
                  <button onClick={() => setIsAdding(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <span className="material-symbols-outlined italic">close</span>
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto px-10 py-10 space-y-12 scrollbar-hide">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <InputGroup label="Unit Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="e.g. MacBook Pro M3" error={errors.name} />
                       <SelectGroup label="Health Category" value={formData.condition} onChange={v => setFormData({...formData, condition: v})} options={['Brand New', 'Good/Like New', 'Refurbished', 'Legacy']} />
                       
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hardware Category</label>
                         <div className="flex gap-2">
                            <select
                               className={`flex-1 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.category ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold text-xs uppercase tracking-widest`}
                               value={formData.category}
                               onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                               <option value="">Select Category</option>
                               {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <button onClick={() => setIsCreatingCategory(true)} className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"><span className="material-symbols-outlined text-sm">add</span></button>
                         </div>
                       </div>

                       <InputGroup label="Serial Number" value={formData.serialNumber} onChange={v => setFormData({...formData, serialNumber: v})} placeholder="SN-000-000" fontMono error={errors.serialNumber} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Market Valuation</label>
                         <div className={`flex items-center px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 ${errors.purchasePrice ? 'border-red-500/50' : 'border-transparent'} focus-within:ring-2 focus-within:ring-blue-600 transition-all`}>
                            <span className="text-slate-400 font-bold mr-2">₦</span>
                            <input type="number" className="bg-transparent border-none outline-none w-full font-black dark:text-white text-sm" placeholder="0.00" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                         </div>
                       </div>
                       <InputGroup label="Acquisition Date" value={formData.purchaseDate} onChange={v => setFormData({...formData, purchaseDate: v})} type="date" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Custody Assignment (Search Staff)</label>
                       <div className="relative">
                          <input
                             type="text"
                             className="w-full px-6 py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs uppercase tracking-widest outline-none shadow-2xl"
                             placeholder="SEARCH STAFF DATABASE..."
                             value={userSearch}
                             onFocus={() => setShowUserDropdown(true)}
                             onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                          />
                          {showUserDropdown && (
                             <div className="absolute top-full left-0 w-full mt-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] z-[110] overflow-hidden max-h-64 overflow-y-auto animate-fade-in scrollbar-hide">
                                {filteredUsers.map(u => {
                                   const displayName = u.firstName ? `${u.firstName} ${u.surname}` : u.name;
                                   return (
                                      <button
                                         key={u.id}
                                         onClick={() => {
                                            setFormData({...formData, assignedTo: u.userId || u.id, department: u.department?.name || u.department || 'General', manager: u.hiringManagerName || 'System Admin'});
                                            setUserSearch(displayName);
                                            setShowUserDropdown(false);
                                         }}
                                         className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b last:border-0 dark:border-slate-800"
                                      >
                                         <img src={u.avatar} className="w-10 h-10 rounded-full border border-slate-100" alt="" />
                                         <div>
                                            <p className="text-xs font-black dark:text-white leading-none mb-1 uppercase tracking-tight">{displayName}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{u.department || 'Department Metadata Pending'}</p>
                                         </div>
                                      </button>
                                   );
                                })}
                             </div>
                          )}
                       </div>
                    </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
                  <button onClick={() => setIsAdding(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button 
                    onClick={() => handleSave(formData.assignedTo ? 'consent' : undefined)} 
                    disabled={isCreatingAsset}
                    className="flex-[2] btn-primary"
                  >
                    {isCreatingAsset ? <span className="material-symbols-outlined animate-spin">sync</span> : (formData.assignedTo ? 'Commit & Send for Consent' : 'Commit to Storage')}
                  </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-fade-in space-y-12 bg-white dark:bg-slate-950">
             <div className="w-32 h-32 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-green-500/20 rotate-12">
                <span className="material-symbols-outlined text-6xl">verified</span>
             </div>
             <div className="space-y-4">
                <h2 className="text-5xl font-black italic tracking-tighter dark:text-white uppercase leading-none">COMMIT SUCCESSFUL</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] max-w-sm mx-auto">Asset node <span className="text-blue-600">#{lastAddedAsset?.id.slice(0, 12)}</span> has been registered and verified in the central ledger.</p>
             </div>
             
             <button onClick={() => setIsAdding(false)} className="px-16 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-xs tracking-[0.25em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                Close Interface
             </button>
          </div>
        )}
      </div>
    </div>
  ), document.body);
};

const InputGroup = ({ label, value, onChange, placeholder = '', fontMono = false, type = 'text', error = false }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
    <input 
      type={type} 
      placeholder={placeholder} 
      className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${error ? 'border-red-500/50' : 'border-transparent'} focus:border-blue-600 outline-none transition-all dark:text-white font-bold text-sm ${fontMono ? 'font-mono' : ''}`}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const SelectGroup = ({ label, value, onChange, options }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{label}</label>
    <select 
       className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 outline-none transition-all dark:text-white font-bold text-sm"
       value={value}
       onChange={e => onChange(e.target.value)}
    >
       {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

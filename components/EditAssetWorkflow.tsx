
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Asset, UserRole, AssetStatus } from '../types';
import { useAssetTracker } from '../AssetTrackerContext';

interface EditAssetWorkflowProps {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  asset: Asset | null;
  onAssetUpdated?: (asset: Asset) => void;
}

export const EditAssetWorkflow: React.FC<EditAssetWorkflowProps> = ({
  isEditing, setIsEditing, asset, onAssetUpdated
}) => {
  const { 
    categories, departments, team, allEmployees, setAssets 
  } = useAssetTracker();

  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isUpdatingAsset, setIsUpdatingAsset] = React.useState(false);
  const [userSearch, setUserSearch] = React.useState('');
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, boolean>>({});

  const [formData, setFormData] = React.useState({
    name: '',
    condition: '',
    category: '',
    serialNumber: '',
    description: '',
    purchaseDate: '',
    purchasePrice: '',
    assignedTo: '',
    manager: '',
    department: '',
    location: '',
    status: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || '',
        condition: asset.condition || 'Brand New',
        category: asset.category || '',
        serialNumber: asset.serialNumber || '',
        description: asset.description || '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        purchasePrice: asset.purchasePrice?.toString() || '',
        assignedTo: asset.assignedTo || '',
        manager: asset.manager || '',
        department: asset.department || '',
        location: asset.location || '',
        status: asset.status || ''
      });

      const assignedUser = allEmployees.find(u => u.id === asset.assignedTo || u.userId === asset.assignedTo) || team.find(u => u.id === asset.assignedTo);
      if (assignedUser) {
        setUserSearch(assignedUser.firstName ? `${assignedUser.firstName} ${assignedUser.surname}` : assignedUser.name);
      } else {
        setUserSearch('');
      }
    }
  }, [asset, allEmployees, team]);

  const validate = () => {
    const newErrors: Record<string, boolean> = {};
    const required = ['name', 'category', 'serialNumber', 'purchasePrice'];
    required.forEach(field => {
      if (!formData[field as keyof typeof formData]) newErrors[field] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate() || !asset) return;
    setIsUpdatingAsset(true);
    
    const payload = {
      ...formData,
      purchasePrice: parseFloat(formData.purchasePrice)
    };

    try {
      const token = localStorage.getItem('asset_track_token');
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const updatedAsset = await response.json();
        setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        onAssetUpdated?.(updatedAsset);
        setShowSuccess(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingAsset(false);
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

  if (!isEditing) return null;

  return createPortal((
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => !showSuccess && setIsEditing(false)}></div>

      <div className="relative bg-white dark:bg-slate-950 w-full max-w-5xl h-[85vh] rounded-[3.5rem] shadow-2xl overflow-hidden animate-fade-in border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row">
        
        {!showSuccess ? (
          <>
            <div className="hidden md:flex md:w-80 bg-slate-900 dark:bg-[#020617] p-12 flex-col justify-between text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px]"></div>
               <div className="relative z-10 space-y-12">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                     <span className="material-symbols-outlined text-3xl font-black">edit_square</span>
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter italic leading-none mb-4 uppercase">MODIFY<br/>ASSET</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Hardware profile update. Maintain accurate records of equipment specifications and health status.</p>
                  </div>
               </div>
               
               <div className="relative z-10 pt-10 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Secure Audit Protocol</p>
               </div>
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
               <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase tracking-[0.25em] text-slate-900 dark:text-white">Edit Hardware Profile</h3>
                  <button onClick={() => setIsEditing(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <span className="material-symbols-outlined italic">close</span>
                  </button>
               </div>

               <div className="flex-1 overflow-y-auto px-10 py-10 space-y-12 scrollbar-hide">
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <InputGroup label="Unit Name" value={formData.name} onChange={(v: string) => setFormData({...formData, name: v})} placeholder="e.g. MacBook Pro M3" error={errors.name} />
                       <SelectGroup label="Health Category" value={formData.condition} onChange={(v: string) => setFormData({...formData, condition: v})} options={['Brand New', 'Good/Like New', 'Refurbished', 'Legacy']} />
                       
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Hardware Category</label>
                         <select
                            className={`w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 ${errors.category ? 'border-red-500/50' : 'border-transparent'} outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white font-bold text-xs uppercase tracking-widest`}
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                         >
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                         </select>
                       </div>

                       <InputGroup label="Serial Number" value={formData.serialNumber} onChange={(v: string) => setFormData({...formData, serialNumber: v})} placeholder="SN-000-000" fontMono error={errors.serialNumber} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Market Valuation</label>
                         <div className={`flex items-center px-6 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 ${errors.purchasePrice ? 'border-red-500/50' : 'border-transparent'} focus-within:ring-2 focus-within:ring-blue-600 transition-all`}>
                            <span className="text-slate-400 font-bold mr-2">₦</span>
                            <input type="number" className="bg-transparent border-none outline-none w-full font-black dark:text-white text-sm" placeholder="0.00" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                         </div>
                       </div>
                       <InputGroup label="Acquisition Date" value={formData.purchaseDate} onChange={(v: string) => setFormData({...formData, purchaseDate: v})} type="date" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <SelectGroup label="Operational Status" value={formData.status} onChange={(v: string) => setFormData({...formData, status: v})} options={Object.values(AssetStatus)} />
                       <InputGroup label="Storage Location" value={formData.location} onChange={(v: string) => setFormData({...formData, location: v})} placeholder="e.g. Lagos HQ" />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Detailed Remarks</label>
                       <textarea
                         className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 outline-none transition-all dark:text-white font-bold text-sm min-h-[120px]"
                         placeholder="Add any additional context or technical remarks..."
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                       />
                    </div>
                  </div>
               </div>

               <div className="p-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button 
                    onClick={handleUpdate} 
                    disabled={isUpdatingAsset}
                    className="flex-[2] btn-primary"
                  >
                    {isUpdatingAsset ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Update Asset Profile'}
                  </button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-fade-in space-y-12 bg-white dark:bg-slate-950">
             <div className="w-32 h-32 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-12">
                <span className="material-symbols-outlined text-6xl">verified</span>
             </div>
             <div className="space-y-4">
                <h2 className="text-5xl font-black italic tracking-tighter dark:text-white uppercase leading-none">UPDATE SUCCESSFUL</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] max-w-sm mx-auto">Hardware profile for <span className="text-blue-600">{formData.name}</span> has been updated across the system.</p>
             </div>
             
             <button onClick={() => setIsEditing(false)} className="px-16 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-black uppercase text-xs tracking-[0.25em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
                Return to Profile
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

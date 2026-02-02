
import React, { useState } from 'react';
import { CATEGORIES } from '../constants';

interface RequestAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const RequestAssetModal: React.FC<RequestAssetModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<'LOW' | 'STANDARD' | 'HIGH' | 'CRITICAL'>('STANDARD');
  const [justification, setJustification] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const priorities = [
    { id: 'LOW', label: 'LOW', sub: 'Non-critical' },
    { id: 'STANDARD', label: 'STANDARD', sub: 'Business as usual' },
    { id: 'HIGH', label: 'HIGH', sub: 'Impacts productivity' },
    { id: 'CRITICAL', label: 'CRITICAL', sub: 'Work stopped' },
  ];

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('laptop')) return 'laptop_mac';
    if (c.includes('monitor')) return 'monitor';
    if (c.includes('av')) return 'videocam';
    if (c.includes('furniture')) return 'chair';
    if (c.includes('mobile')) return 'smartphone';
    return 'inventory_2';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-black">add_shopping_cart</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight dark:text-white">Request New Asset</h2>
              <p className="text-sm font-bold text-slate-400">Hardware & Equipment provisioning</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-8 pb-8 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
          {/* Category Dropdown */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Category</label>
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-blue-500/30 transition-all flex items-center justify-between group shadow-inner"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">{getCategoryIcon(selectedCategory)}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-900 dark:text-white leading-none">{selectedCategory}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Selected Type</p>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); setIsDropdownOpen(false); }}
                      className="w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors"
                    >
                      <span className="material-symbols-outlined text-slate-400">{getCategoryIcon(cat)}</span>
                      <span className="font-bold text-sm dark:text-white">{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Priority Level */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Priority Level</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {priorities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id as any)}
                  className={`p-4 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center gap-1 ${
                    priority === p.id 
                    ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-lg shadow-blue-500/10' 
                    : 'border-transparent bg-slate-50 dark:bg-slate-900/50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                  } ${p.id === 'CRITICAL' ? 'col-span-2 sm:col-span-3 py-6' : ''}`}
                >
                  <p className={`text-[10px] font-black ${priority === p.id ? 'text-blue-600' : 'text-slate-500'}`}>{p.label}</p>
                  <p className="text-[10px] font-bold text-slate-400">{p.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Business Justification */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Business Justification</label>
            <textarea 
              placeholder="Please describe why this asset is required for your role..."
              className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none resize-none font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-inner h-32"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onSubmit({ category: selectedCategory, priority, justification }); onClose(); }}
            className="flex-[2] py-4 rounded-2xl bg-[#1985f0] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">send</span>
            Submit Provisioning Request
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 text-center">
          <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
            Asset requests are subject to manager approval and stock availability.
          </p>
        </div>
      </div>
    </div>
  );
};

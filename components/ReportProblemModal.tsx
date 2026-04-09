
import React, { useState, useMemo } from 'react';
import { Asset } from '../types';
import { useAssetTracker } from '../AssetTrackerContext';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialAssetId?: string;
}

export const ReportProblemModal: React.FC<ReportProblemModalProps> = ({
  isOpen, onClose, onSubmit, initialAssetId
}) => {
  const { user, assets } = useAssetTracker();
  
  const myAssets = useMemo(() => {
    if (!user) return [];
    return assets.filter(a => a.assignedTo === user.id || a.assignedTo === user.userId);
  }, [assets, user]);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(() => {
    if (initialAssetId) return assets.find(a => a.id === initialAssetId) || null;
    return myAssets[0] || null;
  });
  
  // Update selected asset if myAssets changes or initialAssetId changes
  React.useEffect(() => {
    if (initialAssetId) {
      const found = assets.find(a => a.id === initialAssetId);
      if (found) setSelectedAsset(found);
    } else if (!selectedAsset && myAssets.length > 0) {
      setSelectedAsset(myAssets[0]);
    }
  }, [initialAssetId, assets, myAssets, selectedAsset]);

  const [comments, setComments] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async () => {
    if (!selectedAsset || !comments.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await onSubmit({ assetId: selectedAsset.id, comment: comments });
      setComments('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string | undefined) => {
    if (!cat) return 'inventory_2';
    const c = cat.toLowerCase();
    if (c.includes('laptop')) return 'laptop_mac';
    if (c.includes('monitor')) return 'monitor';
    return 'inventory_2';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-red-950/40 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-950 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-fade-in flex flex-col border border-red-100 dark:border-red-900/20">

        {/* Header */}
        <div className="p-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-black">warning</span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight dark:text-white">Report Problem</h2>
              <p className="text-sm font-bold text-slate-400">Maintenance & Incident Reporting</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-8 pb-8 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
          {/* Asset Selection */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Select Asset</label>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent hover:border-red-500/30 transition-all flex items-center justify-between group shadow-inner"
              >
                {selectedAsset ? (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-red-600">
                      <span className="material-symbols-outlined">{getCategoryIcon(selectedAsset.category)}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 dark:text-white leading-none">{selectedAsset.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1">SERIAL: {selectedAsset.serialNumber || 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 font-bold">No asset selected</p>
                )}
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in max-h-64 overflow-y-auto">
                  {myAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => { setSelectedAsset(asset); setIsDropdownOpen(false); }}
                      className="w-full p-4 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-slate-400">{getCategoryIcon(asset.category)}</span>
                      <div>
                        <p className="font-bold text-sm dark:text-white">{asset.name}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">SN: {asset.serialNumber || 'N/A'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Detailed Comments</label>
            <textarea
              placeholder="Please describe the issue, damage, or malfunction in detail..."
              className="w-full p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-none resize-none font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-600 transition-all shadow-inner h-40"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-8 mb-4 flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800 animate-shake">
            <span className="material-symbols-outlined text-red-500 text-[20px] flex-shrink-0 mt-0.5">error</span>
            <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-tight">{errorMessage}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-8 pt-4 flex gap-4">
          <button
            disabled={isSubmitting}
            onClick={onClose}
            className="flex-1 py-5 rounded-2xl bg-slate-50 dark:bg-slate-900 font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={isSubmitting || !selectedAsset || !comments.trim()}
            onClick={handleSubmit}
            className="flex-[2] py-5 rounded-2xl bg-[#ef4444] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/30 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
          >
            <span className={`material-symbols-outlined text-lg ${isSubmitting ? 'animate-spin' : ''}`}>
              {isSubmitting ? 'sync' : 'error'}
            </span>
            {isSubmitting ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </div>

        <div className="bg-red-50 dark:bg-red-900/10 p-6 text-center">
          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest">
            This will create a high-priority ticket in the IT support queue.
          </p>
        </div>
      </div>
    </div>
  );
};

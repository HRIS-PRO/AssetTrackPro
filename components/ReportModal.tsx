import React, { useState } from 'react';
import { Asset } from '../types';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    assignedAssets: Asset[];
    onSubmit: (assetId: string, comment: string) => Promise<void>;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, assignedAssets, onSubmit }) => {
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssetId || !comment.trim()) return;

        setIsSubmitting(true);
        setErrorMessage(null);
        try {
            await onSubmit(selectedAssetId, comment);
            setSelectedAssetId('');
            setComment('');
            onClose();
        } catch (error: any) {
            setErrorMessage(error?.message || 'Failed to submit report. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="mt-[160px] bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border-[3px] border-slate-100 dark:border-slate-800 animate-scale-up">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight dark:text-white">Report Asset Issue</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Submit a detailed report for your assigned asset</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Select Asset</label>
                        <div className="relative group">
                            <select
                                required
                                value={selectedAssetId}
                                onChange={(e) => setSelectedAssetId(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white appearance-none"
                            >
                                <option value="" disabled>Choose an asset...</option>
                                {assignedAssets.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.name} ({asset.id})
                                    </option>
                                ))}
                            </select>
                            <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">inventory</span>
                            <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Detailed Comment</label>
                        <div className="relative group">
                            <textarea
                                required
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Describe the issue in detail..."
                                rows={4}
                                className="w-full pl-14 pr-6 py-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm focus:ring-4 focus:ring-blue-500/10 transition-all dark:text-white resize-none"
                            ></textarea>
                            <span className="material-symbols-outlined absolute left-6 top-6 text-slate-400 group-focus-within:text-blue-600 transition-colors">notes</span>
                        </div>
                    </div>

                    {/* Inline error message */}
                    {errorMessage && (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-100 dark:border-red-800">
                            <span className="material-symbols-outlined text-red-500 text-[20px] flex-shrink-0 mt-0.5">error</span>
                            <p className="text-sm font-bold text-red-600 dark:text-red-400 leading-snug">{errorMessage}</p>
                        </div>
                    )}

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-full border-[3px] border-slate-100 dark:border-slate-800 font-black text-xs uppercase tracking-[0.2em] text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedAssetId || !comment.trim()}
                            className="flex-[2] py-5 rounded-full bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">{isSubmitting ? 'sync' : 'send'}</span>
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

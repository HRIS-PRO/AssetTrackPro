
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssetTracker } from '../AssetTrackerContext';

interface AssetConsentProps {
  onReportIssue: (assetId: string) => void;
}

export const AssetConsent: React.FC<AssetConsentProps> = ({ onReportIssue }) => {
  const { assets, refreshAll } = useAssetTracker();
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = assets.find(a => a.id === assetId) || assets[0];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#000000';
      }
    }
  }, []);

  if (!asset) return null;

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSigned(false);
      }
    }
  };

  const handleCopySN = () => {
    if (asset.serialNumber) {
      navigator.clipboard.writeText(asset.serialNumber);
    }
  };

  const handleConfirmAsset = async () => {
    setIsSubmitting(true);
    
    let signatureData = null;
    if (canvasRef.current && hasSigned) {
      signatureData = canvasRef.current.toDataURL('image/png');
    }

    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${asset.id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ consentSignature: signatureData })
      });
      if (!res.ok) throw new Error('Failed to accept asset');
      await refreshAll?.(); // Call the destructured function
      setIsConfirmed(true);
    } catch (err) {
      console.error(err);
      alert('Failed to confirm asset receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isConfirmed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-fade-in text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-2xl shadow-green-500/20">
          <span className="material-symbols-outlined text-5xl">verified</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight dark:text-white">Custody Confirmed</h2>
          <p className="text-slate-500 font-bold max-w-sm mx-auto">Your digital signature has been recorded and the asset inventory has been updated.</p>
        </div>
        <button 
          onClick={() => navigate('/')}
          className="px-10 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-full font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-all"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 pb-20 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-xl">fact_check</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight dark:text-white">Confirm Asset Custody</h1>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-bold max-w-3xl leading-relaxed">
          Please review the details of the asset assigned to you below. By confirming, you acknowledge receipt and responsibility for this item in accordance with company policy.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors">
        <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 border-b border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-80 h-64 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 dark:border-slate-700/50 shrink-0 overflow-hidden group">
             <span className="material-symbols-outlined text-[8rem] text-slate-200 dark:text-slate-700 group-hover:scale-110 transition-transform duration-700">
               {asset.category?.toLowerCase().includes('laptop') ? 'laptop_mac' : 'inventory_2'}
             </span>
          </div>
          
          <div className="flex-1 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black tracking-tight dark:text-white leading-none mb-4">{asset.name}</h2>
                <div className="flex items-center gap-3">
                   <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Asset Tag:</span>
                   <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-sm font-bold text-slate-600 dark:text-slate-300">#{asset.id}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3">
                <span className="px-5 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-900/50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Pending Consent
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
               <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 <span className="material-symbols-outlined text-sm">devices</span>
                 IT Hardware
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest">
                 <span className="material-symbols-outlined text-sm">calendar_month</span>
                 Assigned Oct 24, 2024
               </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10 border-b border-slate-100 dark:border-slate-800">
           <div className="space-y-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial Number</p>
             <div className="flex items-center gap-3 group">
               <p className="text-xl font-black dark:text-white font-mono tracking-tight">{asset.serialNumber || 'N/A'}</p>
               <button onClick={handleCopySN} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-300 hover:text-blue-600">
                 <span className="material-symbols-outlined text-lg">content_copy</span>
               </button>
             </div>
           </div>

           <div className="space-y-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Specification</p>
             <p className="text-lg font-bold dark:text-white leading-snug">{asset.description?.split(',')[0] || 'Standard Configuration'}</p>
           </div>

           <div className="space-y-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Location</p>
             <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
               <span className="material-symbols-outlined text-sm">location_on</span>
               <p className="text-lg">{asset.location}</p>
             </div>
           </div>

           <div className="space-y-2">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reported Condition</p>
             <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
               <span className="material-symbols-outlined text-sm">check_circle</span>
               <p className="text-lg">{asset.condition}</p>
             </div>
           </div>
        </div>

        <div className="p-8 md:p-12 bg-slate-50/50 dark:bg-slate-950/20 space-y-10">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-400">gavel</span>
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Terms of Custody</h3>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed space-y-4">
                <p>By clicking "Confirm Receipt", I acknowledge that I have received the asset described above. I agree to maintain the equipment in good working condition and report any loss, theft, or damage immediately to the IT department.</p>
                <p>I understand that this asset is the property of AssetTrackPro Inc. and must be returned upon termination of employment or upon request by management. Use of this equipment must comply with the corporate Acceptable Use Policy.</p>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                REQUEST GENERATED: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()} • IP: 192.168.1.45 • REF: {asset.id}
              </p>
           </div>

           <div className="space-y-4 pt-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draw Digital Signature</p>
                <button onClick={clearSignature} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline underline-offset-4">Clear Canvas</button>
              </div>
              <div className="relative group">
                <canvas 
                  ref={canvasRef}
                  width={800}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-40 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl cursor-crosshair shadow-inner"
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <p className="text-2xl font-black uppercase tracking-[0.5em] text-slate-300">Sign Here</p>
                  </div>
                )}
              </div>
           </div>
        </div>

        <div className="p-8 md:p-12 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-6">
           <button 
             onClick={() => onReportIssue(asset.id)}
             className="w-full sm:w-auto px-10 py-5 rounded-2xl border-2 border-red-100 dark:border-red-900/30 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 transition-all flex items-center justify-center gap-3"
           >
             <span className="material-symbols-outlined text-lg">warning</span>
             Report Issue / Wrong Item
           </button>
           <button 
             onClick={handleConfirmAsset}
             disabled={!hasSigned || isSubmitting}
             className={`w-full sm:w-auto px-16 py-5 rounded-2xl bg-[#1985f0] text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 ${(!hasSigned || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:bg-blue-600'}`}
           >
             <span className="material-symbols-outlined text-lg">{isSubmitting ? 'hourglass_empty' : 'thumb_up'}</span>
             {isSubmitting ? 'Confirming...' : 'Confirm Receipt'}
           </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAssetTracker } from '../AssetTrackerContext';

export const AssetConsentDocument: React.FC = () => {
  const { assets, refreshAll } = useAssetTracker();
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Allow Admins/HR with link to view but we should handle the absence of local token or permissions if this was a standalone view. 
  // For now, this is part of the AssetTracker app so it relies on context.
  const asset = assets.find(a => a.id === assetId);

  if (!asset) return (
      <div className="max-w-5xl mx-auto py-20 text-center">
          <h2 className="text-2xl font-bold">Asset Document Not Found or Loading...</h2>
      </div>
  );

  const handleCopySN = () => {
    if (asset.serialNumber) {
      navigator.clipboard.writeText(asset.serialNumber);
    }
  };

  const handleSendToHR = async () => {
    setIsSubmitting(true);
    let pdfBase64 = undefined;
    
    try {
      // 1. Generate PDF exactly from the document view
      const docElement = document.getElementById('consent-document');
      if (docElement) {
        // Temporarily hide action buttons so they don't appear in the PDF
        // Temporarily hide action buttons so they don't appear in the PDF
        const actionButtons = docElement.querySelector('.action-buttons-container') as HTMLElement;
        if (actionButtons) actionButtons.style.display = 'none';

        // Strip rounding for a clean PDF edge
        docElement.style.setProperty('border-radius', '0', 'important');
        docElement.style.setProperty('border', 'none', 'important');
        docElement.style.setProperty('box-shadow', 'none', 'important');

        // Force Light Mode by completely ripping out Tailwind 'dark:' utility classes and injecting explicit colors
        const allElements = [docElement, ...Array.from(docElement.querySelectorAll('*'))];
        const originalClasses = new Map<Element, string>();
        
        const style = document.createElement('style');
        style.innerHTML = `* { transition: none !important; }`;
        document.head.appendChild(style);

        allElements.forEach(el => {
            if (typeof el.className === 'string') {
                originalClasses.set(el, el.className);
                el.className = el.className.split(' ').filter(c => !c.startsWith('dark:')).join(' ');
            }
            
            // Hard override text colors to ensure they aren't white
            if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P') {
                (el as HTMLElement).style.setProperty('color', '#0f172a', 'important'); // slate-900
            }
            // For lighter grey subtitles that might become invisible on white backgrounds
            if (el.tagName === 'SPAN' && typeof el.className === 'string' && el.className.includes('text-slate-400')) {
                (el as HTMLElement).style.setProperty('color', '#64748b', 'important'); // slate-500
            }
        });

        // Hardcode the container explicitly to white
        docElement.style.setProperty('background-color', '#ffffff', 'important');
        
        // Let the browser paint the light mode frame without transitions
        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(docElement, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff' 
        });

        // Restore everything perfectly
        allElements.forEach(el => {
            const orig = originalClasses.get(el);
            if (orig !== undefined) el.className = orig;
            (el as HTMLElement).style.removeProperty('color');
        });
        document.head.removeChild(style);

        if (actionButtons) actionButtons.style.display = ''; // restore
        docElement.style.removeProperty('border-radius');
        docElement.style.removeProperty('border');
        docElement.style.removeProperty('box-shadow');

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdfBase64 = pdf.output('datauristring').split(',')[1]; // Get exactly the base64 content
      }

      // 2. Send to backend
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${asset.id}/send-hr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ pdfBase64 })
      });
      if (!res.ok) throw new Error('Failed to dispatch email');
      await refreshAll?.();
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Failed to send email to HR. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 pb-20 animate-fade-in">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-xl">fact_check</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight dark:text-white">Asset Custody Document</h1>
        </div>
        <p className="text-lg text-slate-500 dark:text-slate-400 font-bold max-w-3xl leading-relaxed">
          This is the digitally signed custody agreement for the asset assigned to you.
        </p>
      </div>

      <div id="consent-document" className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-colors">
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
                <span className="px-5 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-900/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[10px]">check_circle</span>
                  Signed & Confirmed
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
                <p>I acknowledge that I have received the asset described above. I agree to maintain the equipment in good working condition and report any loss, theft, or damage immediately to the IT department.</p>
                <p>I understand that this asset is the property of AssetTrackPro Inc. and must be returned upon termination of employment or upon request by management. Use of this equipment must comply with the corporate Acceptable Use Policy.</p>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                REF: {asset.id}
              </p>
           </div>

           <div className="space-y-4 pt-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Signature</p>
              <div className="relative group max-w-lg">
                {asset.consentSignature ? (
                    <img 
                      src={asset.consentSignature} 
                      alt="User Signature" 
                      className="w-full h-auto bg-white border-2 border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner p-2 mix-blend-multiply dark:mix-blend-normal"
                    />
                ) : (
                    <div className="w-full h-40 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center opacity-50">
                        <span className="italic text-slate-400">No signature found</span>
                    </div>
                )}
              </div>
           </div>
        </div>
        
        {/* Only show these action buttons if hasn't been submitted to HR yet */}
        {!asset.hrConsentSubmitted && (
            <div className="action-buttons-container p-8 md:p-12 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-end items-center gap-6 bg-blue-50/50 dark:bg-blue-900/10">
               <button 
                 onClick={handleSkip}
                 className="w-full sm:w-auto px-10 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 dark:hover:text-white transition-all flex items-center justify-center gap-2"
               >
                 Skip for Now
               </button>
               <button 
                 onClick={handleSendToHR}
                 disabled={isSubmitting}
                 className={`w-full sm:w-auto px-12 py-4 rounded-full bg-[#1985f0] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:bg-blue-600'}`}
               >
                 <span className="material-symbols-outlined text-lg">{isSubmitting ? 'hourglass_empty' : 'send'}</span>
                 {isSubmitting ? 'Sending...' : 'Send to HR Mail'}
               </button>
            </div>
        )}
      </div>
    </div>
  );
};

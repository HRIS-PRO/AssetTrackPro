import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAssetTracker } from '../AssetTrackerContext';

export const AssetConsentDocument: React.FC = () => {
  const { assets, refreshAll, orgSettings } = useAssetTracker();
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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
      const docElement = document.getElementById('consent-document');
      if (docElement) {
        const actionButtons = docElement.querySelector('.action-buttons-container') as HTMLElement;
        if (actionButtons) actionButtons.style.display = 'none';

        docElement.style.setProperty('border-radius', '0', 'important');
        docElement.style.setProperty('border', 'none', 'important');
        docElement.style.setProperty('box-shadow', 'none', 'important');

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
            if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P') {
                (el as HTMLElement).style.setProperty('color', '#0f172a', 'important');
            }
            if (el.tagName === 'SPAN' && typeof el.className === 'string' && el.className.includes('text-slate-400')) {
                (el as HTMLElement).style.setProperty('color', '#64748b', 'important');
            }
        });

        docElement.style.setProperty('background-color', '#ffffff', 'important');
        await new Promise(r => setTimeout(r, 100));

        const canvas = await html2canvas(docElement, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: '#ffffff' 
        });

        allElements.forEach(el => {
            const orig = originalClasses.get(el);
            if (orig !== undefined) el.className = orig;
            (el as HTMLElement).style.removeProperty('color');
        });
        if (document.head.contains(style)) document.head.removeChild(style);

        if (actionButtons) actionButtons.style.display = '';
        docElement.style.removeProperty('border-radius');
        docElement.style.removeProperty('border');
        docElement.style.removeProperty('box-shadow');

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        const pdfOutput = pdf.output('datauristring');
        pdfBase64 = pdfOutput.split(',')[1];
      }
    } catch (e) {
      console.warn("Failed to generate client PDF:", e);
    }

    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch(`/api/assets/${asset.id}/send-hr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ pdfBase64 })
      });

      if (!res.ok) throw new Error('Failed to submit HR consent');
      await refreshAll?.();
      navigate('/assets');
    } catch (err) {
      console.error(err);
      alert('Failed to send consent document to HR. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/assets');
  };

  const rawDate = (asset as any).assignedDate || (asset as any).updatedAt || (asset as any).createdAt || asset.purchaseDate;
  const formattedAssignedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4 pb-16 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight dark:text-white">Asset Custody Agreement</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed Digital Document</p>
        </div>
      </div>

      <div id="consent-document" className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col transition-colors">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full md:w-48 h-40 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center border-2 border-slate-100 dark:border-slate-700/50 shrink-0 overflow-hidden group">
             {asset.fileUrl ? (
               <img
                 src={asset.fileUrl}
                 alt={asset.name}
                 className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
               />
             ) : (
               <span className="material-symbols-outlined text-[5rem] text-slate-200 dark:text-slate-700 group-hover:scale-110 transition-transform duration-700">
                 {asset.category?.toLowerCase().includes('laptop') ? 'laptop_mac' : 'inventory_2'}
               </span>
             )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight dark:text-white leading-none mb-2">{asset.name}</h2>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Number:</span>
                   <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs font-bold text-slate-600 dark:text-slate-300">#{asset.assetNumber || asset.id}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="px-4 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-green-100 dark:border-green-900/50 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[9px]">check_circle</span>
                  Signed &amp; Confirmed
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
               <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest">
                 <span className="material-symbols-outlined text-xs">devices</span>
                 IT Hardware
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-xl text-[9px] font-black uppercase tracking-widest">
                 <span className="material-symbols-outlined text-xs">calendar_month</span>
                 Assigned {formattedAssignedDate}
               </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 border-b border-slate-100 dark:border-slate-800">
           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial Number</p>
             <div className="flex items-center gap-2 group">
               <p className="text-base font-black dark:text-white font-mono tracking-tight">{asset.serialNumber || 'N/A'}</p>
               <button onClick={handleCopySN} className="p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-300 hover:text-blue-600">
                 <span className="material-symbols-outlined text-base">content_copy</span>
               </button>
             </div>
           </div>

           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model Specification</p>
             <p className="text-base font-bold dark:text-white leading-snug">{asset.description?.split(',')[0] || 'Standard Configuration'}</p>
           </div>

           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Location</p>
             <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold">
               <span className="material-symbols-outlined text-sm">location_on</span>
               <p className="text-base">{asset.location}</p>
             </div>
           </div>

           <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reported Condition</p>
             <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-bold">
               <span className="material-symbols-outlined text-sm">check_circle</span>
               <p className="text-base">{asset.condition}</p>
             </div>
           </div>
        </div>

        <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/20 space-y-6">
           <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-sm">gavel</span>
                <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Terms of Custody</h3>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed space-y-3">
                <p>I acknowledge that I have received the asset described above. I agree to maintain the equipment in good working condition and report any loss, theft, or damage immediately to the IT department.</p>
                <p>I understand that this asset is the property of {orgSettings.orgName} and must be returned upon termination of employment or upon request by management. Use of this equipment must comply with the corporate Acceptable Use Policy.</p>
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                REF: {asset.id}
              </p>
           </div>

           <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Signature</p>
              <div className="relative group max-w-md">
                {asset.consentSignature ? (
                    <img 
                      src={asset.consentSignature} 
                      alt="User Signature" 
                      className="w-full h-auto bg-white border-2 border-slate-200 dark:border-slate-800 rounded-xl shadow-inner p-2 mix-blend-multiply dark:mix-blend-normal"
                    />
                ) : (
                    <div className="w-full h-32 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center opacity-50">
                        <span className="italic text-slate-400 text-sm">No signature found</span>
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
                 onClick={() => setShowConfirmModal(true)}
                 disabled={isSubmitting}
                 className={`w-full sm:w-auto px-12 py-4 rounded-full bg-[#1985f0] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:bg-blue-600'}`}
               >
                 <span className="material-symbols-outlined text-lg">{isSubmitting ? 'hourglass_empty' : 'check_circle'}</span>
                 {isSubmitting ? 'Confirming...' : 'Confirm Consent'}
               </button>
            </div>
        )}
      </div>

      {/* Confirm Consent Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] p-8 md:p-10 text-center space-y-6 shadow-2xl border border-blue-500/20 animate-fade-in">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/10">
              <span className="material-symbols-outlined text-3xl font-black">verified</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tight dark:text-white">Confirm Consent?</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                This will finalize your asset custody sign-off and transmit the executed agreement to the HR team.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  handleSendToHR();
                }}
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <span className="material-symbols-outlined animate-spin text-base">sync</span> : <span className="material-symbols-outlined text-base">check_circle</span>}
                Confirm Consent
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-xs tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

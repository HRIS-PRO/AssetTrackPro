
import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssetTracker } from '../AssetTrackerContext';

interface AssetConsentProps {
  onReportIssue: (assetId: string) => void;
}

export const AssetConsent: React.FC<AssetConsentProps> = ({ onReportIssue }) => {
  const { assets, refreshAll, orgSettings } = useAssetTracker();
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedSignaturePng, setUploadedSignaturePng] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = assets.find(a => a.id === assetId) || assets[0];

  useEffect(() => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          ctx.lineWidth = 3;
          const isDark = document.documentElement.classList.contains('dark');
          ctx.strokeStyle = isDark ? '#818CF8' : '#0F172A';
        }
      }
    }
  }, [signatureMode]);

  if (!asset) return null;

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? '#818CF8' : '#0F172A';
    ctx.lineWidth = 3;

    const { x, y } = getCanvasPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      setUploadedSignaturePng(null);
      if (sigFileInputRef.current) sigFileInputRef.current.value = '';
    }
    setHasSigned(false);
    setUploadError(null);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate size: must be less than 1MB (1024 * 1024 bytes)
    const MAX_SIZE_BYTES = 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`File size exceeds the 1MB limit (Current: ${sizeMb}MB). Please upload a smaller signature image.`);
      return;
    }

    // Validate image format
    if (!file.type.startsWith('image/')) {
      setUploadError("Invalid file type. Please upload a valid PNG or JPG image.");
      return;
    }

    setIsConverting(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create an offscreen canvas to transform any image (JPG/JPEG/PNG) into a standardized PNG.
        // Cap pixel dimensions before re-encoding — PNG is lossless, so a large photo (e.g. a
        // phone-camera shot of a signature) can balloon well past the original file size otherwise.
        const MAX_DIMENSION = 1000;
        let targetWidth = img.naturalWidth || 800;
        let targetHeight = img.naturalHeight || 400;
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
          const scale = Math.min(MAX_DIMENSION / targetWidth, MAX_DIMENSION / targetHeight);
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const pngDataUrl = tempCanvas.toDataURL('image/png');

          // Verify the actual converted output still meets the promised limit —
          // the earlier size check only covers the original (pre-conversion) file.
          const base64Length = pngDataUrl.split(',')[1]?.length || 0;
          const approxBytes = Math.ceil((base64Length * 3) / 4);
          if (approxBytes > MAX_SIZE_BYTES) {
            setUploadError(`Converted PNG is ${(approxBytes / (1024 * 1024)).toFixed(2)}MB, which exceeds the 1MB limit. Please upload a smaller or simpler signature image.`);
          } else {
            setUploadedSignaturePng(pngDataUrl);
            setHasSigned(true);
          }
        } else {
          setUploadError("Failed to process image transformation.");
        }
        setIsConverting(false);
      };

      img.onerror = () => {
        setUploadError("Could not load signature image. Ensure it is a valid image file.");
        setIsConverting(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setUploadError("Error reading signature file.");
      setIsConverting(false);
    };

    reader.readAsDataURL(file);
  };

  const handleCopySN = () => {
    if (asset.serialNumber) {
      navigator.clipboard.writeText(asset.serialNumber);
    }
  };

  const handleConfirmAsset = async () => {
    setIsSubmitting(true);

    let signatureData = null;
    if (signatureMode === 'draw' && canvasRef.current && hasSigned) {
      signatureData = canvasRef.current.toDataURL('image/png');
    } else if (signatureMode === 'upload' && uploadedSignaturePng) {
      signatureData = uploadedSignaturePng;
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
      await refreshAll?.();
      navigate(`/consent/${asset.id}/document`);
    } catch (err) {
      console.error(err);
      alert('Failed to confirm asset receipt. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };



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
          <div className="relative w-full md:w-80 h-64 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex items-center justify-center border-2 border-slate-100 dark:border-slate-700/50 shrink-0 overflow-hidden group">
             {asset.fileUrl ? (
               <img
                 src={asset.fileUrl}
                 alt={asset.name}
                 className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
               />
             ) : (
               <span className="material-symbols-outlined text-[8rem] text-slate-200 dark:text-slate-700 group-hover:scale-110 transition-transform duration-700">
                 {asset.category?.toLowerCase().includes('laptop') ? 'laptop_mac' : 'inventory_2'}
               </span>
             )}
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
                <p>I understand that this asset is the property of {orgSettings.orgName} and must be returned upon termination of employment or upon request by management. Use of this equipment must comply with the corporate Acceptable Use Policy.</p>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                REQUEST GENERATED: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()} • IP: 192.168.1.45 • REF: {asset.id}
              </p>
           </div>

           <div className="space-y-6 pt-4 border-t border-slate-200/50 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest dark:text-white">Digital Signature</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Required format: PNG or JPG (auto-converted to PNG) • Max size: 1MB</p>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-200/50 dark:bg-slate-800/80 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => { setSignatureMode('draw'); setUploadError(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${signatureMode === 'draw' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-sm">draw</span>
                    Draw
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSignatureMode('upload'); setUploadError(null); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${signatureMode === 'upload' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                  >
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Upload Image
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-2 animate-fade-in">
                  <span className="material-symbols-outlined text-base">error</span>
                  {uploadError}
                </div>
              )}

              {signatureMode === 'draw' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draw your signature in the box below</span>
                    {hasSigned && (
                      <button onClick={clearSignature} type="button" className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline underline-offset-4 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">clear</span>
                        Clear Canvas
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={180}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-44 touch-none bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl cursor-crosshair shadow-inner"
                    />
                    {!hasSigned && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                        <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400">Sign Here</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    ref={sigFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />

                  {uploadedSignaturePng ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Signature Uploaded & Transformed (PNG format)
                        </span>
                        <button onClick={clearSignature} type="button" className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">delete</span>
                          Remove Signature
                        </button>
                      </div>
                      <div className="p-4 bg-white dark:bg-slate-900 border-2 border-emerald-500/50 rounded-2xl shadow-inner flex items-center justify-center max-h-44 overflow-hidden">
                        <img src={uploadedSignaturePng} alt="Uploaded Signature" className="max-h-36 object-contain" />
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => sigFileInputRef.current?.click()}
                      className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 bg-white/80 dark:bg-slate-900/80 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.01] group"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl">file_upload</span>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                          {isConverting ? 'Transforming image to PNG...' : 'Click to Upload Signature File'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          PNG or JPG format • Under 1MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
             className={`w-full sm:w-auto px-16 py-5 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all flex items-center justify-center gap-3 ${(!hasSigned || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:bg-blue-600'}`}
           >
             <span className="material-symbols-outlined text-lg">{isSubmitting ? 'hourglass_empty' : 'thumb_up'}</span>
             {isSubmitting ? 'Confirming...' : 'Confirm Receipt'}
           </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAssetTracker, ByodSignedRecord } from '../AssetTrackerContext';
import { useToast } from './Toast';

export const ByodConsent: React.FC = () => {
  const { team, user, refreshAll, executeByodConsent, signedByodRecords, categories } = useAssetTracker();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const targetUser = team.find(u => u.id === userId) || user || { id: 'u1', name: 'Employee', email: 'employee@hris.pro', department: 'Operations' };

  // Check if target user has already signed a BYOD policy consent
  const existingSignedRecord = signedByodRecords[targetUser.id];

  // Fetch available hardware options directly from asset categories
  const availableHardwareOptions = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map(c => c.name);
    }
    return [
      'Laptop',
      'Mobile Device',
      'Monitor',
      'Keyboard',
      'Mouse',
      'AV Equipment',
      'Office Furniture',
      'Networking'
    ];
  }, [categories]);

  // Device selection states
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Signature states
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [hasSigned, setHasSigned] = useState(false);
  const [uploadedSignaturePng, setUploadedSignaturePng] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Configure high-contrast Canvas stroke for dark & light mode
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
          ctx.strokeStyle = isDark ? '#818CF8' : '#1E1B4B';
        }
      }
    }
  }, [signatureMode]);

  const toggleDevice = (device: string) => {
    setSelectedDevices(prev => 
      prev.includes(device) ? prev.filter(d => d !== device) : [...prev, device]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDevices.length === availableHardwareOptions.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices([...availableHardwareOptions]);
    }
  };

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
    ctx.strokeStyle = isDark ? '#818CF8' : '#1E1B4B';
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

    const MAX_SIZE_BYTES = 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setUploadError(`File size exceeds 1MB limit (Current: ${sizeMb}MB). Please upload a smaller image.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError("Invalid file type. Please upload a PNG or JPG image.");
      return;
    }

    setIsConverting(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
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
          setUploadedSignaturePng(pngDataUrl);
          setHasSigned(true);
        } else {
          setUploadError("Failed to process image signature.");
        }
        setIsConverting(false);
      };

      img.onerror = () => {
        setUploadError("Could not load signature image.");
        setIsConverting(false);
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleExecuteAgreement = async () => {
    if (!hasSigned || isSubmitting) return;
    setIsSubmitting(true);

    let signatureData: string | null = null;
    if (signatureMode === 'draw' && canvasRef.current && hasSigned) {
      signatureData = canvasRef.current.toDataURL('image/png');
    } else if (signatureMode === 'upload' && uploadedSignaturePng) {
      signatureData = uploadedSignaturePng;
    }

    const record: ByodSignedRecord = {
      id: `BYOD-${Date.now().toString(36).toUpperCase()}`,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      department: targetUser.department || 'Operations',
      selectedDevices: selectedDevices.length > 0 ? selectedDevices : ['General Personal Hardware'],
      signatureData,
      signedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).toUpperCase()
    };

    try {
      executeByodConsent(record);
      addToast({
        title: 'BYOD Agreement Executed',
        message: `BYOD Policy consent successfully signed for ${selectedDevices.length || 1} device category(ies).`,
        type: 'success'
      });
      await refreshAll?.();
      navigate('/consent-management');
    } catch (err) {
      console.error(err);
      addToast({
        title: 'Error',
        message: 'Failed to execute BYOD agreement. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already signed, display the Signed BYOD Consent Document view
  if (existingSignedRecord) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 py-6 pb-20 animate-fade-in text-white">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <span className="material-symbols-outlined text-xl">verified</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Signed BYOD Policy Consent</h1>
          </div>
          <p className="text-sm font-semibold text-slate-400 max-w-3xl leading-relaxed">
            Official executed Bring Your Own Device agreement for <span className="text-emerald-400 font-bold">{existingSignedRecord.userName}</span>.
          </p>
        </div>

        <div className="bg-[#0F172A] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 md:p-10 space-y-8">
          {/* Header Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">BYOD REGISTRATION ID</span>
              <p className="text-xl font-black text-indigo-400 font-mono mt-0.5">{existingSignedRecord.id}</p>
            </div>
            <span className="px-5 py-2 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Signed & Executed
            </span>
          </div>

          {/* Registered Categories */}
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">REGISTERED PERSONAL HARDWARE CATEGORIES</span>
            <div className="flex flex-wrap gap-2.5">
              {existingSignedRecord.selectedDevices.map(dev => (
                <span key={dev} className="px-4 py-2 bg-[#162032] border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-indigo-400">devices</span>
                  {dev}
                </span>
              ))}
            </div>
          </div>

          {/* Executed Legal Terms */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">EXECUTED BYOD POLICY TERMS</span>
            <div className="p-6 rounded-2xl bg-[#162032]/80 border border-slate-800/80 text-xs font-medium text-slate-300 leading-relaxed space-y-4 shadow-inner">
              <p>
                “The Employee hereby expressly consents to the registration, connection, and monitoring of their personal Device on the Company’s Network for business-related purposes. The Employee acknowledges and agrees that the Company may install mandatory mobile device management (MDM) software, enforce encryption standards, and collect technical data—including network traffic logs, hardware identifiers, and security status—solely to protect corporate data and ensure IT compliance.
              </p>
              <p>
                Furthermore, the Employee grants the Company explicit authorization to remotely wipe all company-owned data, applications, and emails from the Device in the event of loss, theft, or termination of employment, and releases the Company from any liability for the accidental loss of personal data during such security actions.”
              </p>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              EXECUTED ON: {existingSignedRecord.signedAt} • EMPLOYEE: {existingSignedRecord.userName} ({existingSignedRecord.userEmail})
            </p>
          </div>

          {/* Executed Signature View */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">EXECUTED DIGITAL SIGNATURE</span>
            <div className="p-4 bg-[#162032] border-2 border-slate-800 rounded-2xl shadow-inner max-w-md flex items-center justify-center">
              {existingSignedRecord.signatureData ? (
                <img src={existingSignedRecord.signatureData} alt="Executed Signature" className="max-h-32 object-contain filter invert" />
              ) : (
                <span className="text-xs font-bold text-slate-500 italic">Digital Sign-off Completed</span>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/consent-management')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#162032] border border-slate-800 text-slate-300 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
            >
              BACK TO CONSENT MANAGEMENT
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">print</span>
              PRINT AGREEMENT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 pb-20 animate-fade-in text-white">
      {/* Page Title Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="material-symbols-outlined text-xl">devices</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">BYOD Policy Consent</h1>
        </div>
        <p className="text-sm font-semibold text-slate-400 max-w-3xl leading-relaxed">
          Official Bring Your Own Device agreement for <span className="text-indigo-400 font-bold">{targetUser.name}</span>. Register your personal hardware and accept corporate IT security terms.
        </p>
      </div>

      {/* Main Form Container */}
      <div className="bg-[#0F172A] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 md:p-10 space-y-8">
        
        {/* 1. SELECT PERSONAL DEVICES TO CONNECT */}
        <div className="space-y-3" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-lg">devices</span>
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              SELECT PERSONAL DEVICES TO CONNECT
            </label>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-5 py-4 bg-[#162032] border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-xs font-bold text-slate-300 flex items-center justify-between transition-all cursor-pointer"
            >
              <span>
                {selectedDevices.length === 0
                  ? 'Select personal device categories...'
                  : `${selectedDevices.join(', ')} (${selectedDevices.length} Selected)`}
              </span>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Custom Devices Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#162032] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">AVAILABLE HARDWARE CATEGORIES</span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {selectedDevices.length === availableHardwareOptions.length ? 'DESELECT ALL' : 'SELECT ALL'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {availableHardwareOptions.map(device => {
                    const isChecked = selectedDevices.includes(device);
                    return (
                      <div
                        key={device}
                        onClick={() => toggleDevice(device)}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isChecked ? 'bg-indigo-950/40 text-white' : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 bg-slate-900/60'
                        }`}>
                          {isChecked && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                        </div>
                        <span className="text-xs font-bold">{device}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. BYOD POLICY CONSENT TERMS */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-lg">gavel</span>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">
              BYOD POLICY CONSENT TERMS
            </h2>
          </div>

          <p className="text-xs font-semibold text-slate-400 leading-relaxed">
            By executing this agreement, you consent to connect your personal device to the corporate network and adhere to remote device management, security compliance, and security wipe protocols.
          </p>

          {/* Quoted Policy Terms Box */}
          <div className="p-6 rounded-2xl bg-[#162032]/80 border border-slate-800/80 text-xs font-medium text-slate-300 italic leading-relaxed space-y-4 shadow-inner">
            <p className="not-italic">
              “The Employee hereby expressly consents to the registration, connection, and monitoring of their personal Device on the Company’s Network for business-related purposes. The Employee acknowledges and agrees that the Company may install mandatory mobile device management (MDM) software, enforce encryption standards, and collect technical data—including network traffic logs, hardware identifiers, and security status—solely to protect corporate data and ensure IT compliance.
            </p>
            <p className="not-italic">
              Furthermore, the Employee grants the Company explicit authorization to remotely wipe all company-owned data, applications, and emails from the Device in the event of loss, theft, or termination of employment, and releases the Company from any liability for the accidental loss of personal data during such security actions.”
            </p>
          </div>
        </div>

        {/* 3. DIGITAL SIGNATURE SECTION */}
        <div className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">DRAW DIGITAL SIGNATURE</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                Sign directly on the canvas or upload a signature image file
              </p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-[#162032] border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => { setSignatureMode('draw'); setUploadError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  signatureMode === 'draw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">draw</span>
                Draw
              </button>
              <button
                type="button"
                onClick={() => { setSignatureMode('upload'); setUploadError(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  signatureMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload Image
              </button>
            </div>
          </div>

          {uploadError && (
            <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-400 text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              {uploadError}
            </div>
          )}

          {signatureMode === 'draw' ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Use mouse or touch to sign inside the canvas
                </span>
                {hasSigned && (
                  <button
                    onClick={clearSignature}
                    type="button"
                    className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">clear</span>
                    CLEAR CANVAS
                  </button>
                )}
              </div>
              
              {/* Canvas Box with High Contrast Dark Background & Bright Signature Stroke */}
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
                  className="w-full h-44 touch-none bg-[#162032] border-2 border-slate-800 rounded-2xl cursor-crosshair shadow-inner"
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <p className="text-3xl font-black uppercase tracking-[0.4em] text-indigo-300">SIGN HERE</p>
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
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Signature Uploaded (PNG format)
                    </span>
                    <button onClick={clearSignature} type="button" className="text-[10px] font-black text-red-400 hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">delete</span>
                      Remove Signature
                    </button>
                  </div>
                  <div className="p-4 bg-[#162032] border-2 border-emerald-500/50 rounded-2xl shadow-inner flex items-center justify-center max-h-44 overflow-hidden">
                    <img src={uploadedSignaturePng} alt="Uploaded Signature" className="max-h-36 object-contain filter invert" />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => sigFileInputRef.current?.click()}
                  className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500 bg-[#162032]/60 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:scale-[1.01] group"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">file_upload</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-white uppercase tracking-wider">
                      {isConverting ? 'Processing image signature...' : 'Click to Upload Signature File'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      PNG or JPG format • Under 1MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. FOOTER ACTIONS */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/consent-management')}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#162032] border border-slate-800 text-slate-400 hover:text-white font-black text-xs uppercase tracking-widest transition-all"
          >
            CANCEL
          </button>
          
          <button
            type="button"
            onClick={handleExecuteAgreement}
            disabled={!hasSigned || isSubmitting}
            className={`w-full sm:w-auto px-12 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 ${
              (!hasSigned || isSubmitting) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
            }`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                EXECUTING...
              </>
            ) : (
              'EXECUTE BYOD AGREEMENT'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

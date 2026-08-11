import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Asset } from '../types';
import { useAssetTracker } from '../AssetTrackerContext';

interface DigitalTagProps {
  asset: Asset;
  onClose: () => void;
}

// Resolves the public scan URL for an asset (HashRouter -> /#/scan/<id>).
export const getScanUrl = (assetId: string) =>
  `${window.location.origin}${window.location.pathname}#/scan/${assetId}`;

export const DigitalTag: React.FC<DigitalTagProps> = ({ asset, onClose }) => {
  const { allEmployees, team } = useAssetTracker();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const custodianName = useMemo(() => {
    if (!asset.assignedTo) return 'Unassigned';
    const u = allEmployees.find((e: any) => e.id === asset.assignedTo || e.userId === asset.assignedTo)
      || team.find((t: any) => t.id === asset.assignedTo);
    if (!u) return 'Unassigned';
    return u.name || (u.firstName ? `${u.firstName} ${u.surname || u.lastName || ''}`.trim() : u.email) || 'Unassigned';
  }, [asset.assignedTo, allEmployees, team]);

  const displayNumber = asset.assetNumber || asset.id;

  // The QR payload carries BOTH a readable snapshot AND the live scan URL.
  const qrPayload = useMemo(() => {
    return [
      'NOLT Finance Asset Tag',
      `No: ${displayNumber}`,
      `Name: ${asset.name}`,
      `Serial: ${asset.serialNumber || 'N/A'}`,
      `Custodian: ${custodianName}`,
      `Location: ${asset.location || 'N/A'}`,
      `Status: ${asset.status}`,
      `View: ${getScanUrl(asset.id)}`,
    ].join('\n');
  }, [asset, displayNumber, custodianName]);

  useEffect(() => {
    QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M', margin: 1, width: 480 })
      .then(setQrDataUrl)
      .catch(err => console.error('QR generation failed', err));
  }, [qrPayload]);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${displayNumber}-nolt-finance-tag.png`;
    link.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl) return;
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    win.document.write(`
      <html><head><title>${displayNumber} - NOLT Finance Asset Tag</title>
      <style>
        body{font-family:system-ui,sans-serif;text-align:center;padding:32px;margin:0;}
        .card{border:3px solid #0f172a;border-radius:24px;padding:28px;display:inline-block;max-width:360px;}
        .brand{font-weight:900;font-size:13px;letter-spacing:3px;color:#2563eb;margin-bottom:12px;text-transform:uppercase;}
        img{width:240px;height:240px;}
        .num{font-weight:800;font-size:18px;letter-spacing:1px;margin-top:12px;}
        .name{font-weight:700;font-size:15px;color:#334155;margin-top:4px;}
        .meta{font-size:12px;color:#64748b;margin-top:10px;line-height:1.6;}
      </style></head>
      <body onload="window.print();window.close();">
        <div class="card">
          <div class="brand">NOLT Finance</div>
          <img src="${qrDataUrl}" />
          <div class="num">${displayNumber}</div>
          <div class="name">${asset.name}</div>
          <div class="meta">Serial: ${asset.serialNumber || 'N/A'}<br/>Custodian: ${custodianName}<br/>Location: ${asset.location || 'N/A'}</div>
        </div>
      </body></html>`);
    win.document.close();
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 border border-slate-200 dark:border-slate-800 animate-fade-in">
        <div className="text-center space-y-1 mb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-600 dark:text-blue-400">NOLT FINANCE • ASSET TAG</p>
          <h2 className="text-2xl font-black tracking-tight dark:text-white">{asset.name}</h2>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-[2rem] p-8 flex flex-col items-center border-2 border-slate-100 dark:border-slate-800">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Asset QR code" className="w-56 h-56 rounded-2xl" />
          ) : (
            <div className="w-56 h-56 rounded-2xl flex items-center justify-center text-slate-300">
              <span className="material-symbols-outlined text-6xl animate-pulse">qr_code_2</span>
            </div>
          )}
          <p className="mt-5 text-xl font-black tracking-widest dark:text-white">{displayNumber}</p>
          <div className="mt-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest space-y-1">
            <p>Serial: {asset.serialNumber || 'N/A'}</p>
            <p>Custodian: {custodianName}</p>
            <p>Location: {asset.location || 'N/A'}</p>
          </div>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-400 mt-4 leading-relaxed">
          Scan to view live asset details. The code embeds a snapshot and a link to the public scan page.
        </p>

        <div className="flex gap-3 mt-8">
          <button onClick={handleDownload} disabled={!qrDataUrl} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">download</span> Download
          </button>
          <button onClick={handlePrint} disabled={!qrDataUrl} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">print</span> Print Tag
          </button>
        </div>
        <button onClick={onClose} className="w-full mt-3 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600">Close</button>
      </div>
    </div>,
    document.body
  );
};

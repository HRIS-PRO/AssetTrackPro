import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PublicAsset {
  id: string;
  assetNumber?: string;
  name: string;
  category?: string;
  serialNumber?: string;
  status?: string;
  location?: string;
  department?: string;
  condition?: string;
  purchaseDate?: string;
  custodianName?: string | null;
  fileUrl?: string | null;
}

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
    LOST: 'bg-red-100 text-red-700',
    DECOMMISSIONED: 'bg-slate-200 text-slate-600',
    IDLE: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${map[status || ''] || 'bg-slate-100 text-slate-600'}`}>
      {status || 'Unknown'}
    </span>
  );
};

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="flex flex-col gap-1 py-4 border-b border-slate-100 dark:border-slate-800">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <span className="text-sm font-bold text-slate-900 dark:text-white">{value || 'N/A'}</span>
  </div>
);

export const ScanView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<PublicAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/public/assets/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Asset not found' : 'Failed to load asset');
        return res.json();
      })
      .then(setAsset)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    pdf.save(`${asset?.assetNumber || asset?.id || 'asset'}-details.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="material-symbols-outlined text-blue-600 text-3xl">inventory_2</span>
          <span className="text-xl font-black tracking-tight dark:text-white">AssetTrackPro</span>
        </div>

        {loading && (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-5xl animate-pulse">progress_activity</span>
            <p className="mt-3 font-bold text-sm">Loading asset…</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center border border-slate-200 dark:border-slate-800">
            <span className="material-symbols-outlined text-5xl text-red-400">error</span>
            <p className="mt-4 font-black text-lg dark:text-white">{error}</p>
            <p className="mt-1 text-sm font-bold text-slate-400">This asset tag could not be resolved.</p>
          </div>
        )}

        {!loading && asset && (
          <>
            <div ref={cardRef} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800">
              {asset.fileUrl && (
                <img
                  src={asset.fileUrl}
                  crossOrigin="anonymous"
                  alt={asset.name}
                  className="w-full h-56 object-cover rounded-3xl mb-8 border border-slate-100 dark:border-slate-800"
                />
              )}
              <div className="flex items-start justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-1">{asset.assetNumber || asset.id}</p>
                  <h1 className="text-3xl font-black tracking-tight dark:text-white leading-tight">{asset.name}</h1>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{asset.category || 'Uncategorized'}</p>
                </div>
                <StatusBadge status={asset.status} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                <Field label="Current Custodian" value={asset.custodianName} />
                <Field label="Serial Number" value={asset.serialNumber} />
                <Field label="Location" value={asset.location} />
                <Field label="Department" value={asset.department} />
                <Field label="Condition" value={asset.condition} />
                <Field label="Purchase Date" value={asset.purchaseDate} />
              </div>
            </div>

            <button
              onClick={handleExport}
              className="w-full mt-6 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">picture_as_pdf</span>
              Export Details (PDF)
            </button>
          </>
        )}

        <p className="text-center text-[10px] font-bold text-slate-400 mt-8 uppercase tracking-widest">
          Verified Asset Record · AssetTrackPro
        </p>
      </div>
    </div>
  );
};

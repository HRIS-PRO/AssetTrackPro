
import React, { useState, useLayoutEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, User, AssetReport } from './types';
import { MOCK_USERS } from './constants';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AssetManagement } from './components/Assets';
import { Requests } from './components/Requests';
import { Audits } from './components/Audits';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { Reports } from './components/Reports';
import { RequestAssetModal } from './components/RequestAssetModal';
import { ReportProblemModal } from './components/ReportProblemModal';
import { AssetConsent } from './components/AssetConsent';
import { AssetConsentDocument } from './components/AssetConsentDocument';
import { ToastProvider, useToast } from './components/Toast';
import { useReportSocket } from './hooks/useReportSocket';
import { ReportStatus, EquipmentRequest } from './types';
import { AssetTrackerProvider, useAssetTracker } from './AssetTrackerContext';

const AppContent: React.FC = () => {
  const { 
    user, setUser, assets, team, activities,
    setRequests, setManagedRequests, setFaultyReports,
    setManagedReports, loading, refreshAll
  } = useAssetTracker();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<'request' | 'report' | null>(null);
  const [modalInitialAssetId, setModalInitialAssetId] = useState<string | undefined>();

  const [isDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useLayoutEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useLayoutEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('asset_track_token');
    localStorage.removeItem('asset_track_user');
    setShowLogoutConfirm(false);
  };

  const handleRoleChange = (role: UserRole) => {
    const newUser = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
    setUser(newUser);
  };

  const { addToast } = useToast();

  const handleReportSubmit = async (data: { assetId: string, comment: string }) => {
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit report');
      }

      addToast({
        type: 'success',
        title: 'Report Submitted',
        message: 'Your faulty asset report has been recorded successfully.'
      });
      setActiveModal(null);
      refreshAll();
    } catch (err: any) {
      console.error('Report submission error:', err);
      throw err;
    }
  };

  const handleRequestSubmit = async (data: { categoryId: string, priority: string, justification: string }) => {
    try {
      const token = localStorage.getItem('asset_track_token');
      const res = await fetch('/api/equipment-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to submit request');
      }

      addToast({
        type: 'success',
        title: 'Request Submitted',
        message: 'Your equipment request has been submitted for approval.'
      });
      setActiveModal(null);
      refreshAll();
    } catch (err: any) {
      console.error('Request submission error:', err);
      throw err;
    }
  };

  const handleReportCreated = React.useCallback((report: AssetReport) => {
    if (report.userId === user?.id) {
      setFaultyReports(prev => prev.find(r => r.id === report.id) ? prev : [report, ...prev]);
    } else {
      setManagedReports(prev => prev.find(r => r.id === report.id) ? prev : [report, ...prev]);
    }
    if (report.userId !== user?.id && (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER)) {
      addToast({
        type: 'warning',
        title: 'New Faulty Asset Report',
        message: `${report.userName || 'A user'} reported an issue with ${report.assetName || report.assetId}`
      });
    }
  }, [user?.id, user?.role, setFaultyReports, setManagedReports, addToast]);

  const handleStatusUpdated = React.useCallback((data: { id: string; status: ReportStatus; assetId: string; updatedAt: string }) => {
    const updateFn = (r: AssetReport) => r.id === data.id ? { ...r, status: data.status, updatedAt: data.updatedAt } : r;
    setFaultyReports(prev => prev.map(updateFn));
    setManagedReports(prev => prev.map(updateFn));
    addToast({
      type: data.status === ReportStatus.RESOLVED ? 'success' : 'info',
      title: 'Report Status Updated',
      message: `Report for ${data.assetId} is now ${data.status.replace('_', ' ')}`
    });
  }, [setFaultyReports, setManagedReports, addToast]);

  const handleRequestCreated = React.useCallback((request: EquipmentRequest) => {
    if (request.userId === user?.id) {
      setRequests(prev => prev.find(r => r.id === request.id) ? prev : [request, ...prev]);
    } else {
      setManagedRequests(prev => prev.find(r => r.id === request.id) ? prev : [request, ...prev]);
    }
    if (request.userId !== user?.id && (user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN_USER)) {
      addToast({
        type: 'info',
        title: 'New Equipment Request',
        message: `${request.userName} requested a ${request.categoryName}`
      });
    }
  }, [user?.id, user?.role, setRequests, setManagedRequests, addToast]);

  const handleRequestStatusUpdated = React.useCallback((request: EquipmentRequest) => {
    const updateFn = (r: EquipmentRequest) => r.id === request.id ? request : r;
    setRequests(prev => prev.map(updateFn));
    setManagedRequests(prev => prev.map(updateFn));
    if (request.userId === user?.id) {
      addToast({
        type: request.status === 'APPROVED' ? 'success' : request.status === 'REJECTED' ? 'error' : 'info',
        title: 'Request Status Updated',
        message: `Your ${request.categoryName} request is now ${request.status.replace(/_/g, ' ')}`
      });
    }
  }, [user?.id, setRequests, setManagedRequests, addToast]);

  useReportSocket({
    onReportCreated: handleReportCreated,
    onStatusUpdated: handleStatusUpdated,
    onRequestCreated: handleRequestCreated,
    onRequestStatusUpdated: handleRequestStatusUpdated
  });

  if (!user) {
    return <Auth onLogin={handleLogin} isDarkMode={isDarkMode} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar
        user={user}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onLogout={() => setShowLogoutConfirm(true)}
        isDarkMode={isDarkMode}
        onRoleChange={handleRoleChange}
      />

      <main className="flex-1 overflow-y-auto transition-all duration-300 relative">
        <Header
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          searchQuery={globalSearchQuery}
          setSearchQuery={setGlobalSearchQuery}
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {loading && <div className="fixed top-0 left-0 w-full h-1 bg-blue-500 animate-pulse z-[200]"></div>}
          <Routes>
            <Route path="/" element={<Dashboard
              user={user}
              assets={assets}
              isDarkMode={isDarkMode}
              activities={activities}
              onRequestAsset={() => setActiveModal('request')}
              onReportProblem={() => { setModalInitialAssetId(undefined); setActiveModal('report'); }}
              requests={[]} // Not used anymore as Dashboard handles its own context filtering
              managedRequests={[]}
              allReports={[]}
              managedReports={[]}
            />} />
            <Route path="/assets" element={<AssetManagement 
              onReportAsset={(id) => { setModalInitialAssetId(id); setActiveModal('report'); }}
              searchQuery={globalSearchQuery}
            />} />
            <Route path="/consent/:assetId" element={<AssetConsent
              onReportIssue={(id) => { setModalInitialAssetId(id); setActiveModal('report'); }}
            />} />
            <Route path="/consent/:assetId/document" element={<AssetConsentDocument />} />
            <Route path="/requests" element={<Requests
              onRequestAsset={() => setActiveModal('request')}
            />} />
            <Route path="/audits" element={<Audits />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      <RequestAssetModal
        isOpen={activeModal === 'request'}
        onClose={() => setActiveModal(null)}
        onSubmit={handleRequestSubmit}
      />

      <ReportProblemModal
        isOpen={activeModal === 'report'}
        onClose={() => setActiveModal(null)}
        onSubmit={handleReportSubmit}
        initialAssetId={modalInitialAssetId}
      />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-sm rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">logout</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight dark:text-white">Sign Out?</h2>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-2">Are you sure you want to log out of your session?</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleLogout} className="w-full py-4 rounded-full bg-red-500 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all">Confirm Logout</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all">Stay Logged In</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AssetTrackerProvider>
          <AppContent />
        </AssetTrackerProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;

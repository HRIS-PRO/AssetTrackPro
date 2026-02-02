
import React, { useState, useLayoutEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole, User, Asset, Activity } from './types';
import { MOCK_USERS, MOCK_ASSETS, CATEGORIES, DEPARTMENTS, MOCK_ACTIVITIES } from './constants';
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

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile-first closed state
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [team, setTeam] = useState<User[]>(MOCK_USERS);
  const [activities, setActivities] = useState<Activity[]>(MOCK_ACTIVITIES);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [departments, setDepartments] = useState<string[]>(DEPARTMENTS);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Modal Controller
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

  // Initial desktop open state
  useLayoutEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  const handleLogin = (u: User) => setUser(u);
  const handleLogout = () => {
    setUser(null);
    setShowLogoutConfirm(false);
  };

  const handleRoleChange = (role: UserRole) => {
    const newUser = MOCK_USERS.find(u => u.role === role) || MOCK_USERS[0];
    setUser(newUser);
  };

  const openReportModal = (assetId?: string) => {
    setModalInitialAssetId(assetId);
    setActiveModal('report');
  };

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
          user={user} 
          isDarkMode={isDarkMode} 
          activities={activities}
          setActivities={setActivities}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard 
              user={user} 
              assets={assets} 
              isDarkMode={isDarkMode} 
              activities={activities}
              onRequestAsset={() => setActiveModal('request')}
              onReportProblem={() => openReportModal()}
            />} />
            <Route path="/assets" element={<AssetManagement 
              user={user} 
              assets={assets} 
              setAssets={setAssets} 
              categories={categories}
              setCategories={setCategories}
              departments={departments}
              setDepartments={setDepartments}
              team={team}
              onReportAsset={openReportModal}
            />} />
            <Route path="/consent/:assetId" element={<AssetConsent 
              user={user} 
              assets={assets} 
              onReportIssue={openReportModal}
            />} />
            <Route path="/requests" element={<Requests 
              user={user} 
              onRequestAsset={() => setActiveModal('request')}
            />} />
            <Route path="/audits" element={<Audits user={user} assets={assets} />} />
            <Route path="/reports" element={<Reports user={user} assets={assets} categories={categories} departments={departments} />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/settings" element={<Settings 
              user={user} 
              team={team} 
              setTeam={setTeam} 
              categories={categories}
              setCategories={setCategories}
              departments={departments}
              setDepartments={setDepartments}
            />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>

      {/* Global Modals */}
      <RequestAssetModal 
        isOpen={activeModal === 'request'}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => console.log('Asset Request Submitted:', data)}
      />
      
      <ReportProblemModal 
        isOpen={activeModal === 'report'}
        onClose={() => setActiveModal(null)}
        onSubmit={(data) => console.log('Problem Reported:', data)}
        user={user}
        assets={assets}
        initialAssetId={modalInitialAssetId}
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative bg-white dark:bg-slate-950 w-full max-w-sm rounded-[2.5rem] shadow-2xl p-10 text-center space-y-8 border border-slate-200 dark:border-slate-800 animate-fade-in">
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
      <AppContent />
    </Router>
  );
};

export default App;

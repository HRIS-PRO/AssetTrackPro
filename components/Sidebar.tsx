
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onRoleChange: (role: UserRole) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  isOpen,
  setIsOpen,
  onLogout,
  isDarkMode,
  onRoleChange
}) => {
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'dashboard', roles: [UserRole.USER, UserRole.AUDITOR, UserRole.ADMIN_USER, UserRole.SUPER_ADMIN] },
    { label: 'Assets', path: '/assets', icon: 'inventory_2', roles: [UserRole.USER, UserRole.AUDITOR, UserRole.ADMIN_USER, UserRole.SUPER_ADMIN] },
    { label: 'Requests', path: '/requests', icon: 'shopping_cart', roles: [UserRole.USER, UserRole.AUDITOR, UserRole.ADMIN_USER, UserRole.SUPER_ADMIN] },
    { label: 'Audits', path: '/audits', icon: 'fact_check', roles: [UserRole.AUDITOR, UserRole.ADMIN_USER, UserRole.SUPER_ADMIN] },
    { label: 'Reports', path: '/reports', icon: 'bar_chart', roles: [UserRole.AUDITOR, UserRole.SUPER_ADMIN] },
    { label: 'Settings', path: '/settings', icon: 'settings', roles: [UserRole.SUPER_ADMIN] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      <aside className={`fixed lg:relative inset-y-4 left-4 h-[calc(100vh-2rem)] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-800/50 rounded-[2rem] shadow-2xl flex flex-col z-50 ${isOpen ? 'w-80 translate-x-0' : 'w-[5.5rem] -translate-x-full lg:translate-x-0'}`}>

        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute -right-4 top-10 w-8 h-8 bg-[#1985f0] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 border-2 border-white dark:border-slate-950`}
        >
          <span className="material-symbols-outlined text-sm">
            {isOpen ? 'chevron_left' : 'chevron_right'}
          </span>
        </button>

        {/* NAVIGATION LOGO (Side Panel) */}
        <div
          role="banner"
          aria-label="AssetTrackPro Home"
          className={`h-24 px-6 flex items-center transition-all ${!isOpen ? 'justify-center' : 'gap-4'} group cursor-pointer shrink-0`}
        >
          {/* Icon Container */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-all duration-300">
            <span className="material-symbols-outlined font-black !text-[26px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>

          {/* Wordmark Logic: Hidden when sidebar is minimized */}
          {isOpen && (
            <div className="flex flex-col leading-none animate-fade-in whitespace-nowrap overflow-hidden">
              <span className="font-black italic text-xl tracking-tight text-slate-900 dark:text-white uppercase">
                ASSETTRACK<span className="text-[#1985f0]">PRO</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                ENTERPRISE SUITE
              </span>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        {/* <div className={`px-4 mb-6 transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:pointer-events-none hidden lg:block' : 'opacity-100'}`}>
          <div className="p-3 bg-white/50 dark:bg-slate-950/30 rounded-2xl space-y-1 shadow-inner border border-white/20 dark:border-white/5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block pl-2">Preview Role</label>
            <div className="relative">
              <select
                value={user.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="w-full bg-transparent border-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-0 cursor-pointer appearance-none px-2 py-1 outline-none"
              >
                <option value={UserRole.SUPER_ADMIN} className="dark:bg-slate-900">Super Admin</option>
                <option value={UserRole.ADMIN_USER} className="dark:bg-slate-900">Admin User</option>
                <option value={UserRole.AUDITOR} className="dark:bg-slate-900">Auditor</option>
                <option value={UserRole.USER} className="dark:bg-slate-900">Standard User</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[16px]">unfold_more</span>
            </div>
          </div>
        </div> */}

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                title={!isOpen ? item.label : ''}
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={`flex items-center gap-4 py-3 px-4 rounded-2xl transition-all duration-200 group relative ${isActive
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm shadow-black/5 dark:shadow-black/20 font-black border border-slate-100 dark:border-slate-700/50'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200 font-bold'
                  } ${!isOpen && 'lg:justify-center'}`}
              >
                {isActive && isOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 dark:bg-blue-500 rounded-r-full"></div>
                )}
                <span className={`material-symbols-outlined text-[22px] transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span>
                <span className={`text-[13px] tracking-wide whitespace-nowrap transition-all duration-300 ${!isOpen ? 'lg:opacity-0 lg:w-0 overflow-hidden' : 'opacity-100 flex-1'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 mt-auto shrink-0 space-y-2">
          <div className="bg-white/50 dark:bg-slate-950/30 border border-white/20 dark:border-white/5 rounded-[2rem] p-2 shadow-inner">
            <div className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer group mb-1 ${!isOpen ? 'lg:justify-center lg:px-0' : ''}`}>
              <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 group-hover:border-blue-500/50 transition-colors shrink-0" alt="" />
              <div className={`overflow-hidden transition-all duration-300 ${!isOpen ? 'lg:w-0 lg:opacity-0' : 'w-full opacity-100'}`}>
                <p className="text-[13px] font-black truncate text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</p>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">{user.role.replace('_', ' ')}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 transition-all shadow-sm shadow-transparent hover:shadow-red-500/20 group ${!isOpen && 'lg:justify-center'}`}
              title="Logout"
            >
              <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">logout</span>
              <span className={`font-bold text-xs tracking-wide transition-all duration-300 ${!isOpen ? 'lg:opacity-0 lg:w-0 overflow-hidden' : 'opacity-100 flex-1 text-left'}`}>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

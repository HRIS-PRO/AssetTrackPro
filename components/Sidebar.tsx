
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

      <aside className={`fixed lg:relative inset-y-0 left-0 h-full transition-all duration-500 ease-in-out bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 ${isOpen ? 'w-80 translate-x-0' : 'w-24 -translate-x-full lg:translate-x-0'}`}>
        
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
          className={`h-20 px-6 flex items-center transition-all ${!isOpen ? 'justify-center' : 'gap-3'} group cursor-pointer shrink-0`}
        >
          {/* Icon Container */}
          <div className="w-11 h-11 bg-[#1985f0] rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#1985f0]/25 group-hover:scale-105 group-hover:shadow-[#1985f0]/40 transition-all duration-300">
            <span className="material-symbols-outlined font-black !text-[28px] fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
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
        <div className={`px-6 mb-6 transition-opacity duration-300 ${!isOpen ? 'lg:opacity-0 lg:pointer-events-none' : 'opacity-100'}`}>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-3xl space-y-2 border border-slate-200 dark:border-slate-800">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block ml-1">Preview Role</label>
            <div className="relative">
              <select 
                value={user.role}
                onChange={(e) => onRoleChange(e.target.value as UserRole)}
                className="w-full bg-transparent border-none font-bold text-sm text-slate-900 dark:text-white focus:ring-0 cursor-pointer appearance-none pr-8"
              >
                <option value={UserRole.SUPER_ADMIN} className="dark:bg-slate-900">Super Admin</option>
                <option value={UserRole.ADMIN_USER} className="dark:bg-slate-900">Admin User</option>
                <option value={UserRole.AUDITOR} className="dark:bg-slate-900">Auditor</option>
                <option value={UserRole.USER} className="dark:bg-slate-900">Standard User</option>
              </select>
              <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-sm">unfold_more</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                title={!isOpen ? item.label : ''}
                onClick={() => window.innerWidth < 1024 && setIsOpen(false)}
                className={`flex items-center gap-4 p-4 rounded-3xl transition-all ${
                  isActive 
                    ? 'bg-[#1985f0] text-white shadow-xl shadow-[#1985f0]/40' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-100'
                } ${!isOpen && 'lg:justify-center'}`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className={`font-bold text-sm whitespace-nowrap transition-opacity ${!isOpen ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button 
            onClick={onLogout}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all ${!isOpen && 'lg:justify-center'}`}
            title="Logout"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className={`font-bold text-sm transition-opacity ${!isOpen ? 'lg:opacity-0 lg:w-0' : 'opacity-100'}`}>Logout</span>
          </button>

          <div className={`flex items-center gap-3 p-3 mt-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 transition-all ${!isOpen ? 'lg:justify-center' : ''}`}>
            <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0" alt="" />
            <div className={`overflow-hidden transition-all duration-300 ${!isOpen ? 'lg:w-0 lg:opacity-0' : 'w-full opacity-100'}`}>
              <p className="text-sm font-bold truncate text-slate-900 dark:text-white">{user.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1985f0]">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

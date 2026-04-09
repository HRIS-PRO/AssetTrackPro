
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Asset, Activity, EquipmentRequest, AssetReport, UserRole } from './types';

interface AssetTrackerContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  team: User[];
  setTeam: React.Dispatch<React.SetStateAction<User[]>>;
  allEmployees: any[];
  departments: { id: string, name: string, head?: { name: string }, headName?: string }[];
  setDepartments: React.Dispatch<React.SetStateAction<any[]>>;
  categories: { id: string, name: string }[];
  setCategories: React.Dispatch<React.SetStateAction<{ id: string, name: string }[]>>;
  assetLocations: { id: string, name: string }[];
  setAssetLocations: React.Dispatch<React.SetStateAction<{ id: string, name: string }[]>>;
  requests: EquipmentRequest[];
  setRequests: React.Dispatch<React.SetStateAction<EquipmentRequest[]>>;
  managedRequests: EquipmentRequest[];
  setManagedRequests: React.Dispatch<React.SetStateAction<EquipmentRequest[]>>;
  faultyReports: AssetReport[];
  setFaultyReports: React.Dispatch<React.SetStateAction<AssetReport[]>>;
  managedReports: AssetReport[];
  setManagedReports: React.Dispatch<React.SetStateAction<AssetReport[]>>;
  activities: Activity[];
  setActivities: React.Dispatch<React.SetStateAction<Activity[]>>;
  superAdmins: { id: string, email: string }[];
  loading: boolean;
  refreshAll: () => Promise<void>;
}

const AssetTrackerContext = createContext<AssetTrackerContextType | undefined>(undefined);

export const AssetTrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    const savedUserStr = localStorage.getItem('asset_track_user');
    if (savedUserStr) {
      try {
        return JSON.parse(savedUserStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('asset_track_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('asset_track_user');
    }
  }, []);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [team, setTeam] = useState<User[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [assetLocations, setAssetLocations] = useState<{ id: string, name: string }[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [managedRequests, setManagedRequests] = useState<EquipmentRequest[]>([]);
  const [faultyReports, setFaultyReports] = useState<AssetReport[]>([]);
  const [managedReports, setManagedReports] = useState<AssetReport[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [superAdmins, setSuperAdmins] = useState<{ id: string, email: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const token = localStorage.getItem('asset_track_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const urls = [
        '/api/assets',
        '/api/asset-categories',
        '/api/asset-locations',
        '/api/departments',
        '/api/users/apps/asset-tracker',
        '/api/employees',
        '/api/equipment-requests/me',
        '/api/equipment-requests/managed',
        '/api/reports/me',
        '/api/reports/managed',
        '/api/activities',
        '/api/users/super-admins'
      ];

      const responses = await Promise.all(urls.map(url => fetch(url, { headers })));
      
      const [
        assetsData, catsData, locsData, deptsData, 
        teamData, employeesData, reqsMineData, reqsManagedData,
        reportsMineData, reportsManagedData, activitiesData, saData
      ] = await Promise.all(responses.map(res => res.ok ? res.json() : null));

      if (assetsData) setAssets(assetsData);
      if (catsData) setCategories(catsData);
      if (locsData) setAssetLocations(locsData);
      if (deptsData) setDepartments(deptsData);
      if (employeesData) setAllEmployees(employeesData);
      if (activitiesData) setActivities(activitiesData);
      if (saData) setSuperAdmins(saData);
      
      if (teamData) {
        const roleMap: Record<string, UserRole> = {
          'Super Admin': UserRole.SUPER_ADMIN,
          'Admin User': UserRole.ADMIN_USER,
          'Auditor': UserRole.AUDITOR,
          'Standard User': UserRole.USER
        };
        setTeam(teamData.map((u: any) => ({
          id: u.id,
          name: (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.email.split('@')[0]),
          email: u.email,
          role: roleMap[u.role] || UserRole.USER,
          department: u.department || 'General',
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${u.email}&background=random`,
          employeeId: u.employeeId || 'EMP-001',
          location: u.location || 'Remote'
        })));
      }

      if (reqsMineData) setRequests(reqsMineData);
      if (reqsManagedData) setManagedRequests(reqsManagedData);
      if (reportsMineData) setFaultyReports(reportsMineData);
      if (reportsManagedData) setManagedReports(reportsManagedData);

    } catch (err) {
      console.error("Failed to fetch AssetTracker data", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contextValue = useMemo(() => ({
    user, setUser, assets, setAssets, team, setTeam, allEmployees, 
    departments, setDepartments, categories, setCategories, 
    assetLocations, setAssetLocations, requests, setRequests,
    managedRequests, setManagedRequests, faultyReports, setFaultyReports,
    managedReports, setManagedReports, activities, setActivities,
    superAdmins, loading, refreshAll: fetchData
  }), [
    user, setUser, assets, setAssets, team, setTeam, allEmployees, departments, setDepartments, categories, setCategories, 
    assetLocations, setAssetLocations, requests, setRequests, managedRequests, setManagedRequests, faultyReports, setFaultyReports, 
    managedReports, setManagedReports, activities, setActivities, superAdmins, loading, fetchData
  ]);


  return (
    <AssetTrackerContext.Provider value={contextValue}>
      {children}
    </AssetTrackerContext.Provider>
  );
};

export const useAssetTracker = () => {
  const context = useContext(AssetTrackerContext);
  if (context === undefined) {
    throw new Error('useAssetTracker must be used within an AssetTrackerProvider');
  }
  return context;
};

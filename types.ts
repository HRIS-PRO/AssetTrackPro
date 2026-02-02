
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_USER = 'ADMIN_USER',
  AUDITOR = 'AUDITOR',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
  employeeId: string;
  reportingManager?: string;
  location: string;
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  PENDING = 'PENDING',
  LOST = 'LOST',
  DECOMMISSIONED = 'DECOMMISSIONED'
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  assignedTo: string; // User ID
  department: string;
  status: AssetStatus;
  purchaseDate: string;
  purchasePrice: number;
  condition: string;
  location: string;
  manager: string;
  description?: string;
  modelNumber?: string;
  serialNumber?: string;
  tags?: string[];
}

export interface EquipmentRequest {
  id: string;
  userId: string;
  category: string;
  priority: 'Standard' | 'High' | 'Critical';
  justification: string;
  status: 'Initiated' | 'Pending Approval' | 'Approved' | 'Rejected';
  timestamp: string;
}

export interface AuditCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  auditors: string[]; // User IDs
  completion: number;
}

export interface Activity {
  id: number;
  type: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
  roles: UserRole[];
  hasCTA?: boolean;
  targetUserId?: string;
  assetId?: string;
  isRead: boolean;
}

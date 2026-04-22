
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
  DECOMMISSIONED = 'DECOMMISSIONED',
  IDLE = 'IDLE'
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
  consentSignature?: string;
  hrConsentSubmitted?: boolean;
}

export interface AssetLifecycleLog {
  id: string;
  assetId: string;
  performedById: string;
  actionType: string;
  previousAssigneeId?: string | null;
  newAssigneeId?: string | null;
  metadata?: any;
  createdAt: string;
  performedBy?: { id: string; name: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string };
  previousAssignee?: { id: string; name: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string } | null;
  newAssignee?: { id: string; name: string; firstName?: string; lastName?: string; email: string; avatarUrl?: string } | null;
}

export enum RequestPriority {
  STANDARD = 'STANDARD',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum RequestStatus {
  PENDING_HOD = 'PENDING_HOD',
  PENDING_HOO = 'PENDING_HOO',
  PENDING_CATEGORY_ADMIN = 'PENDING_CATEGORY_ADMIN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface EquipmentRequest {
  id: string;
  userId: string;
  categoryId: string;
  priority: RequestPriority;
  justification: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  categoryName?: string;
}

export interface VerificationStatus {
  id?: string;
  assetId: string;
  cycleId: string;
  result: 'Verified' | 'Missing' | 'Damaged' | 'Unclear' | null;
  notes: string;
  verifiedAt?: string;
  timestamp?: string; // Frontend compatibility
}

export interface AuditCycle {
  id: string;
  displayId?: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'Planned' | 'In Progress' | 'Completed';
  auditors: string[]; // User IDs
  completion: number;
  verifications?: VerificationStatus[];
}

export interface Activity {
  id: string;
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

export enum ReportStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED'
}

export interface AssetReport {
  id: string;
  assetId: string;
  userId: string;
  comment: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  assetName?: string;
  assetCategory?: string;
  assetSerialNumber?: string;
  userName?: string;
}

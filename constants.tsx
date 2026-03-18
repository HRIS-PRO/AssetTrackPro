
import { UserRole, User, Asset, AssetStatus, EquipmentRequest, AuditCycle, Activity } from './types';

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Rivera',
    email: 'alex@assettrack.pro',
    role: UserRole.SUPER_ADMIN,
    department: 'Operations',
    employeeId: 'ATP-001',
    location: 'Lagos, NG',
    avatar: 'https://picsum.photos/seed/alex/200'
  },
  {
    id: 'u2',
    name: 'Sarah Chen',
    email: 'sarah@assettrack.pro',
    role: UserRole.ADMIN_USER,
    department: 'Engineering',
    employeeId: 'ATP-012',
    location: 'Nairobi, KE',
    reportingManager: 'Alex Rivera',
    avatar: 'https://picsum.photos/seed/sarah/200'
  },
  {
    id: 'u3',
    name: 'Marcus Thorne',
    email: 'marcus@assettrack.pro',
    role: UserRole.AUDITOR,
    department: 'Finance',
    employeeId: 'ATP-025',
    location: 'Cape Town, SA',
    reportingManager: 'Alex Rivera',
    avatar: 'https://picsum.photos/seed/marcus/200'
  },
  {
    id: 'u4',
    name: 'Jessica Lee',
    email: 'jess@assettrack.pro',
    role: UserRole.USER,
    department: 'Marketing',
    employeeId: 'ATP-048',
    location: 'Accra, GH',
    reportingManager: 'Sarah Chen',
    avatar: 'https://picsum.photos/seed/jess/200'
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'AST-001',
    name: 'MacBook Pro 16"',
    category: 'Laptop',
    assignedTo: 'u4',
    department: 'Marketing',
    status: AssetStatus.ACTIVE,
    purchaseDate: '2023-05-15',
    purchasePrice: 1250000,
    condition: 'Excellent',
    location: 'Accra Office',
    manager: 'Sarah Chen',
    modelNumber: 'A2780',
    serialNumber: 'SN-A2780-XYZ',
    description: '16-inch Liquid Retina XDR display, M2 Max chip with 12-core CPU and 38-core GPU, 32GB Unified Memory.'
  },
  {
    id: 'AST-002',
    name: 'Dell UltraSharp 27"',
    category: 'Monitor',
    assignedTo: 'u4',
    department: 'Marketing',
    status: AssetStatus.ACTIVE,
    purchaseDate: '2023-06-10',
    purchasePrice: 450000,
    condition: 'Brand New',
    location: 'Accra Office',
    manager: 'Sarah Chen',
    modelNumber: 'U2723QE',
    serialNumber: 'CN-0W9Y5N-74445',
    description: '4K USB-C Hub Monitor with IPS Black technology and Daisy Chaining support.'
  },
  {
    id: 'AST-003',
    name: 'Herman Miller Aeron',
    category: 'Furniture',
    assignedTo: 'u2',
    department: 'Engineering',
    status: AssetStatus.ACTIVE,
    purchaseDate: '2022-11-20',
    purchasePrice: 850000,
    condition: 'Good',
    location: 'Nairobi Office',
    manager: 'Alex Rivera',
    modelNumber: 'AERON-B-ST',
    serialNumber: 'HM-FURN-99281',
    description: 'Ergonomic office chair with Pellicle suspension and PostureFit SL back support.'
  },
  {
    id: 'AST-004',
    name: 'Sony A7 IV',
    category: 'AV Equipment',
    assignedTo: 'u4',
    department: 'Marketing',
    status: AssetStatus.MAINTENANCE,
    purchaseDate: '2024-01-05',
    purchasePrice: 2100000,
    condition: 'Fair',
    location: 'Accra Office',
    manager: 'Sarah Chen',
    modelNumber: 'ILCE-7M4',
    serialNumber: 'S01-2299831-C',
    description: '33MP full-frame Exmor R CMOS sensor, 10-bit 4:2:2 video recording capabilities.'
  }
];

export const MOCK_ACTIVITIES: Activity[] = [
  { id: '1', type: 'assignment', title: 'New Asset Assigned: MacBook Pro 16" M2', desc: 'Review condition and provide consent.', time: '2h ago', icon: 'laptop_mac', color: 'blue', roles: [UserRole.USER, UserRole.SUPER_ADMIN, UserRole.ADMIN_USER], hasCTA: true, targetUserId: 'u4', assetId: 'AST-001', isRead: false },
  { id: '2', type: 'maintenance', title: 'Maintenance Request Updated', desc: 'Status changed to "In Repair".', time: '1d ago', icon: 'build', color: 'slate', roles: [UserRole.USER, UserRole.SUPER_ADMIN, UserRole.ADMIN_USER], targetUserId: 'u4', isRead: false },
  { id: '3', type: 'audit', title: 'Audit Verification Successful', desc: 'Verification recorded for Dell UltraSharp 27".', time: 'Oct 10', icon: 'fact_check', color: 'green', roles: [UserRole.USER, UserRole.AUDITOR, UserRole.SUPER_ADMIN], targetUserId: 'u4', isRead: true },
  { id: '4', type: 'system', title: 'Global Data Sync', desc: 'Enterprise assets synchronized with HRIS.', time: '3d ago', icon: 'security', color: 'purple', roles: [UserRole.SUPER_ADMIN], isRead: false },
  { id: '5', type: 'audit_log', title: 'Bulk Inventory Import', desc: 'Sarah Chen added 45 new items.', time: '1w ago', icon: 'cloud_download', color: 'blue', roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN_USER], isRead: true }
];

export const DEPARTMENTS = ['Engineering', 'Marketing', 'Operations', 'Finance', 'Human Resources', 'Legal', 'Sales'];
export const CATEGORIES = ['Laptop', 'Monitor', 'Mouse', 'Keyboard', 'AV Equipment', 'Office Furniture', 'Mobile Device', 'Networking'];

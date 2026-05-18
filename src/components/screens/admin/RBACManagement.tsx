import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Shield,
  Lock,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  Copy,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
  Zap,
  Grid3x3,
  Eye,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Role {
  id: string;
  name: string;
  description: string;
  roleType: 'system' | 'custom';
  permissions: string[];
  accessScope: 'global' | 'zone' | 'store';
  riskLevel: 'low' | 'medium' | 'high';
  isActive: boolean;
  isTemplate: boolean;
  userCount?: number;
  createdAt?: string;
  createdBy?: { name: string; email: string };
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  module: string;
  action: string;
  category: 'read' | 'write' | 'delete' | 'admin';
  riskLevel: 'low' | 'medium' | 'high';
  description?: string;
  dependsOn?: string[];
  isActive: boolean;
}

interface PermissionMatrixModule {
  module: string;
  permissions: Permission[];
}

export function RBACManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [matrixModules, setMatrixModules] = useState<PermissionMatrixModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'role' | 'permission'; id: string; name: string } | null>(null);
  
  // Form states
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    accessScope: 'global',
    permissions: [] as string[],
  });

  const [permForm, setPermForm] = useState({
    name: '',
    displayName: '',
    module: '',
    action: 'view',
    category: 'read',
    description: '',
    riskLevel: 'low',
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      const mockRoles: Role[] = [
        {
          id: '1',
          name: 'Admin',
          description: 'Full system access',
          roleType: 'system',
          permissions: ['*'],
          accessScope: 'global',
          riskLevel: 'high',
          isActive: true,
          isTemplate: true,
          userCount: 5,
        },
        {
          id: '2',
          name: 'Manager',
          description: 'Can manage operations and users',
          roleType: 'custom',
          permissions: ['orders:view', 'orders:create', 'users:view', 'reports:view'],
          accessScope: 'zone',
          riskLevel: 'medium',
          isActive: true,
          isTemplate: false,
          userCount: 12,
        },
        {
          id: '3',
          name: 'Viewer',
          description: 'Read-only access',
          roleType: 'custom',
          permissions: ['orders:view', 'reports:view'],
          accessScope: 'store',
          riskLevel: 'low',
          isActive: true,
          isTemplate: false,
          userCount: 8,
        },
      ];

      const mockPermissions: Permission[] = [
        {
          id: '1',
          name: 'orders:view',
          displayName: 'View Orders',
          module: 'Orders',
          action: 'view',
          category: 'read',
          riskLevel: 'low',
          isActive: true,
        },
        {
          id: '2',
          name: 'orders:create',
          displayName: 'Create Orders',
          module: 'Orders',
          action: 'create',
          category: 'write',
          riskLevel: 'medium',
          isActive: true,
          dependsOn: ['orders:view'],
        },
        {
          id: '3',
          name: 'orders:delete',
          displayName: 'Delete Orders',
          module: 'Orders',
          action: 'delete',
          category: 'delete',
          riskLevel: 'high',
          isActive: true,
        },
        {
          id: '4',
          name: 'users:view',
          displayName: 'View Users',
          module: 'Users',
          action: 'view',
          category: 'read',
          riskLevel: 'low',
          isActive: true,
        },
        {
          id: '5',
          name: 'users:manage',
          displayName: 'Manage Users',
          module: 'Users',
          action: 'manage',
          category: 'admin',
          riskLevel: 'high',
          isActive: true,
          dependsOn: ['users:view'],
        },
        {
          id: '6',
          name: 'reports:view',
          displayName: 'View Reports',
          module: 'Reports',
          action: 'view',
          category: 'read',
          riskLevel: 'low',
          isActive: true,
        },
      ];

      setRoles(mockRoles);
      setPermissions(mockPermissions);
      
      // Group permissions by module
      const grouped = mockPermissions.reduce((acc, perm) => {
        const existing = acc.find(m => m.module === perm.module);
        if (existing) {
          existing.permissions.push(perm);
        } else {
          acc.push({ module: perm.module, permissions: [perm] });
        }
        return acc;
      }, [] as PermissionMatrixModule[]);
      
      setMatrixModules(grouped);
    } catch (error) {
      toast.error('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Zap className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPermissions = permissions.filter(perm =>
    perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    perm.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ============ OVERVIEW TAB ============
  const OverviewTab = () => {
    const highRiskRoles = roles.filter(r => r.riskLevel === 'high').length;
    const systemPermissions = permissions.filter(p => p.category === 'admin').length;
    const inactiveRoles = roles.filter(r => !r.isActive).length;

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{roles.length}</div>
              <p className="text-xs text-gray-500 mt-2">{roles.filter(r => r.isActive).length} active</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Total Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{permissions.length}</div>
              <p className="text-xs text-gray-500 mt-2">{systemPermissions} admin-level</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                High Risk Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{highRiskRoles}</div>
              <p className="text-xs text-gray-500 mt-2">Require audit review</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Assigned Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{roles.reduce((sum, r) => sum + (r.userCount || 0), 0)}</div>
              <p className="text-xs text-gray-500 mt-2">Across all roles</p>
            </CardContent>
          </Card>
        </div>

        {/* High Risk Roles Section */}
        {highRiskRoles > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                High-Risk Roles
              </CardTitle>
              <CardDescription>These roles have admin-level permissions and should be regularly audited</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roles.filter(r => r.riskLevel === 'high').map(role => (
                  <div key={role.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-sm text-gray-500">{role.userCount || 0} users assigned</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingRole(role);
                      setRoleDialogOpen(true);
                    }}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setActiveTab('roles')}>
              <Users className="w-4 h-4" />
              Manage Roles
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setActiveTab('permissions')}>
              <Lock className="w-4 h-4" />
              Manage Permissions
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setActiveTab('matrix')}>
              <Grid3x3 className="w-4 h-4" />
              Permission Matrix
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => {
              toast.info('Export feature coming soon');
            }}>
              <Download className="w-4 h-4" />
              Export Config
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============ ROLES MANAGEMENT TAB ============
  const RolesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditingRole(null);
          setRoleForm({ name: '', description: '', accessScope: 'global', permissions: [] });
          setRoleDialogOpen(true);
        }} className="ml-4">
          <Plus className="w-4 h-4 mr-2" />
          New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRoles.map(role => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{role.name}</h3>
                    <Badge variant="outline" className={getRiskLevelColor(role.riskLevel)}>
                      {getRiskLevelIcon(role.riskLevel)}
                      <span className="ml-1 capitalize">{role.riskLevel}</span>
                    </Badge>
                    {role.roleType === 'system' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        System
                      </Badge>
                    )}
                    {!role.isActive && (
                      <Badge variant="destructive" className="bg-gray-100 text-gray-800">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {role.userCount || 0} users
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-4 h-4" />
                      {role.permissions.length} permissions
                    </span>
                    <span className="capitalize">{role.accessScope} scope</span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setEditingRole(role);
                      setRoleForm({
                        name: role.name,
                        description: role.description,
                        accessScope: role.accessScope,
                        permissions: role.permissions,
                      });
                      setRoleDialogOpen(true);
                    }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(role, null, 2));
                      toast.success('Role config copied');
                    }}>
                      <Copy className="w-4 h-4 mr-2" />
                      Export Config
                    </DropdownMenuItem>
                    {role.roleType !== 'system' && (
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm({ type: 'role', id: role.id, name: role.name })}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Permission Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {role.permissions.slice(0, 5).map((perm, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-gray-100 text-gray-700">
                    {perm}
                  </Badge>
                ))}
                {role.permissions.length > 5 && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    +{role.permissions.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ============ PERMISSIONS MANAGEMENT TAB ============
  const PermissionsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search permissions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => {
          setEditingPermission(null);
          setPermForm({
            name: '',
            displayName: '',
            module: '',
            action: 'view',
            category: 'read',
            description: '',
            riskLevel: 'low',
          });
          setPermDialogOpen(true);
        }} className="ml-4">
          <Plus className="w-4 h-4 mr-2" />
          New Permission
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPermissions.map(perm => (
              <TableRow key={perm.id} className="hover:bg-gray-50">
                <TableCell>
                  <div>
                    <p className="font-medium">{perm.displayName}</p>
                    <p className="text-xs text-gray-500">{perm.name}</p>
                  </div>
                </TableCell>
                <TableCell>{perm.module}</TableCell>
                <TableCell className="capitalize">{perm.action}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {perm.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getRiskLevelColor(perm.riskLevel)}>
                    {getRiskLevelIcon(perm.riskLevel)}
                    <span className="ml-1 capitalize">{perm.riskLevel}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingPermission(perm);
                        setPermForm({
                          name: perm.name,
                          displayName: perm.displayName,
                          module: perm.module,
                          action: perm.action,
                          category: perm.category,
                          description: perm.description || '',
                          riskLevel: perm.riskLevel,
                        });
                        setPermDialogOpen(true);
                      }}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm({ type: 'permission', id: perm.id, name: perm.name })}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  // ============ PERMISSION MATRIX TAB ============
  const MatrixTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Visual representation of permissions grouped by module. Each row represents a permission and its relationships.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter by Risk
          </Button>
        </div>
      </div>

      {matrixModules.map(moduleGroup => (
        <Card key={moduleGroup.module} className="overflow-hidden">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-base">{moduleGroup.module}</CardTitle>
            <CardDescription>{moduleGroup.permissions.length} permissions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {moduleGroup.permissions.map(perm => (
                <div key={perm.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{perm.displayName}</p>
                      <p className="text-xs text-gray-500 mt-1">{perm.description || 'No description'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="capitalize">{perm.action}</Badge>
                      <Badge className={getRiskLevelColor(perm.riskLevel)}>
                        {perm.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  {/* Dependencies */}
                  {perm.dependsOn && perm.dependsOn.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 text-sm">
                      <p className="text-xs font-medium text-blue-900 mb-1">Depends on:</p>
                      <div className="flex flex-wrap gap-1">
                        {perm.dependsOn.map((dep, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Usage Stats */}
                  <div className="mt-3 text-xs text-gray-500 flex gap-4">
                    <span>Used in {Math.floor(Math.random() * 10 + 1)} roles</span>
                    <span>Assigned to {Math.floor(Math.random() * 50 + 5)} users</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ============ ROLE DIALOG ============
  const RoleDialog = () => (
    <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
          <DialogDescription>
            {editingRole ? 'Update role details and permissions' : 'Define a new role with specific permissions and access scope'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div>
              <Label htmlFor="role-name">Role Name *</Label>
              <Input
                id="role-name"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g., Manager, Viewer, Moderator"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="What does this role do?"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role-scope">Access Scope</Label>
              <Select value={roleForm.accessScope} onValueChange={(val) => setRoleForm({ ...roleForm, accessScope: val })}>
                <SelectTrigger id="role-scope" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (all data)</SelectItem>
                  <SelectItem value="zone">Zone Level (zone-specific)</SelectItem>
                  <SelectItem value="store">Store Level (single store)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Permissions</h3>
            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-3">
                {permissions.map(perm => (
                  <div key={perm.id} className="flex items-start gap-3">
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={roleForm.permissions.includes(perm.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setRoleForm({
                            ...roleForm,
                            permissions: [...roleForm.permissions, perm.name],
                          });
                        } else {
                          setRoleForm({
                            ...roleForm,
                            permissions: roleForm.permissions.filter(p => p !== perm.name),
                          });
                        }
                      }}
                    />
                    <label htmlFor={`perm-${perm.id}`} className="flex-1 cursor-pointer">
                      <p className="font-medium text-sm">{perm.displayName}</p>
                      <p className="text-xs text-gray-500">{perm.description || perm.name}</p>
                    </label>
                    <Badge className={getRiskLevelColor(perm.riskLevel)} className="flex-shrink-0">
                      {perm.riskLevel}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            toast.success(editingRole ? 'Role updated' : 'Role created');
            setRoleDialogOpen(false);
          }}>
            {editingRole ? 'Update' : 'Create'} Role
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ============ PERMISSION DIALOG ============
  const PermissionDialog = () => (
    <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingPermission ? 'Edit Permission' : 'Create New Permission'}</DialogTitle>
          <DialogDescription>
            Define a granular permission that can be assigned to roles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="perm-name">Permission Name *</Label>
            <Input
              id="perm-name"
              value={permForm.name}
              onChange={(e) => setPermForm({ ...permForm, name: e.target.value })}
              placeholder="e.g., orders:create"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="perm-display">Display Name *</Label>
            <Input
              id="perm-display"
              value={permForm.displayName}
              onChange={(e) => setPermForm({ ...permForm, displayName: e.target.value })}
              placeholder="e.g., Create Orders"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perm-module">Module *</Label>
              <Input
                id="perm-module"
                value={permForm.module}
                onChange={(e) => setPermForm({ ...permForm, module: e.target.value })}
                placeholder="e.g., Orders"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="perm-action">Action *</Label>
              <Select value={permForm.action} onValueChange={(val) => setPermForm({ ...permForm, action: val })}>
                <SelectTrigger id="perm-action" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="manage">Manage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="perm-category">Category *</Label>
              <Select value={permForm.category} onValueChange={(val) => setPermForm({ ...permForm, category: val })}>
                <SelectTrigger id="perm-category" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="perm-risk">Risk Level *</Label>
              <Select value={permForm.riskLevel} onValueChange={(val) => setPermForm({ ...permForm, riskLevel: val })}>
                <SelectTrigger id="perm-risk" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="perm-desc">Description</Label>
            <Textarea
              id="perm-desc"
              value={permForm.description}
              onChange={(e) => setPermForm({ ...permForm, description: e.target.value })}
              placeholder="What does this permission allow?"
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => setPermDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => {
            toast.success(editingPermission ? 'Permission updated' : 'Permission created');
            setPermDialogOpen(false);
          }}>
            {editingPermission ? 'Update' : 'Create'} Permission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ============ DELETE CONFIRMATION ============
  const DeleteConfirmDialog = () => (
    <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogTitle>Delete {deleteConfirm?.type === 'role' ? 'Role' : 'Permission'}?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          {deleteConfirm?.type === 'role' && ' Make sure no users are assigned to this role.'}
        </AlertDialogDescription>
        <div className="flex justify-end gap-3 pt-4">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              toast.success(`${deleteConfirm?.type === 'role' ? 'Role' : 'Permission'} deleted`);
              setDeleteConfirm(null);
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Loading RBAC configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8" />
            RBAC Management
          </h1>
          <p className="text-gray-600 mt-1">Manage roles, permissions, and access control</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="matrix">Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsTab />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <MatrixTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <RoleDialog />
      <PermissionDialog />
      <DeleteConfirmDialog />
    </div>
  );
}

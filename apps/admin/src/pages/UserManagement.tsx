import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import {
  Users,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Pencil,
  UserX,
  UserCheck,
  X,
  Loader,
  Search,
} from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  organizationId?: string;
  organizationName?: string;
  timezone?: string;
}

type ModalMode = 'none' | 'create' | 'edit';

export function UserManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const hasAdminAccess = user?.role === 'super_admin' || user?.role === 'org_admin';

  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modal, setModal] = useState<ModalMode>('none');
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'org_admin' | 'developer'>('developer');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'org_admin' | 'developer'>('developer');

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (m) =>
        (m.name || '').toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    if (hasAdminAccess) {
      loadUsers();
    }
  }, [hasAdminAccess]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const members = await apiService.getTeamMembers();
      setUsers(members);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const openCreate = () => {
    setCreateEmail('');
    setCreateName('');
    setCreatePassword('');
    setCreateRole('developer');
    setError('');
    setModal('create');
  };

  const openEdit = (member: TeamMember) => {
    setEditingUser(member);
    setEditName(member.name || '');
    setEditRole(
      member.role === 'org_admin' || member.role === 'developer' ? member.role : 'developer'
    );
    setError('');
    setModal('edit');
  };

  const closeModal = () => {
    setModal('none');
    setEditingUser(null);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!createEmail.trim() || !createName.trim() || !createPassword.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setActionLoading('create');
    try {
      await apiService.createUser({
        email: createEmail.trim(),
        name: createName.trim(),
        password: createPassword,
        role: createRole,
      });
      closeModal();
      showSuccess(`User "${createName}" created successfully`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');

    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setActionLoading('edit');
    try {
      if (editName.trim() !== (editingUser.name || '')) {
        await apiService.updateUser(editingUser.id, { name: editName.trim() });
      }
      if (
        editRole !== editingUser.role &&
        (editingUser.role === 'org_admin' || editingUser.role === 'developer')
      ) {
        await apiService.updateUserRole(editingUser.id, editRole);
      }
      closeModal();
      showSuccess(`User "${editName}" updated successfully`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (member: TeamMember) => {
    if (!window.confirm(`Deactivate "${member.name || member.email}"? They will no longer be able to log in.`)) return;
    setActionLoading(member.id + '_deactivate');
    try {
      await apiService.deactivateUser(member.id);
      showSuccess(`"${member.name || member.email}" has been deactivated`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (member: TeamMember) => {
    setActionLoading(member.id + '_reactivate');
    try {
      await apiService.reactivateUser(member.id);
      showSuccess(`"${member.name || member.email}" has been reactivated`);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-6 h-6" />
            <span className="font-medium">Access Denied</span>
          </div>
          <p className="mt-2 text-gray-600">
            You need super admin or organization admin privileges to access this feature.
          </p>
        </div>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700',
      org_admin: 'bg-indigo-100 text-indigo-700',
      developer: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      org_admin: 'Org Admin',
      developer: 'Developer',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center gap-2 z-50">
        <img src={logoImage} alt="Logo" className="w-4 h-4 object-contain" />
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker - User Management</span>
      </div>

      {/* Content */}
      <div className="p-6 pt-12 max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-lg shadow-md">
          {/* Page Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600">Add, edit, or deactivate team members</p>
              </div>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>

          <div className="p-6">
            {/* Search */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Success / Error banners */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">{success}</span>
                </div>
              </div>
            )}

            {/* User Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-6 h-6 animate-spin text-indigo-600 mr-2" />
                <span className="text-gray-500 text-sm">Loading users...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                {searchQuery ? 'No users match your search.' : 'No users found.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Name</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-3 font-medium text-gray-600">Status</th>
                      <th className="text-right py-3 px-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((member) => {
                      const isSelf = member.id === user?.id;
                      const isSuperAdmin = member.role === 'super_admin';
                      const isActive = member.isActive !== false;
                      return (
                        <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <button
                              onClick={() => navigate(`/user-management/${member.id}`)}
                              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                            >
                              {member.name || member.email}
                            </button>
                            {isSelf && (
                              <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-600">{member.email}</td>
                          <td className="py-3 px-3">{roleBadge(member.role)}</td>
                          <td className="py-3 px-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-end gap-2">
                              {!isSuperAdmin && (
                                <button
                                  onClick={() => openEdit(member)}
                                  disabled={!!actionLoading}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-40"
                                  title="Edit user"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {!isSelf && !isSuperAdmin && (
                                isActive ? (
                                  <button
                                    onClick={() => handleDeactivate(member)}
                                    disabled={!!actionLoading}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
                                    title="Deactivate user"
                                  >
                                    {actionLoading === member.id + '_deactivate' ? (
                                      <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <UserX className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleReactivate(member)}
                                    disabled={!!actionLoading}
                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-40"
                                    title="Reactivate user"
                                  >
                                    {actionLoading === member.id + '_reactivate' ? (
                                      <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <UserCheck className="w-4 h-4" />
                                    )}
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Backdrop */}
      {modal !== 'none' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {modal === 'create' ? 'Add New User' : 'Edit User'}
              </h2>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
            {modal === 'create' && (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., Jane Smith" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="jane@company.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Temporary password" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={createRole} onChange={(e) => setCreateRole(e.target.value as 'org_admin' | 'developer')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading}>
                    <option value="developer">Developer</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="submit" disabled={!!actionLoading} className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {actionLoading === 'create' ? (<><Loader className="w-4 h-4 animate-spin" />Creating...</>) : 'Create User'}
                  </button>
                  <button type="button" onClick={closeModal} disabled={!!actionLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                </div>
              </form>
            )}
            {modal === 'edit' && editingUser && (
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editingUser.email} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-sm text-gray-500 cursor-not-allowed" disabled />
                  <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as 'org_admin' | 'developer')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!!actionLoading}>
                    <option value="developer">Developer</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="submit" disabled={!!actionLoading} className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {actionLoading === 'edit' ? (<><Loader className="w-4 h-4 animate-spin" />Saving...</>) : 'Save Changes'}
                  </button>
                  <button type="button" onClick={closeModal} disabled={!!actionLoading} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

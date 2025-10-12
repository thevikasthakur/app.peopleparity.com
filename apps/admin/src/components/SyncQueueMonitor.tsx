import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, Trash2, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/apiService';
import { formatDistanceToNow } from 'date-fns';

interface SyncQueueItem {
  id: string;
  type: 'screenshot' | 'activity_period' | 'session';
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  error?: string;
  data?: any;
  created_at: string;
  updated_at: string;
  user_id: string;
  user_email?: string;
}

interface SyncQueueStats {
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  avgAttempts: number;
  oldestItem?: Date;
  usersAffected: number;
}

export function SyncQueueMonitor() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Fetch sync queue data
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['syncQueue', selectedUser, selectedStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedUser !== 'all') params.append('userId', selectedUser);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await api.get(`/admin/sync-queue?${params}`);
      return response.data;
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Fetch queue statistics
  const { data: stats } = useQuery({
    queryKey: ['syncQueueStats'],
    queryFn: async () => {
      const response = await api.get('/admin/sync-queue/stats');
      return response.data as SyncQueueStats;
    },
    refetchInterval: 10000,
  });

  // Retry failed items mutation
  const retryMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.post(`/admin/sync-queue/${itemId}/retry`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncQueue'] });
      queryClient.invalidateQueries({ queryKey: ['syncQueueStats'] });
    },
  });

  // Clear failed items mutation
  const clearFailedMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/admin/sync-queue/failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncQueue'] });
      queryClient.invalidateQueries({ queryKey: ['syncQueueStats'] });
    },
  });

  // Delete specific item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/admin/sync-queue/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncQueue'] });
      queryClient.invalidateQueries({ queryKey: ['syncQueueStats'] });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Sync Queue Monitor</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {stats?.failed && stats.failed > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear all failed items from the sync queue?')) {
                  clearFailedMutation.mutate();
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Failed ({stats.failed})
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Items</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Syncing</p>
                <p className="text-2xl font-bold text-blue-600">{stats.syncing}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {stats && (stats.avgAttempts > 1 || stats.oldestItem) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Queue Health Issues</p>
              <ul className="mt-1 text-sm text-amber-700">
                {stats.avgAttempts > 1 && (
                  <li>Average retry attempts: {stats.avgAttempts.toFixed(1)}</li>
                )}
                {stats.oldestItem && (
                  <li>
                    Oldest item in queue: {formatDistanceToNow(new Date(stats.oldestItem), { addSuffix: true })}
                  </li>
                )}
                {stats.usersAffected > 0 && (
                  <li>Users affected: {stats.usersAffected}</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="syncing">Syncing</option>
          <option value="failed">Failed</option>
        </select>

        {queueData?.users && (
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            {queueData.users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.email} ({user.count})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Queue Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attempts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Error
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : queueData?.items?.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No items in sync queue
                </td>
              </tr>
            ) : (
              queueData?.items?.map((item: SyncQueueItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.user_email || item.user_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.attempts}
                    {item.attempts >= 3 && (
                      <span className="ml-1 text-red-600">⚠️</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate" title={item.error}>
                    {item.error || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {item.status === 'failed' && (
                        <button
                          onClick={() => retryMutation.mutate(item.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('Delete this item from the sync queue?')) {
                            deleteItemMutation.mutate(item.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
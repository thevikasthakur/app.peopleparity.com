import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AppVersion {
  id: string;
  version: string;
  isSupported: boolean;
  releaseDate: string;
  deprecationDate?: string;
  notes?: string;
  createdAt: string;
}

export default function AppVersions() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version: '',
    releaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/app-versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch versions:', response.status, response.statusText);
        setVersions([]);
        return;
      }

      const data = await response.json();
      console.log('Fetched versions:', data);
      console.log('Is array?', Array.isArray(data));
      console.log('Data length:', data?.length);
      setVersions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching versions:', error);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/app-versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(newVersion)
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewVersion({
          version: '',
          releaseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
        fetchVersions();
      }
    } catch (error) {
      console.error('Error adding version:', error);
    }
  };

  const toggleSupport = async (version: string, currentSupport: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/app-versions/${version}/support`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          isSupported: !currentSupport,
          deprecationDate: !currentSupport ? undefined : new Date().toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        fetchVersions();
      }
    } catch (error) {
      console.error('Error toggling support:', error);
    }
  };

  console.log('Rendering AppVersions, versions:', versions, 'length:', versions.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading versions...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">App Version Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Add New Version
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Release Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deprecation Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {versions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No versions found. Add your first version to get started.
                </td>
              </tr>
            ) : (
              versions.map((version) => (
              <tr key={version.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {version.version}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    version.isSupported
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {version.isSupported ? 'Supported' : 'Deprecated'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(version.releaseDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {version.deprecationDate
                    ? new Date(version.deprecationDate).toLocaleDateString()
                    : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {version.notes || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => toggleSupport(version.version, version.isSupported)}
                    className={`px-3 py-1 rounded-md text-white transition ${
                      version.isSupported
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {version.isSupported ? 'Deprecate' : 'Restore'}
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Version Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Version</h2>
            <form onSubmit={handleAddVersion}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Version Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 1.2.0"
                  value={newVersion.version}
                  onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Release Date
                </label>
                <input
                  type="date"
                  required
                  value={newVersion.releaseDate}
                  onChange={(e) => setNewVersion({ ...newVersion, releaseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="Release notes or description"
                  value={newVersion.notes}
                  onChange={(e) => setNewVersion({ ...newVersion, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Add Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

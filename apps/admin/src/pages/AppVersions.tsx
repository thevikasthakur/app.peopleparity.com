import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Info } from 'lucide-react';

const logoImage = 'https://people-parity-assets.s3.ap-south-1.amazonaws.com/people-parity-logo.png';

interface AppVersion {
  id: string;
  version: string;
  isSupported: boolean;
  releaseDate: string;
  deprecationDate?: string;
  notes?: string;
  createdAt: string;
}

interface ConfirmationModal {
  show: boolean;
  version: string;
  action: 'deprecate' | 'restore';
  currentSupport: boolean;
}

export default function AppVersions() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<ConfirmationModal>({
    show: false,
    version: '',
    action: 'deprecate',
    currentSupport: true
  });
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

  const showConfirmation = (version: string, currentSupport: boolean) => {
    setConfirmModal({
      show: true,
      version,
      action: currentSupport ? 'deprecate' : 'restore',
      currentSupport
    });
  };

  const closeConfirmation = () => {
    setConfirmModal({
      show: false,
      version: '',
      action: 'deprecate',
      currentSupport: true
    });
  };

  const toggleSupport = async () => {
    const { version, currentSupport } = confirmModal;

    // Add version to loading set
    setLoadingVersions(prev => new Set(prev).add(version));

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
        await fetchVersions();
      }
    } catch (error) {
      console.error('Error toggling support:', error);
    } finally {
      // Remove version from loading set
      setLoadingVersions(prev => {
        const newSet = new Set(prev);
        newSet.delete(version);
        return newSet;
      });
      closeConfirmation();
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
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 h-8 bg-gray-100/80 backdrop-blur-sm border-b border-gray-300 flex items-center justify-center gap-2 z-50">
        <img src={logoImage} alt="Logo" className="w-4 h-4 object-contain" />
        <span className="text-xs text-gray-500 font-medium">People Parity Tracker - App Version Management</span>
      </div>

      {/* Content */}
      <div className="p-6 pt-12 max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

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
                    onClick={() => showConfirmation(version.version, version.isSupported)}
                    disabled={loadingVersions.has(version.version)}
                    className={`px-3 py-1 rounded-md text-white transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      version.isSupported
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {loadingVersions.has(version.version) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      version.isSupported ? 'Deprecate' : 'Restore'
                    )}
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg relative">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmModal.action === 'deprecate' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                {confirmModal.action === 'deprecate' ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <Info className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {confirmModal.action === 'deprecate' ? 'Deprecate Version?' : 'Restore Version?'}
                </h2>
                <p className="text-gray-600 mb-3">
                  {confirmModal.action === 'deprecate' ? (
                    <>
                      You are about to deprecate version <span className="font-semibold">{confirmModal.version}</span>.
                    </>
                  ) : (
                    <>
                      You are about to restore version <span className="font-semibold">{confirmModal.version}</span>.
                    </>
                  )}
                </p>

                {/* Warning boxes */}
                <div className={`rounded-lg p-4 mb-4 ${
                  confirmModal.action === 'deprecate' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {confirmModal.action === 'deprecate' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="text-sm">
                      {confirmModal.action === 'deprecate' ? (
                        <>
                          <p className="font-semibold text-red-900 mb-2">This action will:</p>
                          <ul className="list-disc list-inside space-y-1 text-red-800">
                            <li>Immediately mark this version as deprecated</li>
                            <li>Users on this version will be prompted to update</li>
                            <li>This change takes effect instantly</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-blue-900 mb-2">Important Information:</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-800">
                            <li>This version will be marked as supported</li>
                            <li><strong>Due to caching, it may take several minutes for users to see this change</strong></li>
                            <li>Users will stop receiving update prompts once cache expires</li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirmation}
                disabled={loadingVersions.has(confirmModal.version)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={toggleSupport}
                disabled={loadingVersions.has(confirmModal.version)}
                className={`px-4 py-2 rounded-md text-white transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  confirmModal.action === 'deprecate'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loadingVersions.has(confirmModal.version) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  confirmModal.action === 'deprecate' ? 'Yes, Deprecate' : 'Yes, Restore'
                )}
              </button>
            </div>

            {/* Loading overlay for modal */}
            {loadingVersions.has(confirmModal.version) && (
              <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-gray-700">Processing...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}

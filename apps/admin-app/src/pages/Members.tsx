import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Search, ToggleLeft, ToggleRight, UserCheck, UserX, RefreshCw } from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string
  department: string
  isTrackerEnabled: boolean
  lastActive: string
  totalHoursThisWeek: number
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const Members = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/members`)
      return response.data
    }
  })

  const toggleTrackerMutation = useMutation({
    mutationFn: async ({ memberId, enabled }: { memberId: string; enabled: boolean }) => {
      const response = await axios.patch(`${API_URL}/api/members/${memberId}/tracker`, { enabled })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    }
  })

  const handleToggleTracker = (memberId: string, currentStatus: boolean) => {
    toggleTrackerMutation.mutate({ memberId, enabled: !currentStatus })
  }

  const filteredMembers = members.filter((member: Member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.department.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <p className="text-gray-600 mt-1">Manage time tracker access for organization members</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search members..."
              />
            </div>
            <button
              onClick={() => refetch()}
              className="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours This Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tracker Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member: Member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.lastActive}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.totalHoursThisWeek.toFixed(1)} hrs</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.isTrackerEnabled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <UserX className="w-3 h-3 mr-1" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleToggleTracker(member.id, member.isTrackerEnabled)}
                      disabled={toggleTrackerMutation.isPending}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md ${
                        member.isTrackerEnabled
                          ? 'text-red-700 bg-red-100 hover:bg-red-200'
                          : 'text-green-700 bg-green-100 hover:bg-green-200'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        member.isTrackerEnabled ? 'focus:ring-red-500' : 'focus:ring-green-500'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {member.isTrackerEnabled ? (
                        <>
                          <ToggleRight className="w-4 h-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-4 h-4 mr-1" />
                          Enable
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No members found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Members
import { useAuth } from '../contexts/AuthContext'
import { Activity, Users, Clock, Calendar } from 'lucide-react'

const Dashboard = () => {
  const { user } = useAuth()

  const stats = [
    {
      title: 'Active Users',
      value: '24',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Hours Today',
      value: '186',
      icon: Clock,
      color: 'bg-green-500',
    },
    {
      title: 'Screenshots Today',
      value: '1,432',
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      title: 'Days This Month',
      value: '22',
      icon: Calendar,
      color: 'bg-orange-500',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || user?.email}
        </h1>
        <p className="text-gray-600 mt-1">Here's an overview of your organization's activity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} rounded-lg p-3 text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium text-gray-900">John Doe started tracking</p>
                <p className="text-xs text-gray-500">2 minutes ago</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium text-gray-900">Jane Smith stopped tracking</p>
                <p className="text-xs text-gray-500">15 minutes ago</p>
              </div>
              <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2 py-1 rounded">
                Idle
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium text-gray-900">Mike Johnson uploaded screenshots</p>
                <p className="text-xs text-gray-500">1 hour ago</p>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                Screenshots
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  JD
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500">8.5 hours today</p>
                </div>
              </div>
              <div className="text-sm font-semibold text-green-600">+12%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  JS
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Jane Smith</p>
                  <p className="text-xs text-gray-500">8.2 hours today</p>
                </div>
              </div>
              <div className="text-sm font-semibold text-green-600">+8%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold">
                  MJ
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Mike Johnson</p>
                  <p className="text-xs text-gray-500">7.9 hours today</p>
                </div>
              </div>
              <div className="text-sm font-semibold text-green-600">+5%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
import { ChevronDown } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isActive?: boolean;
}

interface TeamMemberSelectorProps {
  teamMembers: TeamMember[];
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  isLoading: boolean;
}

export function TeamMemberSelector({
  teamMembers,
  selectedUserId,
  onSelectUser,
  isLoading
}: TeamMemberSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selectedUserId || ''}
        onChange={(e) => onSelectUser(e.target.value || null)}
        className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[200px]"
        disabled={isLoading}
      >
        <option value="">All Team Members</option>
        {teamMembers.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name || member.email}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <ChevronDown className="w-5 h-5 text-gray-400" />
      </div>
    </div>
  );
}
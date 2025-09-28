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
export declare function TeamMemberSelector({ teamMembers, selectedUserId, onSelectUser, isLoading }: TeamMemberSelectorProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TeamMemberSelector.d.ts.map
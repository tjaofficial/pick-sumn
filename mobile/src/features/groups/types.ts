export type GroupType = "permanent" | "temporary";

export type GroupRole = "owner" | "admin" | "member";

export type DiningGroupMemberUser = {
  id: number;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  date_joined: string;
};

export type DiningGroupMember = {
  id: number;
  user: DiningGroupMemberUser;
  role: GroupRole;
  role_display: string;
  nickname: string;
  is_active: boolean;
  joined_at: string;
};

export type DiningGroup = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  group_type: GroupType;
  join_code: string;
  member_count: number;
  current_user_role: GroupRole | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DiningGroupDetail = DiningGroup & {
  members: DiningGroupMember[];
};

export type CreateGroupInput = {
  name: string;
  description?: string;
  group_type: GroupType;
  expires_at?: string | null;
};

export type JoinGroupInput = {
  join_code: string;
};
export type FriendUser = {
  id: number;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  date_joined: string;
  friend_code?: string;
};

export type FriendListItem = {
  friendship_id: string;
  user: FriendUser;
};

export type FriendRequest = {
  friendship_id: string;
  user: FriendUser;
  created_at: string;
};

export type FriendSearchResult = {
  user: FriendUser;
  relationship_status:
    | "pending"
    | "accepted"
    | "declined"
    | "blocked"
    | null;
};



export type BlockedUser = {
  friendship_id: string;
  user: FriendUser;
  blocked_at: string;
};

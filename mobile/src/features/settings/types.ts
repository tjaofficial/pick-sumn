export type FriendRequestPrivacy =
  | "everyone"
  | "friends_of_friends"
  | "nobody";

export type GroupInvitePrivacy =
  | "friends_only"
  | "nobody";

export type AppTheme =
  | "light"
  | "dark";

export type AppSettings = {
  friend_request_privacy: FriendRequestPrivacy;
  group_invite_privacy: GroupInvitePrivacy;
  notification_friend_requests: boolean;
  notification_group_invites: boolean;
  notification_pick_session_invites: boolean;
  notification_group_vote_started: boolean;
  notification_voting_reminders: boolean;
  notification_session_results: boolean;
  notification_general: boolean;
  theme: AppTheme;
  updated_at: string;
};

export type UpdateAppSettingsInput =
  Partial<
    Omit<
      AppSettings,
      "updated_at"
    >
  >;

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
};



export type FeedbackType =
  | "general"
  | "feature"
  | "bug"
  | "support";

export type SubmitFeedbackInput = {
  feedback_type: FeedbackType;
  message: string;
  may_contact: boolean;
};

export type FeedbackSubmission = {
  id: number;
  feedback_type: FeedbackType;
  message: string;
  may_contact: boolean;
  created_at: string;
};

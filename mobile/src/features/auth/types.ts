export type User = {
  id: number;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  date_joined: string;
};

export type AuthTokens = {
  access: string;
  refresh: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  email: string;
  display_name: string;
  password: string;
  password_confirm: string;
};
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

export type SocialProvider =
  | "apple"
  | "google"
  | "facebook";

export type SocialLoginInput = {
  provider: SocialProvider;
  identity_token: string;
  token_type?: "oidc" | "access";
  nonce?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
};


export type SignInMethods = {
  password: boolean;
  apple: boolean;
  google: boolean;
  facebook: boolean;
};

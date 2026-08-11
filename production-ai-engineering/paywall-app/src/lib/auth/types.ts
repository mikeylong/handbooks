export type AuthSession = {
  userId: string;
  email: string;
};

export interface AuthAdapter {
  getSession(): Promise<AuthSession | null>;
}

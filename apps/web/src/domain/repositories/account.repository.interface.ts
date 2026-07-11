export interface IAccountRepository {
  findGoogleAccount(userId: string): Promise<{
    id: string;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
  } | null>;
}

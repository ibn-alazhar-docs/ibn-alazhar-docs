export interface VerificationTokenRecord {
  identifier: string;
  token: string;
  expires: Date;
}

export interface IVerificationTokenRepository {
  create(data: { identifier: string; token: string; expires: Date }): Promise<void>;
  findByIdentifierAndToken(
    identifier: string,
    token: string,
  ): Promise<VerificationTokenRecord | null>;
  deleteByIdentifier(identifier: string): Promise<void>;
  deleteByIdentifierAndToken(identifier: string, token: string): Promise<void>;
}

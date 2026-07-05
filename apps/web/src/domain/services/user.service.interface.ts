/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IUserService {
  // TODO: derive methods from user.use-cases.ts and profile.use-cases.ts
  findById?(id: string): Promise<any | null>;
  create?(payload: any): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

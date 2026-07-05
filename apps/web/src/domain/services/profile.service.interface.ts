/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IProfileService {
  // TODO: derive from profile.use-cases.ts
  getProfile?(userId: string): Promise<any>;
  updateProfile?(userId: string, payload: any): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

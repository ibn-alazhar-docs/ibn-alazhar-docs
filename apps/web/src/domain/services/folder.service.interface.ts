/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IFolderService {
  // TODO: extract signatures from core/use-cases/folder.use-cases.ts
  create?(payload: any): Promise<any>;
  findById?(id: string, userId?: string): Promise<any | null>;
  list?(userId: string): Promise<any[]>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

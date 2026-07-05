/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IDocumentService {
  // TODO: extract precise method signatures from core/use-cases/upload-document.use-case.ts and document-crud.use-cases.ts
  upload?(params: any): Promise<any>;
  create?(payload: any): Promise<any>;
  update?(id: string, payload: any): Promise<any>;
  delete?(id: string): Promise<void>;
  findById?(id: string, userId?: string): Promise<any | null>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

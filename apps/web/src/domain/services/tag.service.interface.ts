/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ITagService {
  // TODO: fill from core/use-cases/tag.use-cases.ts
  create?(payload: any): Promise<any>;
  list?(userId: string): Promise<any[]>;
  attachToDocument?(documentId: string, tagId: string): Promise<void>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

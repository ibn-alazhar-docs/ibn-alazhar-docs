/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ISearchService {
  // TODO: add methods from search.use-cases.ts
  query?(userId: string, q: string): Promise<any[]>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

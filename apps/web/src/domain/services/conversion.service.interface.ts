/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IConversionService {
  // TODO: derive from conversion.use-cases.ts
  convertDocument?(documentId: string, options?: any): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

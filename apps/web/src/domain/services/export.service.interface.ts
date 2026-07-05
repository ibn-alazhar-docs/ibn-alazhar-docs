/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IExportService {
  // TODO: extract from core/use-cases/export.use-cases.ts (orchestrate/generate/resolve/cache)
  startExport?(params: any): Promise<any>;
  getStatus?(jobId: string): Promise<any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

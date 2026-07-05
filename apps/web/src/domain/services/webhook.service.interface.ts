/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IWebhookService {
  // TODO: derive from webhook.use-cases.ts
  handleEvent?(payload: any): Promise<void>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

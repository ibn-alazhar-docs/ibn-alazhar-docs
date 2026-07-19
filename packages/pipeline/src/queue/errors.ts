export class PermanentPipelineError extends Error {
  /** عند true يوجّه السائق لعدم إعادة المحاولة (مكافئ job.discard في BullMQ). */
  public readonly willRetry = false;
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "PermanentPipelineError";
  }
}

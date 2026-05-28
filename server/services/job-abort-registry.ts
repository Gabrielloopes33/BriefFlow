const abortRegistry = new Map<string, AbortController>();

export function registerJobAbortController(jobId: string, controller: AbortController): void {
  abortRegistry.set(jobId, controller);
}

export function getJobAbortController(jobId: string): AbortController | undefined {
  return abortRegistry.get(jobId);
}

export function removeJobAbortController(jobId: string): void {
  abortRegistry.delete(jobId);
}

export function abortJob(jobId: string): boolean {
  const controller = abortRegistry.get(jobId);
  if (!controller) return false;
  controller.abort();
  abortRegistry.delete(jobId);
  return true;
}

import type { Pool } from 'pg';

const JOB_TIMEOUT_MESSAGE = 'Job timeout: geracao nao concluida apos 10 minutos';

export async function cleanupTimedOutJobs(pool: Pool): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE jobs
     SET status = 'failed',
         error = jsonb_build_object('code', 'JOB_TIMEOUT', 'message', $1::text),
         updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - INTERVAL '10 minutes'`,
    [JOB_TIMEOUT_MESSAGE]
  );

  return rowCount || 0;
}

export function startJobCleanup(pool: Pool): NodeJS.Timeout {
  const run = async () => {
    try {
      const updated = await cleanupTimedOutJobs(pool);
      if (updated > 0) {
        console.log(`[job-cleanup] Timed out jobs marked as failed: ${updated}`);
      }
    } catch (error) {
      console.error('[job-cleanup] Failed to cleanup timed out jobs:', error);
    }
  };

  void run();
  return setInterval(run, 2 * 60 * 1000);
}

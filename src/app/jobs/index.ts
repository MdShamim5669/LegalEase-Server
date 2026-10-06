import { initCancelUnpaidJob } from "./cancelUnpaid.job";
import { initCancelNoShowJob } from "./cancelNoShow.job";
import logger from "../lib/logger";

export const initScheduledJobs = () => {
  logger.info("[Scheduler] Initializing background cron jobs...");
  const unpaidJob = initCancelUnpaidJob();
  const noShowJob = initCancelNoShowJob();

  return {
    unpaidJob,
    noShowJob,
  };
};

export * from "./cancelUnpaid.job";
export * from "./cancelNoShow.job";
export default initScheduledJobs;

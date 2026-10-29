CREATE INDEX `jobs_due_queue` ON `project_jobs` (`kind`,`status`,`lease_until`,`updated_at`);

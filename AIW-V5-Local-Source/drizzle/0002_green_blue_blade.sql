CREATE TABLE `brain_retrieval_runs` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`project_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`status` text NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `brain_retrieval_owner_created` ON `brain_retrieval_runs` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `brain_retrieval_context` ON `brain_retrieval_runs` (`owner_id`,`project_id`,`input_hash`,`status`);
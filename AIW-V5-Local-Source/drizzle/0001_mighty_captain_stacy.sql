CREATE TABLE `intelligence_runs` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`project_id` text NOT NULL,
	`object_id` text NOT NULL,
	`mode` text NOT NULL,
	`input_stamp` text NOT NULL,
	`status` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`error_code` text,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `intelligence_owner_created` ON `intelligence_runs` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `intelligence_project_context` ON `intelligence_runs` (`owner_id`,`project_id`,`object_id`,`created_at`);
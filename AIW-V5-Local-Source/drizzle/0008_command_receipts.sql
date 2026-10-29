CREATE TABLE `command_receipts` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`revision` integer NOT NULL,
	`selected` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `key`)
);
--> statement-breakpoint
CREATE INDEX `command_receipts_created` ON `command_receipts` (`owner_id`,`project_id`,`created_at`);
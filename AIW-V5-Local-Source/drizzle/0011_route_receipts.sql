CREATE TABLE `route_receipts` (
	`actor_id` text NOT NULL,
	`project_id` text NOT NULL,
	`route` text NOT NULL,
	`key` text NOT NULL,
	`request_hash` text NOT NULL,
	`status` integer NOT NULL,
	`response` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`actor_id`, `project_id`, `route`, `key`)
);
--> statement-breakpoint
CREATE INDEX `route_receipts_created` ON `route_receipts` (`created_at`);
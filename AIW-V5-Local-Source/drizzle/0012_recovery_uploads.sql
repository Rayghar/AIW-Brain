CREATE TABLE `recovery_uploads` (
	`actor_id` text NOT NULL,
	`id` text NOT NULL,
	`manifest` text NOT NULL,
	`received` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`actor_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `recovery_uploads_created` ON `recovery_uploads` (`created_at`);
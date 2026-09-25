CREATE TABLE `project_access` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `actor_id`)
);
--> statement-breakpoint
CREATE INDEX `access_actor` ON `project_access` (`actor_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `project_attachments` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`filename` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`source_id` text NOT NULL,
	`created_at` text NOT NULL,
	`actor_id` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `project_reviews` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);

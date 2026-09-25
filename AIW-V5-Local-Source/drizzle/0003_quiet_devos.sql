CREATE TABLE `requirement_index` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`external_id` text NOT NULL,
	`domain` text NOT NULL,
	`capability` text NOT NULL,
	`title` text NOT NULL,
	`delivery` text NOT NULL,
	`confirmed` integer NOT NULL,
	`search` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `requirements_domain` ON `requirement_index` (`owner_id`,`project_id`,`domain`);--> statement-breakpoint
CREATE INDEX `requirements_external` ON `requirement_index` (`owner_id`,`project_id`,`external_id`);--> statement-breakpoint
CREATE TABLE `workbook_uploads` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`project_id` text NOT NULL,
	`filename` text NOT NULL,
	`sha256` text NOT NULL,
	`bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `workbook_project_created` ON `workbook_uploads` (`owner_id`,`project_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `projects` ADD `index_stamp` text;
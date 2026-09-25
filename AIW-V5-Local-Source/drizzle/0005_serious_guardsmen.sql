CREATE TABLE `activity_reads` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`seen_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `actor_id`)
);
--> statement-breakpoint
CREATE TABLE `object_discussions` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`object_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `discussion_object` ON `object_discussions` (`owner_id`,`project_id`,`object_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `operation_events` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`document` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `operation_project` ON `operation_events` (`owner_id`,`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organization_library` (
	`organization_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `organization_members` (
	`organization_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `actor_id`)
);
--> statement-breakpoint
CREATE INDEX `organization_member_actor` ON `organization_members` (`actor_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `organization_releases` (
	`organization_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `project_activity` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`actor_id` text NOT NULL,
	`document` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `activity_project` ON `project_activity` (`owner_id`,`project_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `project_connections` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE TABLE `project_jobs` (
	`owner_id` text NOT NULL,
	`project_id` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`input_hash` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`lease_until` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `project_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `jobs_project_status` ON `project_jobs` (`owner_id`,`project_id`,`status`,`updated_at`);
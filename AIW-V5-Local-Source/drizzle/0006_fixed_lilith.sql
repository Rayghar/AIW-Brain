ALTER TABLE `intelligence_runs` ADD `actor_id` text;--> statement-breakpoint
ALTER TABLE `intelligence_runs` ADD `reserved_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `intelligence_runs` ADD `used_tokens` integer;
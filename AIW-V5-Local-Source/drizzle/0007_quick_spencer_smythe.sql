ALTER TABLE `brain_retrieval_runs` ADD `reserved_tokens` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `brain_retrieval_runs` ADD `used_tokens` integer;
CREATE TABLE `captures` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`user_note` text,
	`latest_successful_job_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `captures_url_active_unique` ON `captures` (`url`) WHERE "captures"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `captures_created_at_idx` ON `captures` (`created_at`);--> statement-breakpoint
CREATE TABLE `scrape_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`capture_id` text NOT NULL,
	`fetcher` text NOT NULL,
	`config_snapshot` text NOT NULL,
	`raw_response_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`capture_id`) REFERENCES `captures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scrape_jobs_one_active_per_capture` ON `scrape_jobs` (`capture_id`) WHERE "scrape_jobs"."status" in ('pending', 'running') and "scrape_jobs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `scrape_jobs_capture_created_at_idx` ON `scrape_jobs` (`capture_id`,`created_at`);

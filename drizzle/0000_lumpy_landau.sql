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
CREATE TABLE `fetch_jobs` (
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
CREATE UNIQUE INDEX `fetch_jobs_one_active_per_capture` ON `fetch_jobs` (`capture_id`) WHERE "fetch_jobs"."status" in ('pending', 'running') and "fetch_jobs"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX `fetch_jobs_capture_created_at_idx` ON `fetch_jobs` (`capture_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`protocol` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`custom_models` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);

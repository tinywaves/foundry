CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "prompts_id_not_empty" CHECK(length("prompts"."id") > 0),
	CONSTRAINT "prompts_title_valid" CHECK(length(trim("prompts"."title")) BETWEEN 1 AND 100),
	CONSTRAINT "prompts_description_valid" CHECK("prompts"."description" IS NULL OR length("prompts"."description") <= 2000),
	CONSTRAINT "prompts_content_valid" CHECK(length(trim("prompts"."content")) > 0 AND length(CAST("prompts"."content" AS BLOB)) <= 1048576),
	CONSTRAINT "prompts_created_at_nonnegative" CHECK("prompts"."created_at" >= 0),
	CONSTRAINT "prompts_updated_at_valid" CHECK("prompts"."updated_at" >= "prompts"."created_at"),
	CONSTRAINT "prompts_deleted_at_valid" CHECK("prompts"."deleted_at" IS NULL OR "prompts"."deleted_at" >= "prompts"."created_at")
);
--> statement-breakpoint
CREATE INDEX `prompts_updated_at_index` ON `prompts` (`updated_at`);

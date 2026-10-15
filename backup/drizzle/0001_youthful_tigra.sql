CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`runtime` text NOT NULL,
	`name` text NOT NULL,
	`official_website` text,
	`remark` text,
	`avatar_mime_type` text,
	`avatar_data` blob,
	`configuration` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "providers_id_not_empty" CHECK(length("providers"."id") > 0),
	CONSTRAINT "providers_runtime_valid" CHECK("providers"."runtime" IN ('codex', 'claude-code')),
	CONSTRAINT "providers_name_valid" CHECK(length(trim("providers"."name")) BETWEEN 1 AND 100),
	CONSTRAINT "providers_official_website_valid" CHECK("providers"."official_website" IS NULL OR length("providers"."official_website") <= 2048),
	CONSTRAINT "providers_remark_valid" CHECK("providers"."remark" IS NULL OR length("providers"."remark") <= 2000),
	CONSTRAINT "providers_avatar_valid" CHECK(("providers"."avatar_mime_type" IS NULL AND "providers"."avatar_data" IS NULL)
	        OR ("providers"."avatar_mime_type" IN ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml')
	          AND "providers"."avatar_data" IS NOT NULL
	          AND length("providers"."avatar_data") BETWEEN 1 AND 2097152)),
	CONSTRAINT "providers_configuration_json" CHECK(json_valid("providers"."configuration")),
	CONSTRAINT "providers_created_at_nonnegative" CHECK("providers"."created_at" >= 0),
	CONSTRAINT "providers_updated_at_valid" CHECK("providers"."updated_at" >= "providers"."created_at"),
	CONSTRAINT "providers_deleted_at_valid" CHECK("providers"."deleted_at" IS NULL OR "providers"."deleted_at" >= "providers"."created_at")
);
--> statement-breakpoint
CREATE INDEX `providers_runtime_created_at_index` ON `providers` (`runtime`,`created_at`);

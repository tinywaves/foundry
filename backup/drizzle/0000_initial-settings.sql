CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "settings_id_not_empty" CHECK(length("settings"."id") > 0),
	CONSTRAINT "settings_key_not_empty" CHECK(length(trim("settings"."key")) > 0),
	CONSTRAINT "settings_value_json" CHECK(json_valid("settings"."value")),
	CONSTRAINT "settings_created_at_nonnegative" CHECK("settings"."created_at" >= 0),
	CONSTRAINT "settings_updated_at_valid" CHECK("settings"."updated_at" >= "settings"."created_at"),
	CONSTRAINT "settings_deleted_at_valid" CHECK("settings"."deleted_at" IS NULL OR "settings"."deleted_at" >= "settings"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);
--> statement-breakpoint
INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`, `deleted_at`)
VALUES (
	uuid_v7(),
	'color_mode',
	'"system"',
	CAST(unixepoch('subsec') * 1000 AS INTEGER),
	CAST(unixepoch('subsec') * 1000 AS INTEGER),
	NULL
);

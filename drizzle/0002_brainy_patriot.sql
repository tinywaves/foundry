CREATE TABLE `runtimes` (
	`runtime` text PRIMARY KEY NOT NULL,
	`managed` integer DEFAULT false NOT NULL,
	`provider_id` text,
	`applied_at` integer,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "runtimes_runtime_valid" CHECK("runtimes"."runtime" IN ('codex', 'claude-code')),
	CONSTRAINT "runtimes_state_valid" CHECK(("runtimes"."managed" = 0 AND "runtimes"."provider_id" IS NULL AND "runtimes"."applied_at" IS NULL) OR ("runtimes"."managed" = 1 AND "runtimes"."applied_at" IS NOT NULL)),
	CONSTRAINT "runtimes_applied_at_nonnegative" CHECK("runtimes"."applied_at" IS NULL OR "runtimes"."applied_at" >= 0)
);
--> statement-breakpoint
INSERT INTO `runtimes` (`runtime`, `managed`, `provider_id`, `applied_at`)
VALUES
	('codex', false, NULL, NULL),
	('claude-code', false, NULL, NULL);

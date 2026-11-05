CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ended_at` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`result` text,
	`log_path` text,
	`cost_usd` real
);
--> statement-breakpoint
CREATE INDEX `agent_runs_agent` ON `agent_runs` (`agent`,`started_at`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_id` integer NOT NULL,
	`stage` text DEFAULT 'saved' NOT NULL,
	`packet_path` text,
	`applied_at` integer,
	`next_action` text,
	`next_action_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_job` ON `applications` (`job_id`);--> statement-breakpoint
CREATE INDEX `applications_stage` ON `applications` (`stage`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`ats` text,
	`board_token` text,
	`website` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_slug_unique` ON `companies` (`slug`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`at` integer DEFAULT (unixepoch()) NOT NULL,
	`kind` text NOT NULL,
	`from_stage` text,
	`to_stage` text,
	`summary` text NOT NULL,
	`source` text NOT NULL,
	`evidence` text,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `events_application` ON `events` (`application_id`,`at`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`company_id` integer NOT NULL,
	`title` text NOT NULL,
	`location` text,
	`url` text,
	`description` text,
	`compensation` text,
	`posted_at` integer,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`score` real,
	`score_reason` text,
	`scored_at` integer,
	`status` text DEFAULT 'new' NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_source_external` ON `jobs` (`source`,`external_id`);--> statement-breakpoint
CREATE INDEX `jobs_status_score` ON `jobs` (`status`,`score`);
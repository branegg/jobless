CREATE TABLE `inbox_findings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`application_id` integer NOT NULL,
	`message_id` text NOT NULL,
	`kind` text NOT NULL,
	`proposed_stage` text,
	`confidence` text NOT NULL,
	`suspicious` integer DEFAULT false NOT NULL,
	`email_at` integer NOT NULL,
	`from_address` text NOT NULL,
	`subject` text NOT NULL,
	`quote` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inbox_message_application` ON `inbox_findings` (`message_id`,`application_id`);--> statement-breakpoint
CREATE INDEX `inbox_status` ON `inbox_findings` (`status`);
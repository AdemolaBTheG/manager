CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`kind` text NOT NULL,
	`parent_branch_id` text,
	`fork_turn_id` text,
	`reaction_profile` text NOT NULL,
	`resistance_move_order` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`parent_branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`fork_turn_id`) REFERENCES `turns`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "branches_lineage_check" CHECK(("branches"."kind" = 'original' AND "branches"."parent_branch_id" IS NULL AND "branches"."fork_turn_id" IS NULL)
        OR ("branches"."kind" = 'rewind' AND "branches"."parent_branch_id" IS NOT NULL AND "branches"."fork_turn_id" IS NOT NULL)
        OR ("branches"."kind" = 'pressure-test' AND "branches"."parent_branch_id" IS NOT NULL AND "branches"."fork_turn_id" IS NULL)),
	CONSTRAINT "branches_reaction_profile_check" CHECK(length(trim("branches"."reaction_profile")) > 0)
);
--> statement-breakpoint
CREATE INDEX `branches_session_idx` ON `branches` (`session_id`);--> statement-breakpoint
CREATE INDEX `branches_parent_idx` ON `branches` (`parent_branch_id`);--> statement-breakpoint
CREATE INDEX `branches_fork_turn_idx` ON `branches` (`fork_turn_id`);--> statement-breakpoint
CREATE TABLE `debriefs` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`debrief_json` text NOT NULL,
	`model_version` text NOT NULL,
	`prompt_version` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `debriefs_branch_unique` ON `debriefs` (`branch_id`);--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`scenario_id` text NOT NULL,
	`scenario_version` integer NOT NULL,
	`privacy_mode` text NOT NULL,
	`status` text NOT NULL,
	`active_branch_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`active_branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "practice_sessions_scenario_version_check" CHECK("practice_sessions"."scenario_version" > 0)
);
--> statement-breakpoint
CREATE INDEX `practice_sessions_scenario_idx` ON `practice_sessions` (`scenario_id`,`scenario_version`);--> statement-breakpoint
CREATE INDEX `practice_sessions_status_idx` ON `practice_sessions` (`status`);--> statement-breakpoint
CREATE TABLE `readiness_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`stage` text NOT NULL,
	`rating` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "readiness_ratings_value_check" CHECK("readiness_ratings"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `readiness_ratings_session_stage_unique` ON `readiness_ratings` (`session_id`,`stage`);--> statement-breakpoint
CREATE TABLE `state_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`before_turn_id` text NOT NULL,
	`state_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`before_turn_id`) REFERENCES `turns`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `state_snapshots_before_turn_unique` ON `state_snapshots` (`before_turn_id`);--> statement-breakpoint
CREATE INDEX `state_snapshots_branch_idx` ON `state_snapshots` (`branch_id`);--> statement-breakpoint
CREATE TABLE `turns` (
	`id` text PRIMARY KEY NOT NULL,
	`branch_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`speaker` text NOT NULL,
	`text` text NOT NULL,
	`audio_path` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "turns_sequence_check" CHECK("turns"."sequence" > 0),
	CONSTRAINT "turns_text_check" CHECK(length(trim("turns"."text")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `turns_branch_sequence_unique` ON `turns` (`branch_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `turns_branch_speaker_idx` ON `turns` (`branch_id`,`speaker`);
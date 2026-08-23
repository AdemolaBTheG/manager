CREATE TABLE `branch_simulation_states` (
	`branch_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `turns` ADD `model_version` text;--> statement-breakpoint
ALTER TABLE `turns` ADD `prompt_version` text;
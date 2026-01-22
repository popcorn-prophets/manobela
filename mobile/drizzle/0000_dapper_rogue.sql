CREATE TABLE `metrics` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`face_missing` integer NOT NULL,
	`ear` integer,
	`perclos` integer,
	`mar` integer,
	`yaw` integer,
	`pitch` integer,
	`roll` integer,
	`eye_closed` integer NOT NULL,
	`eye_closed_sustained` integer NOT NULL,
	`perclos_alert` integer NOT NULL,
	`yawning` integer NOT NULL,
	`yawn_sustained` integer NOT NULL,
	`yawn_count` integer NOT NULL,
	`yaw_alert` integer NOT NULL,
	`pitch_alert` integer NOT NULL,
	`roll_alert` integer NOT NULL,
	`head_pose_sustained` integer NOT NULL,
	`gaze_alert` integer NOT NULL,
	`gaze_sustained` integer NOT NULL,
	`phone_usage` integer NOT NULL,
	`phone_usage_sustained` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_ms` integer
);

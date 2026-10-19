CREATE TABLE `audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_user_id` bigint unsigned,
	`source` enum('dashboard','cli') NOT NULL,
	`action` enum('user.role_updated','warehouse.created','warehouse.updated') NOT NULL,
	`target_type` varchar(32) NOT NULL,
	`target_id` varchar(64),
	`metadata` json,
	`ip_address` varchar(45),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_exchange_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`expires_at` datetime NOT NULL,
	`consumed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_exchange_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_exchange_codes_code_hash_unique` UNIQUE(`code_hash`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `brands_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`name` varchar(100) NOT NULL,
	`slug` varchar(120) NOT NULL,
	`color` enum('red','yellow','blue'),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `couriers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(100) NOT NULL,
	`services` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `couriers_id` PRIMARY KEY(`id`),
	CONSTRAINT `couriers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `email_login_codes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`consumed_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_login_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`storage_key` varchar(300) NOT NULL,
	`url` varchar(500) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`sku` varchar(64) NOT NULL,
	`name` varchar(150),
	`attributes` json,
	`base_price` int unsigned NOT NULL,
	`markup_percent` decimal(5,2),
	`price` int unsigned NOT NULL,
	`price_locked` boolean NOT NULL DEFAULT false,
	`compare_at_price` int unsigned,
	`weight_gram` int unsigned NOT NULL,
	`length_cm` decimal(6,1),
	`width_cm` decimal(6,1),
	`height_cm` decimal(6,1),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned NOT NULL,
	`brand_id` bigint unsigned,
	`name` varchar(200) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`description` text,
	`specifications` json,
	`permit_number` varchar(64),
	`is_hazardous` boolean NOT NULL DEFAULT false,
	`markup_percent` decimal(5,2),
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`refresh_token_hash` varchar(64) NOT NULL,
	`previous_refresh_token_hash` varchar(64),
	`rotated_at` datetime,
	`last_used_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`variant_id` bigint unsigned NOT NULL,
	`type` enum('stock_in','sale','sale_release','return','adjustment','transfer_in','transfer_out') NOT NULL,
	`quantity` int NOT NULL,
	`reference_type` varchar(32),
	`reference_id` varchar(64),
	`actor_user_id` bigint unsigned,
	`note` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stock_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`google_sub` varchar(64),
	`email` varchar(191) NOT NULL,
	`name` varchar(150) NOT NULL,
	`avatar_url` varchar(500),
	`phone` varchar(20),
	`profession` varchar(50),
	`role` enum('user','admin','superadmin') NOT NULL DEFAULT 'user',
	`warehouse_id` bigint unsigned,
	`is_blocked` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_google_sub_unique` UNIQUE(`google_sub`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `warehouse_stocks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`variant_id` bigint unsigned NOT NULL,
	`quantity` int unsigned NOT NULL DEFAULT 0,
	`reserved` int unsigned NOT NULL DEFAULT 0,
	`low_stock_threshold` int unsigned NOT NULL DEFAULT 5,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouse_stocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouse_stocks_warehouse_variant_unique` UNIQUE(`warehouse_id`,`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(100) NOT NULL,
	`address` text NOT NULL,
	`province` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`district` varchar(100),
	`postal_code` varchar(10),
	`biteship_area_id` varchar(64),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`pic_name` varchar(100),
	`pic_phone` varchar(20),
	`pickup_time` varchar(5) NOT NULL DEFAULT '13:00',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_exchange_codes` ADD CONSTRAINT `auth_exchange_codes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_brand_id_brands_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_stocks` ADD CONSTRAINT `warehouse_stocks_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouse_stocks` ADD CONSTRAINT `warehouse_stocks_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_logs_actor_user_id_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_created_at_idx` ON `audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `email_login_codes_email_created_at_idx` ON `email_login_codes` (`email`,`created_at`);--> statement-breakpoint
CREATE INDEX `products_category_id_status_idx` ON `products` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_last_used_at_idx` ON `sessions` (`user_id`,`last_used_at`);--> statement-breakpoint
CREATE INDEX `stock_movements_variant_created_at_idx` ON `stock_movements` (`variant_id`,`created_at`);
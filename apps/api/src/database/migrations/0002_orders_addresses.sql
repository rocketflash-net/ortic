CREATE TABLE `order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned,
	`variant_id` bigint unsigned,
	`product_name` varchar(200) NOT NULL,
	`product_slug` varchar(220) NOT NULL,
	`variant_name` varchar(150),
	`sku` varchar(64) NOT NULL,
	`image_url` varchar(500),
	`price` int unsigned NOT NULL,
	`quantity` int unsigned NOT NULL,
	`weight_gram` int unsigned NOT NULL,
	`subtotal` int unsigned NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`warehouse_id` bigint unsigned NOT NULL,
	`status` enum('awaiting_payment','paid','awaiting_confirmation','processing','awaiting_pickup','shipped','completed','cancelled','rejected','returned','needs_action') NOT NULL DEFAULT 'awaiting_payment',
	`recipient_name` varchar(100) NOT NULL,
	`recipient_phone` varchar(20) NOT NULL,
	`address` text NOT NULL,
	`province` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`district` varchar(100) NOT NULL,
	`postal_code` varchar(10) NOT NULL,
	`biteship_area_id` varchar(64) NOT NULL,
	`address_notes` varchar(255),
	`courier_code` varchar(32) NOT NULL,
	`courier_name` varchar(100) NOT NULL,
	`courier_service_code` varchar(32) NOT NULL,
	`courier_service_name` varchar(100) NOT NULL,
	`courier_duration` varchar(50),
	`weight_gram` int unsigned NOT NULL,
	`insured_value` int unsigned NOT NULL DEFAULT 0,
	`items_total` int unsigned NOT NULL,
	`shipping_fee` int unsigned NOT NULL,
	`insurance_fee` int unsigned NOT NULL DEFAULT 0,
	`service_fee` int unsigned NOT NULL DEFAULT 0,
	`total` int unsigned NOT NULL,
	`mdr_amount` int unsigned NOT NULL DEFAULT 0,
	`payment_provider` varchar(30) NOT NULL,
	`provider_ref` varchar(100),
	`provider_transaction_id` varchar(100),
	`qr_string` text,
	`expires_at` datetime NOT NULL,
	`paid_at` datetime,
	`cancelled_at` datetime,
	`cancel_reason` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_code_unique` UNIQUE(`code`),
	CONSTRAINT `orders_provider_ref_unique` UNIQUE(`provider_ref`)
);
--> statement-breakpoint
CREATE TABLE `user_addresses` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`label` varchar(50),
	`recipient_name` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`address` text NOT NULL,
	`province` varchar(100) NOT NULL,
	`city` varchar(100) NOT NULL,
	`district` varchar(100) NOT NULL,
	`postal_code` varchar(10) NOT NULL,
	`biteship_area_id` varchar(64) NOT NULL,
	`notes` varchar(255),
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('user.role_updated','warehouse.created','warehouse.updated','product.created','product.updated','product.status_updated','brand.created','order.status_updated') NOT NULL;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_addresses` ADD CONSTRAINT `user_addresses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_items_order_id_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `orders_user_id_created_at_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_status_expires_at_idx` ON `orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `user_addresses_user_id_idx` ON `user_addresses` (`user_id`);
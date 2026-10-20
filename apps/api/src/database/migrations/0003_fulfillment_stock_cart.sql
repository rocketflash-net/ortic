CREATE TABLE `cart_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`variant_id` bigint unsigned NOT NULL,
	`quantity` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `cart_items_user_variant_unique` UNIQUE(`user_id`,`variant_id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`type` enum('order_paid','order_needs_action','shipment_failed','order_completed','order_returned','low_stock') NOT NULL,
	`title` varchar(150) NOT NULL,
	`body` varchar(500),
	`link` varchar(255),
	`order_id` bigint unsigned,
	`warehouse_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`type` enum('status','tracking','note') NOT NULL,
	`status` varchar(32),
	`title` varchar(150) NOT NULL,
	`description` varchar(500),
	`is_public` boolean NOT NULL DEFAULT true,
	`actor_user_id` bigint unsigned,
	`occurred_at` datetime NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `action` enum('user.role_updated','warehouse.created','warehouse.updated','product.created','product.updated','product.status_updated','brand.created','order.status_updated','order.accepted','order.rejected','order.refunded','order.shipment_booked','stock.adjusted','stock.transferred','stock.threshold_updated','settings.updated','courier.updated','category.updated','product.duplicated','product.imported','product.repriced') NOT NULL;--> statement-breakpoint
ALTER TABLE `categories` ADD `markup_percent` decimal(5,2);--> statement-breakpoint
ALTER TABLE `order_items` ADD `base_price` int unsigned;--> statement-breakpoint
ALTER TABLE `orders` ADD `stock_state` enum('reserved','committed','released','returned') DEFAULT 'reserved' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `accepted_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `rejected_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `reject_reason` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_status` enum('none','pending','refunded') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_amount` int unsigned;--> statement-breakpoint
ALTER TABLE `orders` ADD `refunded_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `refund_note` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `biteship_order_id` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `waybill_id` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_tracking_id` varchar(64);--> statement-breakpoint
ALTER TABLE `orders` ADD `shipping_status` varchar(32);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_link` varchar(500);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_driver_name` varchar(100);--> statement-breakpoint
ALTER TABLE `orders` ADD `courier_driver_phone` varchar(30);--> statement-breakpoint
ALTER TABLE `orders` ADD `pickup_scheduled_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipment_booked_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipment_attempts` int unsigned DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `shipment_error` varchar(255);--> statement-breakpoint
ALTER TABLE `orders` ADD `shipped_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `delivered_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `completed_at` datetime;--> statement-breakpoint
ALTER TABLE `orders` ADD `tracked_at` datetime;--> statement-breakpoint
ALTER TABLE `product_variants` ADD `sale_price` int unsigned;--> statement-breakpoint
ALTER TABLE `products` ADD `sale_starts_at` datetime;--> statement-breakpoint
ALTER TABLE `products` ADD `sale_ends_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `notifications_read_at` timestamp;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_biteship_order_id_unique` UNIQUE(`biteship_order_id`);--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_created_at_idx` ON `notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `order_events_order_id_occurred_at_idx` ON `order_events` (`order_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `orders_warehouse_id_created_at_idx` ON `orders` (`warehouse_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_paid_at_idx` ON `orders` (`paid_at`);--> statement-breakpoint
-- Pesanan sebelum fitur stok tidak pernah memesan/memotong stok: tandai "released" supaya batal/tolak tidak mengubah stok.
UPDATE `orders` SET `stock_state` = 'released';--> statement-breakpoint
-- Harga dasar historis untuk laporan laba: pakai harga dasar varian saat ini.
UPDATE `order_items` `oi` INNER JOIN `product_variants` `pv` ON `pv`.`id` = `oi`.`variant_id` SET `oi`.`base_price` = `pv`.`base_price` WHERE `oi`.`base_price` IS NULL;

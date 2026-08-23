-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: linkbus
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `advertisements`
--

DROP TABLE IF EXISTS `advertisements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `advertisements` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  `link_url` varchar(255) DEFAULT NULL,
  `type` enum('banner','popup','sidebar') NOT NULL DEFAULT 'banner',
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `priority` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `model_type` varchar(255) NOT NULL,
  `model_id` bigint(20) unsigned DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_model_type_model_id_index` (`model_type`,`model_id`),
  KEY `audit_logs_user_id_index` (`user_id`),
  CONSTRAINT `audit_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bookings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_number` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `trip_id` bigint(20) unsigned NOT NULL,
  `status` enum('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
  `subtotal` int(10) unsigned NOT NULL,
  `discount_amount` int(10) unsigned NOT NULL DEFAULT 0,
  `tax_amount` int(10) unsigned NOT NULL DEFAULT 0,
  `total_amount` int(10) unsigned NOT NULL,
  `payment_method` enum('cash','mtn_mobile_money','airtel_money','card') NOT NULL DEFAULT 'cash',
  `linked_booking_id` bigint(20) unsigned DEFAULT NULL,
  `cancellation_fee` int(10) unsigned NOT NULL DEFAULT 0,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bookings_booking_number_unique` (`booking_number`),
  KEY `bookings_linked_booking_id_foreign` (`linked_booking_id`),
  KEY `bookings_user_id_status_index` (`user_id`,`status`),
  KEY `bookings_trip_id_status_index` (`trip_id`,`status`),
  KEY `bookings_created_at_index` (`created_at`),
  CONSTRAINT `bookings_linked_booking_id_foreign` FOREIGN KEY (`linked_booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `bookings_trip_id_foreign` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`),
  CONSTRAINT `bookings_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bus_routes`
--

DROP TABLE IF EXISTS `bus_routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bus_routes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `origin_terminal_id` bigint(20) unsigned NOT NULL,
  `destination_terminal_id` bigint(20) unsigned NOT NULL,
  `distance_km` smallint(5) unsigned NOT NULL DEFAULT 0,
  `estimated_duration_minutes` smallint(5) unsigned NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `bus_routes_origin_terminal_id_destination_terminal_id_unique` (`origin_terminal_id`,`destination_terminal_id`),
  KEY `bus_routes_destination_terminal_id_foreign` (`destination_terminal_id`),
  CONSTRAINT `bus_routes_destination_terminal_id_foreign` FOREIGN KEY (`destination_terminal_id`) REFERENCES `terminals` (`id`),
  CONSTRAINT `bus_routes_origin_terminal_id_foreign` FOREIGN KEY (`origin_terminal_id`) REFERENCES `terminals` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buses`
--

DROP TABLE IF EXISTS `buses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buses` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `plate_number` varchar(255) NOT NULL,
  `model` varchar(255) NOT NULL,
  `bus_type` enum('standard','vip','sleeper') NOT NULL DEFAULT 'standard',
  `capacity` smallint(5) unsigned NOT NULL DEFAULT 44,
  `status` enum('active','maintenance','retired') NOT NULL DEFAULT 'active',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `buses_plate_number_unique` (`plate_number`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `drivers` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `license_number` varchar(255) NOT NULL,
  `license_expiry` date NOT NULL,
  `status` enum('active','suspended','on_leave') NOT NULL DEFAULT 'active',
  `experience_years` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `drivers_license_number_unique` (`license_number`),
  KEY `drivers_user_id_foreign` (`user_id`),
  CONSTRAINT `drivers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `luggage`
--

DROP TABLE IF EXISTS `luggage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `luggage` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) unsigned NOT NULL,
  `trip_seat_id` bigint(20) unsigned DEFAULT NULL,
  `tag_number` varchar(255) NOT NULL,
  `description` varchar(255) NOT NULL,
  `weight_kg` decimal(5,1) NOT NULL DEFAULT 0.0,
  `status` enum('checked_in','in_transit','delivered','lost') NOT NULL DEFAULT 'checked_in',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `luggage_tag_number_unique` (`tag_number`),
  KEY `luggage_trip_seat_id_foreign` (`trip_seat_id`),
  KEY `luggage_booking_id_index` (`booking_id`),
  KEY `luggage_tag_number_index` (`tag_number`),
  CONSTRAINT `luggage_booking_id_foreign` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `luggage_trip_seat_id_foreign` FOREIGN KEY (`trip_seat_id`) REFERENCES `trip_seats` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `migrations`
--

DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `notifications` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_read_at_index` (`user_id`,`read_at`),
  CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parcels`
--

DROP TABLE IF EXISTS `parcels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parcels` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `sender_name` varchar(255) NOT NULL,
  `sender_phone` varchar(30) NOT NULL,
  `recipient_name` varchar(255) NOT NULL,
  `recipient_phone` varchar(30) NOT NULL,
  `origin_terminal_id` bigint(20) unsigned NOT NULL,
  `destination_terminal_id` bigint(20) unsigned NOT NULL,
  `weight_kg` decimal(5,1) NOT NULL DEFAULT 0.0,
  `description` varchar(255) NOT NULL,
  `tracking_number` varchar(255) NOT NULL,
  `status` enum('received','in_transit','arrived','delivered','lost') NOT NULL DEFAULT 'received',
  `price` int(10) unsigned NOT NULL DEFAULT 0,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parcels_tracking_number_unique` (`tracking_number`),
  KEY `parcels_destination_terminal_id_foreign` (`destination_terminal_id`),
  KEY `parcels_tracking_number_index` (`tracking_number`),
  KEY `parcels_origin_terminal_id_destination_terminal_id_index` (`origin_terminal_id`,`destination_terminal_id`),
  CONSTRAINT `parcels_destination_terminal_id_foreign` FOREIGN KEY (`destination_terminal_id`) REFERENCES `terminals` (`id`),
  CONSTRAINT `parcels_origin_terminal_id_foreign` FOREIGN KEY (`origin_terminal_id`) REFERENCES `terminals` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) unsigned NOT NULL,
  `method` enum('cash','mtn_mobile_money','airtel_money','card') NOT NULL DEFAULT 'cash',
  `amount` int(10) unsigned NOT NULL,
  `status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'completed',
  `transaction_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `payments_transaction_id_unique` (`transaction_id`),
  KEY `payments_booking_id_index` (`booking_id`),
  KEY `payments_status_created_at_index` (`status`,`created_at`),
  CONSTRAINT `payments_booking_id_foreign` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `personal_access_tokens`
--

DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `promo_codes`
--

DROP TABLE IF EXISTS `promo_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `promo_codes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` int(10) unsigned NOT NULL DEFAULT 10,
  `min_booking_amount` int(10) unsigned NOT NULL DEFAULT 0,
  `max_uses` int(10) unsigned NOT NULL DEFAULT 100,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `expires_at` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `promo_codes_code_unique` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_slug_unique` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `seat_locks`
--

DROP TABLE IF EXISTS `seat_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `seat_locks` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint(20) unsigned NOT NULL,
  `trip_id` bigint(20) unsigned NOT NULL,
  `seat_id` bigint(20) unsigned NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `seat_locks_user_id_foreign` (`user_id`),
  KEY `seat_locks_trip_id_foreign` (`trip_id`),
  KEY `seat_locks_seat_id_expires_at_index` (`seat_id`,`expires_at`),
  CONSTRAINT `seat_locks_seat_id_foreign` FOREIGN KEY (`seat_id`) REFERENCES `trip_seats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seat_locks_trip_id_foreign` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
  CONSTRAINT `seat_locks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `key` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `group` enum('company','booking','payment','luggage') NOT NULL DEFAULT 'company',
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `settings_key_unique` (`key`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `terminals`
--

DROP TABLE IF EXISTS `terminals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `terminals` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `latitude` decimal(10,7) NOT NULL DEFAULT 0.0000000,
  `longitude` decimal(10,7) NOT NULL DEFAULT 0.0000000,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `photo` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tickets`
--

DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tickets` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `booking_id` bigint(20) unsigned NOT NULL,
  `trip_seat_id` bigint(20) unsigned NOT NULL,
  `passenger_name` varchar(255) NOT NULL,
  `passenger_phone` varchar(30) DEFAULT NULL,
  `ticket_number` varchar(255) NOT NULL,
  `qr_code` varchar(255) NOT NULL,
  `status` enum('active','used','cancelled') NOT NULL DEFAULT 'active',
  `boarded_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tickets_ticket_number_unique` (`ticket_number`),
  UNIQUE KEY `tickets_qr_code_unique` (`qr_code`),
  KEY `tickets_booking_id_index` (`booking_id`),
  KEY `tickets_trip_seat_id_index` (`trip_seat_id`),
  KEY `tickets_ticket_number_index` (`ticket_number`),
  CONSTRAINT `tickets_booking_id_foreign` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tickets_trip_seat_id_foreign` FOREIGN KEY (`trip_seat_id`) REFERENCES `trip_seats` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trip_seats`
--

DROP TABLE IF EXISTS `trip_seats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trip_seats` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `trip_id` bigint(20) unsigned NOT NULL,
  `seat_number` varchar(5) NOT NULL,
  `seat_class` enum('standard','vip') NOT NULL DEFAULT 'standard',
  `status` enum('available','locked','booked') NOT NULL DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_seats_trip_id_seat_number_unique` (`trip_id`,`seat_number`),
  KEY `trip_seats_trip_id_status_index` (`trip_id`,`status`),
  CONSTRAINT `trip_seats_trip_id_foreign` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=375 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `trips` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `route_id` bigint(20) unsigned NOT NULL,
  `bus_id` bigint(20) unsigned NOT NULL,
  `driver_id` bigint(20) unsigned NOT NULL,
  `departure_time` datetime NOT NULL,
  `arrival_time` datetime NOT NULL,
  `fare` int(10) unsigned NOT NULL,
  `status` enum('scheduled','boarding','in_transit','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `available_seats` smallint(5) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `trips_route_id_foreign` (`route_id`),
  KEY `trips_bus_id_foreign` (`bus_id`),
  KEY `trips_driver_id_foreign` (`driver_id`),
  KEY `trips_status_departure_time_index` (`status`,`departure_time`),
  KEY `trips_departure_time_index` (`departure_time`),
  CONSTRAINT `trips_bus_id_foreign` FOREIGN KEY (`bus_id`) REFERENCES `buses` (`id`),
  CONSTRAINT `trips_driver_id_foreign` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`),
  CONSTRAINT `trips_route_id_foreign` FOREIGN KEY (`route_id`) REFERENCES `bus_routes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `role_id` bigint(20) unsigned NOT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_id_foreign` (`role_id`),
  CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-13 20:44:59

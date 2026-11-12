-- =====================================================================
-- FoodMind — MySQL 8.0 database schema
-- Multi-restaurant food delivery: customers, restaurant partners, riders.
--
-- Design decisions (see database/README.md for the full rationale):
--   * One role per account. `users.role` is the supertype; customers,
--     partners and riders are subtype tables whose (user_id, role) foreign key
--     guarantees, inside the database, that e.g. only a rider can be a rider.
--   * Cash on delivery only; every money amount is DECIMAL(10,2) in PKR.
--   * Riders are assigned automatically: an order is offered to the closest
--     online rider; a decline or timeout moves it to the next closest rider.
--   * No admin: a restaurant or rider becomes active as soon as its required
--     documents are uploaded (procedures activate_restaurant / activate_rider).
--   * Orders copy names and prices at checkout (snapshots), so menu edits never
--     change past orders or receipts.
--   * Cross-table ownership rules (an order's items belong to that order's
--     restaurant, a voucher belongs to the customer using it, …) are enforced
--     with composite foreign keys rather than application code.
--   * Coordinates are stored as POINT SRID 4326 (WGS 84, from the location API)
--     with spatial indexes; distances use ST_Distance_Sphere (metres).
-- =====================================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS foodmind CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE foodmind;

-- ---------------------------------------------------------------------
-- 1. Accounts
-- ---------------------------------------------------------------------

CREATE TABLE users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role           ENUM('customer','partner','rider') NOT NULL,
  full_name      VARCHAR(100)  NOT NULL,
  email          VARCHAR(255)  NOT NULL,           -- case-insensitive collation: one account per email
  phone          VARCHAR(20)   NULL,
  password_hash  VARCHAR(255)  NOT NULL,           -- bcrypt/argon2 hash, never the password
  avatar_url     VARCHAR(500)  NULL,
  status         ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_id_role (id, role),          -- target of the subtype foreign keys
  CONSTRAINT ck_users_email CHECK (email LIKE '_%@_%._%')
) ENGINE=InnoDB;

-- Subtypes: the CHECK pins the role and the composite FK ties it to users.role.
CREATE TABLE customers (
  user_id    BIGINT UNSIGNED NOT NULL,
  role       ENUM('customer','partner','rider') NOT NULL DEFAULT 'customer',
  PRIMARY KEY (user_id),
  CONSTRAINT ck_customers_role CHECK (role = 'customer'),
  CONSTRAINT fk_customers_user FOREIGN KEY (user_id, role) REFERENCES users (id, role)
) ENGINE=InnoDB;

CREATE TABLE partners (
  user_id    BIGINT UNSIGNED NOT NULL,
  role       ENUM('customer','partner','rider') NOT NULL DEFAULT 'partner',
  PRIMARY KEY (user_id),
  CONSTRAINT ck_partners_role CHECK (role = 'partner'),
  CONSTRAINT fk_partners_user FOREIGN KEY (user_id, role) REFERENCES users (id, role)
) ENGINE=InnoDB;

CREATE TABLE riders (
  user_id               BIGINT UNSIGNED NOT NULL,
  role                  ENUM('customer','partner','rider') NOT NULL DEFAULT 'rider',
  city                  VARCHAR(60)  NOT NULL,
  vehicle_type          ENUM('motorbike','scooter','bicycle') NOT NULL,
  vehicle_registration  VARCHAR(20)  NOT NULL,
  status                ENUM('draft','active','suspended') NOT NULL DEFAULT 'draft',
  activated_at          DATETIME NULL,
  is_online             BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_riders_vehicle_registration (vehicle_registration),
  CONSTRAINT ck_riders_role CHECK (role = 'rider'),
  CONSTRAINT ck_riders_activation CHECK (status = 'draft' OR activated_at IS NOT NULL),
  CONSTRAINT ck_riders_online_needs_active CHECK (is_online = FALSE OR status = 'active'),
  CONSTRAINT fk_riders_user FOREIGN KEY (user_id, role) REFERENCES users (id, role)
) ENGINE=InnoDB;

CREATE TABLE rider_documents (
  rider_id     BIGINT UNSIGNED NOT NULL,
  doc_type     ENUM('national_id','driving_license','vehicle_registration','profile_photo') NOT NULL,
  file_url     VARCHAR(500) NOT NULL,
  uploaded_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (rider_id, doc_type),               -- replacing a document overwrites the row
  CONSTRAINT fk_rider_documents_rider FOREIGN KEY (rider_id) REFERENCES riders (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Latest GPS fix per rider (sent by the rider app from the device location API).
-- Kept apart from `riders` because a SPATIAL index needs a NOT NULL column and
-- because this row is rewritten every few seconds.
CREATE TABLE rider_locations (
  rider_id     BIGINT UNSIGNED NOT NULL,
  location     POINT NOT NULL SRID 4326,
  accuracy_m   SMALLINT UNSIGNED NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (rider_id),
  SPATIAL KEY sx_rider_locations_location (location),
  KEY ix_rider_locations_updated (updated_at),
  CONSTRAINT fk_rider_locations_rider FOREIGN KEY (rider_id) REFERENCES riders (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Restaurants
-- ---------------------------------------------------------------------

CREATE TABLE restaurants (
  id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  partner_id             BIGINT UNSIGNED NOT NULL,        -- one partner may own several restaurants
  name                   VARCHAR(120) NOT NULL,
  description            VARCHAR(300) NULL,
  phone                  VARCHAR(20)  NOT NULL,           -- store contact, separate from the login
  email                  VARCHAR(255) NOT NULL,
  address_line           VARCHAR(255) NOT NULL,
  city                   VARCHAR(60)  NOT NULL,
  location               POINT NOT NULL SRID 4326,        -- geocoded from the address by the location API
  logo_url               VARCHAR(500) NULL,
  cover_url              VARCHAR(500) NULL,
  base_delivery_fee      DECIMAL(10,2) NOT NULL DEFAULT 150.00,
  avg_prep_minutes       SMALLINT UNSIGNED NOT NULL DEFAULT 20,
  status                 ENUM('draft','active','suspended') NOT NULL DEFAULT 'draft',
  activated_at           DATETIME NULL,
  is_accepting_orders    BOOLEAN NOT NULL DEFAULT FALSE,  -- the partner's online/offline switch
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_restaurants_partner_name (partner_id, name),
  KEY ix_restaurants_status (status, is_accepting_orders),
  SPATIAL KEY sx_restaurants_location (location),
  CONSTRAINT ck_restaurants_fee CHECK (base_delivery_fee >= 0),
  CONSTRAINT ck_restaurants_prep CHECK (avg_prep_minutes BETWEEN 5 AND 180),
  CONSTRAINT ck_restaurants_activation CHECK (status = 'draft' OR activated_at IS NOT NULL),
  CONSTRAINT ck_restaurants_open_needs_active CHECK (is_accepting_orders = FALSE OR status = 'active'),
  CONSTRAINT fk_restaurants_partner FOREIGN KEY (partner_id) REFERENCES partners (user_id)
) ENGINE=InnoDB;

CREATE TABLE restaurant_documents (
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  doc_type       ENUM('business_license','owner_cnic') NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  uploaded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (restaurant_id, doc_type),
  CONSTRAINT fk_restaurant_documents_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE restaurant_photos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  file_url       VARCHAR(500) NOT NULL,
  sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_restaurant_photos_restaurant (restaurant_id, sort_order),
  CONSTRAINT fk_restaurant_photos_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE cuisines (
  id    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cuisines_name (name)
) ENGINE=InnoDB;

CREATE TABLE restaurant_cuisines (
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  cuisine_id     SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (restaurant_id, cuisine_id),
  KEY ix_restaurant_cuisines_cuisine (cuisine_id),
  CONSTRAINT fk_restaurant_cuisines_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE,
  CONSTRAINT fk_restaurant_cuisines_cuisine FOREIGN KEY (cuisine_id) REFERENCES cuisines (id)
) ENGINE=InnoDB;

-- Weekly opening hours; several rows per day allow split shifts.
-- closes_at < opens_at means the shift runs past midnight.
CREATE TABLE restaurant_hours (
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  day_of_week    TINYINT UNSIGNED NOT NULL,      -- 0 = Monday … 6 = Sunday
  opens_at       TIME NOT NULL,
  closes_at      TIME NOT NULL,
  PRIMARY KEY (restaurant_id, day_of_week, opens_at),
  CONSTRAINT ck_restaurant_hours_day CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT ck_restaurant_hours_span CHECK (opens_at <> closes_at),
  CONSTRAINT fk_restaurant_hours_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Menus
-- ---------------------------------------------------------------------

CREATE TABLE menu_categories (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(60) NOT NULL,
  sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_categories_name (restaurant_id, name),   -- "burgers" = "Burgers" (case-insensitive)
  UNIQUE KEY uq_menu_categories_id_restaurant (id, restaurant_id),
  CONSTRAINT fk_menu_categories_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE menu_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  restaurant_id   BIGINT UNSIGNED NOT NULL,
  category_id     BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(120) NOT NULL,
  description     VARCHAR(500) NULL,
  price           DECIMAL(10,2) NOT NULL,
  image_url       VARCHAR(500) NULL,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,     -- temporary on/off switch
  is_bestseller   BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      DATETIME NULL,                     -- soft delete: past orders still reference the item
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  -- Live (not deleted) item names are unique per restaurant; deleted ones drop out of the key.
  live_name       VARCHAR(120) AS (IF(deleted_at IS NULL, name, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_menu_items_id_restaurant (id, restaurant_id),
  UNIQUE KEY uq_menu_items_live_name (restaurant_id, live_name),
  KEY ix_menu_items_browse (restaurant_id, is_available, deleted_at),
  KEY ix_menu_items_category (category_id, restaurant_id),
  FULLTEXT KEY ft_menu_items_search (name, description),
  CONSTRAINT ck_menu_items_price CHECK (price > 0),
  -- The category must belong to the same restaurant as the item.
  CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id, restaurant_id) REFERENCES menu_categories (id, restaurant_id),
  CONSTRAINT fk_menu_items_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
) ENGINE=InnoDB;

-- Descriptive tags (chicken, spicy, vegetarian, creamy…) used by search and AI matching.
CREATE TABLE tags (
  id    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tags_name (name)
) ENGINE=InnoDB;

CREATE TABLE menu_item_tags (
  menu_item_id  BIGINT UNSIGNED NOT NULL,
  tag_id        SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (menu_item_id, tag_id),
  KEY ix_menu_item_tags_tag (tag_id),
  CONSTRAINT fk_menu_item_tags_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE,
  CONSTRAINT fk_menu_item_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id)
) ENGINE=InnoDB;

-- Customisation: an item has option groups (e.g. "Add-ons", min 0 / max 2),
-- each with priced options (e.g. "Extra Chicken" +200).
CREATE TABLE option_groups (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  menu_item_id  BIGINT UNSIGNED NOT NULL,
  name          VARCHAR(60) NOT NULL,
  min_select    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_select    TINYINT UNSIGNED NOT NULL DEFAULT 1,
  sort_order    SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_option_groups_name (menu_item_id, name),
  UNIQUE KEY uq_option_groups_id_item (id, menu_item_id),
  CONSTRAINT ck_option_groups_range CHECK (max_select >= 1 AND min_select <= max_select),
  CONSTRAINT fk_option_groups_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE options (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id      BIGINT UNSIGNED NOT NULL,
  menu_item_id  BIGINT UNSIGNED NOT NULL,         -- copied from the group so order lines can check ownership
  name          VARCHAR(60) NOT NULL,
  price_delta   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_options_name (group_id, name),
  UNIQUE KEY uq_options_id_item (id, menu_item_id),
  CONSTRAINT ck_options_price CHECK (price_delta >= 0),
  CONSTRAINT fk_options_group FOREIGN KEY (group_id, menu_item_id) REFERENCES option_groups (id, menu_item_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. Customers: addresses, favourites
-- ---------------------------------------------------------------------

CREATE TABLE addresses (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  BIGINT UNSIGNED NOT NULL,
  label        VARCHAR(40)  NOT NULL,             -- Home, Work, University…
  street       VARCHAR(255) NOT NULL,
  area         VARCHAR(100) NULL,
  city         VARCHAR(60)  NOT NULL,
  location     POINT NOT NULL SRID 4326,          -- from the device location API or geocoding
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at   DATETIME NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- At most one default address per customer (NULLs are not compared by UNIQUE).
  default_for  BIGINT UNSIGNED AS (IF(is_default AND deleted_at IS NULL, customer_id, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_addresses_one_default (default_for),
  UNIQUE KEY uq_addresses_id_customer (id, customer_id),
  KEY ix_addresses_customer (customer_id, deleted_at),
  CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers (user_id)
) ENGINE=InnoDB;

CREATE TABLE favorite_items (
  customer_id   BIGINT UNSIGNED NOT NULL,
  menu_item_id  BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, menu_item_id),
  KEY ix_favorite_items_item (menu_item_id),
  CONSTRAINT fk_favorite_items_customer FOREIGN KEY (customer_id) REFERENCES customers (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_items_item FOREIGN KEY (menu_item_id) REFERENCES menu_items (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE favorite_restaurants (
  customer_id    BIGINT UNSIGNED NOT NULL,
  restaurant_id  BIGINT UNSIGNED NOT NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, restaurant_id),
  KEY ix_favorite_restaurants_restaurant (restaurant_id),
  CONSTRAINT fk_favorite_restaurants_customer FOREIGN KEY (customer_id) REFERENCES customers (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_favorite_restaurants_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. Points & vouchers
-- ---------------------------------------------------------------------

-- A voucher is bought with points and can be applied to one order.
CREATE TABLE vouchers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id   BIGINT UNSIGNED NOT NULL,
  code          CHAR(10) NOT NULL,
  value         DECIMAL(10,2) NOT NULL,              -- Rs. off the order
  points_cost   INT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vouchers_code (code),
  UNIQUE KEY uq_vouchers_id_customer (id, customer_id),
  KEY ix_vouchers_customer (customer_id),
  CONSTRAINT ck_vouchers_value CHECK (value > 0 AND points_cost > 0),
  CONSTRAINT ck_vouchers_expiry CHECK (expires_at > created_at),
  CONSTRAINT fk_vouchers_customer FOREIGN KEY (customer_id) REFERENCES customers (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. Orders
-- ---------------------------------------------------------------------

CREATE TABLE orders (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id          BIGINT UNSIGNED NOT NULL,
  restaurant_id        BIGINT UNSIGNED NOT NULL,
  rider_id             BIGINT UNSIGNED NULL,            -- set when a rider accepts the offer
  status               ENUM('placed','preparing','ready','picked_up','delivered','rejected','cancelled') NOT NULL DEFAULT 'placed',

  -- Delivery address copied at checkout (the address book can change later).
  address_id           BIGINT UNSIGNED NULL,
  delivery_label       VARCHAR(40)  NOT NULL,
  delivery_address     VARCHAR(400) NOT NULL,
  delivery_location    POINT NOT NULL SRID 4326,
  delivery_distance_m  INT UNSIGNED NULL,               -- restaurant → customer, from the location API
  customer_note        VARCHAR(300) NULL,

  -- Money (PKR). The CHECKs make the bill internally consistent.
  subtotal             DECIMAL(10,2) NOT NULL,
  delivery_fee         DECIMAL(10,2) NOT NULL,
  platform_fee         DECIMAL(10,2) NOT NULL,
  voucher_id           BIGINT UNSIGNED NULL,
  discount_amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total                DECIMAL(10,2) NOT NULL,
  payment_method       ENUM('cash') NOT NULL DEFAULT 'cash',
  payment_status       ENUM('due','collected') NOT NULL DEFAULT 'due',

  -- Kitchen and hand-over details.
  prep_minutes         SMALLINT UNSIGNED NULL,          -- chosen by the partner on accept
  delay_minutes        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  estimated_ready_at   DATETIME NULL,
  pickup_code          CHAR(4) NULL,                    -- shown to the restaurant, entered by the rider
  proof_photo_url      VARCHAR(500) NULL,
  rejection_reason     VARCHAR(200) NULL,

  placed_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Derived keys for "partial unique" rules MySQL has no WHERE-clause indexes for:
  --   a rider can carry only one active order at a time;
  --   a voucher can be attached to only one order that was not cancelled/rejected.
  active_rider_id      BIGINT UNSIGNED AS (IF(status IN ('preparing','ready','picked_up'), rider_id, NULL)) VIRTUAL,
  active_voucher_id    BIGINT UNSIGNED AS (IF(status IN ('rejected','cancelled'), NULL, voucher_id)) VIRTUAL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_active_rider (active_rider_id),
  UNIQUE KEY uq_orders_active_voucher (active_voucher_id),
  UNIQUE KEY uq_orders_id_restaurant (id, restaurant_id),
  UNIQUE KEY uq_orders_id_customer_restaurant (id, customer_id, restaurant_id),
  UNIQUE KEY uq_orders_id_rider (id, rider_id),
  KEY ix_orders_customer (customer_id, placed_at),
  KEY ix_orders_restaurant_queue (restaurant_id, status, placed_at),
  KEY ix_orders_rider (rider_id, status),
  SPATIAL KEY sx_orders_delivery_location (delivery_location),

  CONSTRAINT ck_orders_amounts CHECK (subtotal > 0 AND delivery_fee >= 0 AND platform_fee >= 0
                                      AND discount_amount >= 0 AND discount_amount <= subtotal),
  CONSTRAINT ck_orders_total CHECK (total = subtotal + delivery_fee + platform_fee - discount_amount),
  CONSTRAINT ck_orders_discount_needs_voucher CHECK (voucher_id IS NOT NULL OR discount_amount = 0),
  CONSTRAINT ck_orders_rider_before_pickup CHECK (status NOT IN ('picked_up','delivered') OR rider_id IS NOT NULL),
  CONSTRAINT ck_orders_cash_on_delivery CHECK (payment_status = 'due' OR status = 'delivered'),
  CONSTRAINT ck_orders_prep CHECK (status IN ('placed','rejected','cancelled') OR prep_minutes IS NOT NULL),

  CONSTRAINT fk_orders_customer   FOREIGN KEY (customer_id)   REFERENCES customers (user_id),
  CONSTRAINT fk_orders_restaurant FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
  CONSTRAINT fk_orders_rider      FOREIGN KEY (rider_id)      REFERENCES riders (user_id),
  -- The address and voucher must belong to the same customer as the order.
  CONSTRAINT fk_orders_address    FOREIGN KEY (address_id, customer_id) REFERENCES addresses (id, customer_id),
  CONSTRAINT fk_orders_voucher    FOREIGN KEY (voucher_id, customer_id) REFERENCES vouchers (id, customer_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id       BIGINT UNSIGNED NOT NULL,
  restaurant_id  BIGINT UNSIGNED NOT NULL,      -- equals the order's restaurant (enforced below)
  menu_item_id   BIGINT UNSIGNED NOT NULL,
  item_name      VARCHAR(120) NOT NULL,         -- snapshot at checkout
  unit_price     DECIMAL(10,2) NOT NULL,        -- snapshot at checkout (includes no options)
  options_price  DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- sum of chosen option deltas, per unit
  quantity       SMALLINT UNSIGNED NOT NULL,
  line_total     DECIMAL(10,2) AS ((unit_price + options_price) * quantity) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_order_items_id_order (id, order_id),
  UNIQUE KEY uq_order_items_id_item (id, menu_item_id),
  KEY ix_order_items_order (order_id),
  KEY ix_order_items_menu_item (menu_item_id),
  CONSTRAINT ck_order_items_quantity CHECK (quantity BETWEEN 1 AND 99),
  CONSTRAINT ck_order_items_price CHECK (unit_price > 0 AND options_price >= 0),
  -- Every line comes from the order's own restaurant.
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id, restaurant_id) REFERENCES orders (id, restaurant_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_menu_item FOREIGN KEY (menu_item_id, restaurant_id) REFERENCES menu_items (id, restaurant_id)
) ENGINE=InnoDB;

CREATE TABLE order_item_options (
  order_item_id  BIGINT UNSIGNED NOT NULL,
  menu_item_id   BIGINT UNSIGNED NOT NULL,
  option_id      BIGINT UNSIGNED NOT NULL,
  option_name    VARCHAR(60) NOT NULL,          -- snapshot
  price_delta    DECIMAL(10,2) NOT NULL,        -- snapshot
  PRIMARY KEY (order_item_id, option_id),
  KEY ix_order_item_options_option (option_id),
  CONSTRAINT ck_order_item_options_price CHECK (price_delta >= 0),
  -- The chosen option must belong to the dish on this order line.
  CONSTRAINT fk_order_item_options_line FOREIGN KEY (order_item_id, menu_item_id) REFERENCES order_items (id, menu_item_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_options_option FOREIGN KEY (option_id, menu_item_id) REFERENCES options (id, menu_item_id)
) ENGINE=InnoDB;

-- Audit trail of every status change (written by triggers).
CREATE TABLE order_status_history (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    BIGINT UNSIGNED NOT NULL,
  status      ENUM('placed','preparing','ready','picked_up','delivered','rejected','cancelled') NOT NULL,
  changed_by  BIGINT UNSIGNED NULL,               -- user who caused it (set via @app_user_id), NULL = system
  changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_order_status_history_order (order_id, changed_at),
  CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_status_history_user FOREIGN KEY (changed_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. Rider assignment (closest rider first; decline/timeout → next closest)
-- ---------------------------------------------------------------------

CREATE TABLE delivery_offers (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      BIGINT UNSIGNED NOT NULL,
  rider_id      BIGINT UNSIGNED NOT NULL,
  distance_m    INT UNSIGNED NOT NULL,            -- rider → restaurant when offered
  offered_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  response      ENUM('pending','accepted','declined','expired') NOT NULL DEFAULT 'pending',
  responded_at  DATETIME NULL,
  pending_order_id   BIGINT UNSIGNED AS (IF(response = 'pending', order_id, NULL)) VIRTUAL,
  pending_rider_id   BIGINT UNSIGNED AS (IF(response = 'pending', rider_id, NULL)) VIRTUAL,
  accepted_order_id  BIGINT UNSIGNED AS (IF(response = 'accepted', order_id, NULL)) VIRTUAL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery_offers_once (order_id, rider_id),          -- never offer the same order to a rider twice
  UNIQUE KEY uq_delivery_offers_one_pending_per_order (pending_order_id),
  UNIQUE KEY uq_delivery_offers_one_pending_per_rider (pending_rider_id),
  UNIQUE KEY uq_delivery_offers_one_accepted (accepted_order_id),
  KEY ix_delivery_offers_rider (rider_id, response),
  KEY ix_delivery_offers_expiry (response, expires_at),
  CONSTRAINT ck_delivery_offers_window CHECK (expires_at > offered_at),
  CONSTRAINT ck_delivery_offers_response CHECK ((response = 'pending') = (responded_at IS NULL)),
  CONSTRAINT fk_delivery_offers_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_delivery_offers_rider FOREIGN KEY (rider_id) REFERENCES riders (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. Reviews & ratings
-- ---------------------------------------------------------------------

-- One review per delivered order: restaurant rating, optional rider rating and comment.
CREATE TABLE order_reviews (
  order_id           BIGINT UNSIGNED NOT NULL,
  customer_id        BIGINT UNSIGNED NOT NULL,
  restaurant_id      BIGINT UNSIGNED NOT NULL,
  restaurant_rating  TINYINT UNSIGNED NOT NULL,
  rider_rating       TINYINT UNSIGNED NULL,
  comment            VARCHAR(1000) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  KEY ix_order_reviews_restaurant (restaurant_id, created_at),
  KEY ix_order_reviews_customer (customer_id, created_at),
  CONSTRAINT ck_order_reviews_ratings CHECK (restaurant_rating BETWEEN 1 AND 5 AND (rider_rating IS NULL OR rider_rating BETWEEN 1 AND 5)),
  -- Reviewer and restaurant must match the order (delivered status is checked by trigger).
  CONSTRAINT fk_order_reviews_order FOREIGN KEY (order_id, customer_id, restaurant_id) REFERENCES orders (id, customer_id, restaurant_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional per-dish ratings within a review.
CREATE TABLE order_item_ratings (
  order_item_id  BIGINT UNSIGNED NOT NULL,
  order_id       BIGINT UNSIGNED NOT NULL,
  rating         TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (order_item_id),
  KEY ix_order_item_ratings_order (order_id),
  CONSTRAINT ck_order_item_ratings_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_order_item_ratings_line FOREIGN KEY (order_item_id, order_id) REFERENCES order_items (id, order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_ratings_review FOREIGN KEY (order_id) REFERENCES order_reviews (order_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE review_tags (
  id    SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name  VARCHAR(40) NOT NULL,                       -- Great taste, Generous portion…
  PRIMARY KEY (id),
  UNIQUE KEY uq_review_tags_name (name)
) ENGINE=InnoDB;

CREATE TABLE order_review_tags (
  order_id  BIGINT UNSIGNED NOT NULL,
  tag_id    SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (order_id, tag_id),
  CONSTRAINT fk_order_review_tags_review FOREIGN KEY (order_id) REFERENCES order_reviews (order_id) ON DELETE CASCADE,
  CONSTRAINT fk_order_review_tags_tag FOREIGN KEY (tag_id) REFERENCES review_tags (id)
) ENGINE=InnoDB;

-- The rider's rating of the hand-over (customer reachable, correct address…).
CREATE TABLE rider_feedback (
  order_id    BIGINT UNSIGNED NOT NULL,
  rider_id    BIGINT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  comment     VARCHAR(300) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (order_id),
  CONSTRAINT ck_rider_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  -- Only the rider who carried the order can leave feedback on it.
  CONSTRAINT fk_rider_feedback_order FOREIGN KEY (order_id, rider_id) REFERENCES orders (id, rider_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Points ledger: +20 per delivered order, +20 per first review, −cost per voucher.
-- The balance is SUM(delta); unique keys make each award happen at most once.
CREATE TABLE points_ledger (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id  BIGINT UNSIGNED NOT NULL,
  delta        INT NOT NULL,
  reason       ENUM('order_delivered','review_written','voucher_redeemed') NOT NULL,
  order_id     BIGINT UNSIGNED NULL,
  voucher_id   BIGINT UNSIGNED NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_points_once_per_order (reason, order_id),
  UNIQUE KEY uq_points_once_per_voucher (voucher_id),
  KEY ix_points_customer (customer_id, created_at),
  CONSTRAINT ck_points_shape CHECK (
    (reason IN ('order_delivered','review_written') AND order_id IS NOT NULL AND voucher_id IS NULL AND delta > 0) OR
    (reason = 'voucher_redeemed' AND voucher_id IS NOT NULL AND order_id IS NULL AND delta < 0)),
  CONSTRAINT fk_points_customer FOREIGN KEY (customer_id) REFERENCES customers (user_id),
  CONSTRAINT fk_points_order FOREIGN KEY (order_id) REFERENCES orders (id),
  CONSTRAINT fk_points_voucher FOREIGN KEY (voucher_id, customer_id) REFERENCES vouchers (id, customer_id)
) ENGINE=InnoDB;

-- =====================================================================
-- Triggers: rules that span rows or tables
-- =====================================================================
DELIMITER $$

-- Allowed order transitions (the same lifecycle the app uses):
-- placed → preparing | rejected | cancelled;  preparing → ready;  ready → picked_up;  picked_up → delivered.
CREATE TRIGGER trg_orders_before_update BEFORE UPDATE ON orders FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status AND NOT (
       (OLD.status = 'placed'    AND NEW.status IN ('preparing','rejected','cancelled')) OR
       (OLD.status = 'preparing' AND NEW.status = 'ready') OR
       (OLD.status = 'ready'     AND NEW.status = 'picked_up') OR
       (OLD.status = 'picked_up' AND NEW.status = 'delivered')) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid order status transition';
  END IF;
  -- Accepting an order fixes the prep time and the expected ready time.
  IF NEW.status = 'preparing' AND OLD.status = 'placed' THEN
    SET NEW.estimated_ready_at = NOW() + INTERVAL NEW.prep_minutes MINUTE;
  END IF;
  -- A delay pushes the expected ready time back.
  IF NEW.delay_minutes > OLD.delay_minutes AND NEW.estimated_ready_at IS NOT NULL THEN
    SET NEW.estimated_ready_at = OLD.estimated_ready_at + INTERVAL (NEW.delay_minutes - OLD.delay_minutes) MINUTE;
  END IF;
  -- Cash is collected at the door.
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    SET NEW.payment_status = 'collected';
  END IF;
END$$

CREATE TRIGGER trg_orders_after_insert AFTER INSERT ON orders FOR EACH ROW
BEGIN
  INSERT INTO order_status_history (order_id, status, changed_by) VALUES (NEW.id, NEW.status, @app_user_id);
END$$

CREATE TRIGGER trg_orders_after_update AFTER UPDATE ON orders FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by) VALUES (NEW.id, NEW.status, @app_user_id);
    -- +20 points when the order is delivered (idempotent through uq_points_once_per_order).
    IF NEW.status = 'delivered' THEN
      INSERT INTO points_ledger (customer_id, delta, reason, order_id)
      VALUES (NEW.customer_id, 20, 'order_delivered', NEW.id)
      ON DUPLICATE KEY UPDATE id = id;
    END IF;
  END IF;
END$$

-- A rider accepting an offer becomes the order's rider and gets a pickup code.
CREATE TRIGGER trg_delivery_offers_before_update BEFORE UPDATE ON delivery_offers FOR EACH ROW
BEGIN
  IF OLD.response <> 'pending' AND NEW.response <> OLD.response THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This offer has already been answered';
  END IF;
  IF NEW.response = 'accepted' AND OLD.response = 'pending' AND NOW() > OLD.expires_at THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This offer has expired';
  END IF;
  IF NEW.response <> 'pending' AND NEW.responded_at IS NULL THEN
    SET NEW.responded_at = NOW();
  END IF;
END$$

CREATE TRIGGER trg_delivery_offers_after_update AFTER UPDATE ON delivery_offers FOR EACH ROW
BEGIN
  IF NEW.response = 'accepted' AND OLD.response = 'pending' THEN
    UPDATE orders
       SET rider_id = NEW.rider_id,
           pickup_code = LPAD(FLOOR(RAND() * 10000), 4, '0')
     WHERE id = NEW.order_id AND rider_id IS NULL AND status IN ('preparing','ready');
    IF ROW_COUNT() = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order is no longer waiting for a rider';
    END IF;
  END IF;
END$$

-- Reviews: only for delivered orders; a rider rating needs a rider; first review earns +20.
CREATE TRIGGER trg_order_reviews_before_insert BEFORE INSERT ON order_reviews FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(20);
  DECLARE v_rider BIGINT UNSIGNED;
  SELECT status, rider_id INTO v_status, v_rider FROM orders WHERE id = NEW.order_id;
  IF v_status <> 'delivered' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only delivered orders can be reviewed';
  END IF;
  IF NEW.rider_rating IS NOT NULL AND v_rider IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This order had no rider to rate';
  END IF;
END$$

CREATE TRIGGER trg_order_reviews_after_insert AFTER INSERT ON order_reviews FOR EACH ROW
BEGIN
  INSERT INTO points_ledger (customer_id, delta, reason, order_id)
  VALUES (NEW.customer_id, 20, 'review_written', NEW.order_id)
  ON DUPLICATE KEY UPDATE id = id;
END$$

CREATE TRIGGER trg_rider_feedback_before_insert BEFORE INSERT ON rider_feedback FOR EACH ROW
BEGIN
  IF (SELECT status FROM orders WHERE id = NEW.order_id) <> 'delivered' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Feedback is possible once the order is delivered';
  END IF;
END$$

-- A voucher can only be used before it expires.
CREATE TRIGGER trg_orders_before_insert BEFORE INSERT ON orders FOR EACH ROW
BEGIN
  IF NEW.voucher_id IS NOT NULL AND
     (SELECT expires_at FROM vouchers WHERE id = NEW.voucher_id) <= NOW() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This voucher has expired';
  END IF;
  IF NOT (SELECT status = 'active' AND is_accepting_orders FROM restaurants WHERE id = NEW.restaurant_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This restaurant is not accepting orders';
  END IF;
END$$

-- =====================================================================
-- Procedures: multi-step operations that must be atomic
-- =====================================================================

-- No admin: a restaurant becomes active once its required details and documents exist.
CREATE PROCEDURE activate_restaurant(IN p_restaurant_id BIGINT UNSIGNED)
BEGIN
  IF (SELECT logo_url FROM restaurants WHERE id = p_restaurant_id) IS NULL
     OR (SELECT COUNT(*) FROM restaurant_documents WHERE restaurant_id = p_restaurant_id) < 2
     OR NOT EXISTS (SELECT 1 FROM restaurant_cuisines WHERE restaurant_id = p_restaurant_id)
     OR NOT EXISTS (SELECT 1 FROM restaurant_hours WHERE restaurant_id = p_restaurant_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Restaurant needs a logo, business licence, owner CNIC, a cuisine and opening hours';
  END IF;
  UPDATE restaurants SET status = 'active', activated_at = COALESCE(activated_at, NOW())
   WHERE id = p_restaurant_id AND status = 'draft';
END$$

CREATE PROCEDURE activate_rider(IN p_rider_id BIGINT UNSIGNED)
BEGIN
  IF (SELECT COUNT(*) FROM rider_documents WHERE rider_id = p_rider_id) < 4 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rider needs national ID, driving licence, vehicle registration and profile photo';
  END IF;
  UPDATE riders SET status = 'active', activated_at = COALESCE(activated_at, NOW())
   WHERE user_id = p_rider_id AND status = 'draft';
END$$

-- Trade points for a voucher. The customer row is locked so two requests
-- cannot spend the same points.
CREATE PROCEDURE redeem_voucher(IN p_customer_id BIGINT UNSIGNED, IN p_points INT UNSIGNED,
                                IN p_value DECIMAL(10,2), IN p_valid_days SMALLINT UNSIGNED,
                                OUT p_voucher_id BIGINT UNSIGNED)
BEGIN
  DECLARE v_balance INT;
  DECLARE v_locked BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT user_id INTO v_locked FROM customers WHERE user_id = p_customer_id FOR UPDATE;
  IF v_locked IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown customer';
  END IF;
  SELECT COALESCE(SUM(delta), 0) INTO v_balance FROM points_ledger WHERE customer_id = p_customer_id;
  IF v_balance < p_points THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough points';
  END IF;
  INSERT INTO vouchers (customer_id, code, value, points_cost, expires_at)
  VALUES (p_customer_id, UPPER(LEFT(REPLACE(UUID(), '-', ''), 10)), p_value, p_points, NOW() + INTERVAL p_valid_days DAY);
  SET p_voucher_id = LAST_INSERT_ID();
  INSERT INTO points_ledger (customer_id, delta, reason, voucher_id)
  VALUES (p_customer_id, -CAST(p_points AS SIGNED), 'voucher_redeemed', p_voucher_id);
  COMMIT;
END$$

-- Offer an order to the closest eligible rider within p_radius_m of the restaurant.
-- Eligible: active, online, location updated in the last 2 minutes, no active order,
-- no other pending offer, and not already offered this order.
-- Straight-line distance ranks candidates; the backend may refine the top few with a
-- road-distance API before calling this. Call again after a decline or timeout.
-- Returns the new offer (or no row when nobody is available).
CREATE PROCEDURE offer_order_to_nearest_rider(IN p_order_id BIGINT UNSIGNED,
                                              IN p_radius_m INT UNSIGNED,
                                              IN p_timeout_s SMALLINT UNSIGNED)
BEGIN
  DECLARE v_pickup POINT;          -- values keep SRID 4326 from the column
  DECLARE v_lat DOUBLE;
  DECLARE v_lng DOUBLE;
  DECLARE v_dlat DOUBLE;
  DECLARE v_dlng DOUBLE;
  DECLARE v_box POLYGON;
  DECLARE v_offer BIGINT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT r.location INTO v_pickup
    FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
   WHERE o.id = p_order_id AND o.status IN ('preparing','ready') AND o.rider_id IS NULL
   FOR UPDATE;
  IF v_pickup IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order is not waiting for a rider';
  END IF;

  -- Close the previous offer for this order if it ran out of time.
  UPDATE delivery_offers SET response = 'expired', responded_at = NOW()
   WHERE order_id = p_order_id AND response = 'pending' AND expires_at <= NOW();
  IF EXISTS (SELECT 1 FROM delivery_offers WHERE order_id = p_order_id AND response = 'pending') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An offer for this order is still open';
  END IF;

  -- Bounding box around the restaurant so the spatial index narrows the search.
  SET v_lat = ST_Latitude(v_pickup);
  SET v_lng = ST_Longitude(v_pickup);
  SET v_dlat = p_radius_m / 111320;
  SET v_dlng = p_radius_m / (111320 * COS(RADIANS(v_lat)));
  SET v_box = ST_GeomFromText(CONCAT('POLYGON((',
      v_lng - v_dlng, ' ', v_lat - v_dlat, ',', v_lng + v_dlng, ' ', v_lat - v_dlat, ',',
      v_lng + v_dlng, ' ', v_lat + v_dlat, ',', v_lng - v_dlng, ' ', v_lat + v_dlat, ',',
      v_lng - v_dlng, ' ', v_lat - v_dlat, '))'), 4326, 'axis-order=long-lat');

  INSERT INTO delivery_offers (order_id, rider_id, distance_m, expires_at)
  SELECT p_order_id, rl.rider_id, ROUND(ST_Distance_Sphere(rl.location, v_pickup)), NOW() + INTERVAL p_timeout_s SECOND
    FROM rider_locations rl
    JOIN riders rd ON rd.user_id = rl.rider_id
   WHERE MBRContains(v_box, rl.location)
     AND ST_Distance_Sphere(rl.location, v_pickup) <= p_radius_m
     AND rd.status = 'active' AND rd.is_online
     AND rl.updated_at >= NOW() - INTERVAL 2 MINUTE
     AND NOT EXISTS (SELECT 1 FROM orders a WHERE a.active_rider_id = rl.rider_id)
     AND NOT EXISTS (SELECT 1 FROM delivery_offers p WHERE p.pending_rider_id = rl.rider_id)
     AND NOT EXISTS (SELECT 1 FROM delivery_offers d WHERE d.order_id = p_order_id AND d.rider_id = rl.rider_id)
   ORDER BY ST_Distance_Sphere(rl.location, v_pickup), rl.rider_id
   LIMIT 1;

  SET v_offer = IF(ROW_COUNT() = 1, LAST_INSERT_ID(), NULL);
  COMMIT;
  SELECT id AS offer_id, rider_id, distance_m, expires_at FROM delivery_offers WHERE id = v_offer;
END$$

DELIMITER ;

-- =====================================================================
-- Views: derived values are computed, not stored twice
-- =====================================================================

CREATE VIEW v_customer_points AS
SELECT c.user_id AS customer_id, COALESCE(SUM(p.delta), 0) AS points_balance
  FROM customers c LEFT JOIN points_ledger p ON p.customer_id = c.user_id
 GROUP BY c.user_id;

CREATE VIEW v_voucher_status AS
SELECT v.id AS voucher_id, v.customer_id, v.code, v.value, v.expires_at,
       CASE WHEN EXISTS (SELECT 1 FROM orders o WHERE o.active_voucher_id = v.id) THEN 'used'
            WHEN v.expires_at <= NOW() THEN 'expired'
            ELSE 'available' END AS status
  FROM vouchers v;

CREATE VIEW v_restaurant_ratings AS
SELECT r.id AS restaurant_id, ROUND(AVG(rv.restaurant_rating), 1) AS rating, COUNT(rv.order_id) AS review_count
  FROM restaurants r LEFT JOIN order_reviews rv ON rv.restaurant_id = r.id
 GROUP BY r.id;

CREATE VIEW v_menu_item_ratings AS
SELECT oi.menu_item_id, ROUND(AVG(ir.rating), 1) AS rating, COUNT(*) AS rating_count
  FROM order_item_ratings ir JOIN order_items oi ON oi.id = ir.order_item_id
 GROUP BY oi.menu_item_id;

CREATE VIEW v_rider_ratings AS
SELECT o.rider_id, ROUND(AVG(rv.rider_rating), 1) AS rating, COUNT(rv.rider_rating) AS rating_count
  FROM orders o JOIN order_reviews rv ON rv.order_id = o.id
 WHERE o.rider_id IS NOT NULL
 GROUP BY o.rider_id;

-- Rider earnings: the delivery fee of each delivered order.
CREATE VIEW v_rider_daily_earnings AS
SELECT o.rider_id, DATE(h.changed_at) AS delivery_date, COUNT(*) AS deliveries, SUM(o.delivery_fee) AS earnings
  FROM orders o JOIN order_status_history h ON h.order_id = o.id AND h.status = 'delivered'
 GROUP BY o.rider_id, DATE(h.changed_at);

-- What customers can browse right now.
CREATE VIEW v_menu_available AS
SELECT mi.*, r.name AS restaurant_name, mc.name AS category_name
  FROM menu_items mi
  JOIN restaurants r ON r.id = mi.restaurant_id
  JOIN menu_categories mc ON mc.id = mi.category_id
 WHERE mi.deleted_at IS NULL AND mi.is_available AND r.status = 'active';

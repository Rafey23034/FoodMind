-- FoodMind demo data (generated from src/data/foodmind.json). Run after schema.sql.
-- Every demo account uses the password 123456.
USE foodmind;
SET @app_user_id = NULL;

INSERT INTO users (id, role, full_name, email, phone, password_hash) VALUES
  (1, 'customer', 'FoodMind Customer', 'demo@food.com', '03001110001', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (2, 'partner', 'Urban Bites Partner', 'partner@food.com', '03001110002', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (3, 'partner', 'Bella Kitchen Partner', 'bella@food.com', '03001110003', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (4, 'partner', 'Burger Lab Partner', 'burgerlab@food.com', '03001110004', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (5, 'rider', 'Tariq Mehmood', 'rider@food.com', '03001234567', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (6, 'rider', 'Ahmed Raza', 'ahmed.rider@food.com', '03001110006', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (7, 'rider', 'Bilal Khan', 'bilal.rider@food.com', '03001110007', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe'),
  (8, 'customer', 'Ayesha Khan', 'ayesha@food.com', '03001110008', '$2b$10$dN.5TnoadQph81uoPTzCZeV1.j9nKWtFKNYiwJWcO9REg8nTaYZNe');
INSERT INTO customers (user_id) VALUES (1), (8);
INSERT INTO partners (user_id) VALUES (2), (3), (4);
INSERT INTO riders (user_id, city, vehicle_type, vehicle_registration) VALUES
  (5, 'Lahore', 'motorbike', 'LEB-2048'),
  (6, 'Lahore', 'motorbike', 'LEA-7781'),
  (7, 'Lahore', 'scooter',   'LEC-1290');
INSERT INTO rider_documents (rider_id, doc_type, file_url) VALUES
  (5, 'national_id', 'https://files.foodmind.pk/riders/5/national_id.jpg'),
  (5, 'driving_license', 'https://files.foodmind.pk/riders/5/driving_license.jpg'),
  (5, 'vehicle_registration', 'https://files.foodmind.pk/riders/5/vehicle_registration.jpg'),
  (5, 'profile_photo', 'https://files.foodmind.pk/riders/5/profile_photo.jpg'),
  (6, 'national_id', 'https://files.foodmind.pk/riders/6/national_id.jpg'),
  (6, 'driving_license', 'https://files.foodmind.pk/riders/6/driving_license.jpg'),
  (6, 'vehicle_registration', 'https://files.foodmind.pk/riders/6/vehicle_registration.jpg'),
  (6, 'profile_photo', 'https://files.foodmind.pk/riders/6/profile_photo.jpg'),
  (7, 'national_id', 'https://files.foodmind.pk/riders/7/national_id.jpg'),
  (7, 'driving_license', 'https://files.foodmind.pk/riders/7/driving_license.jpg'),
  (7, 'vehicle_registration', 'https://files.foodmind.pk/riders/7/vehicle_registration.jpg'),
  (7, 'profile_photo', 'https://files.foodmind.pk/riders/7/profile_photo.jpg');
CALL activate_rider(5); CALL activate_rider(6); CALL activate_rider(7);
UPDATE riders SET is_online = TRUE WHERE user_id IN (5, 6, 7);
INSERT INTO rider_locations (rider_id, location, accuracy_m) VALUES
  (5, ST_GeomFromText('POINT(74.2761 31.4722)', 4326, 'axis-order=long-lat'), 12),
  (6, ST_GeomFromText('POINT(74.2954 31.4861)', 4326, 'axis-order=long-lat'), 15),
  (7, ST_GeomFromText('POINT(74.3449 31.5151)', 4326, 'axis-order=long-lat'), 10);

INSERT INTO restaurants (id, partner_id, name, description, phone, email, address_line, city, location, logo_url, cover_url, base_delivery_fee, avg_prep_minutes) VALUES
  (1, 2, 'Urban Bites', 'Burgers, pasta, pizza, crispy sides and more, all from Urban Bites.', '0300 1234567', 'hello@urbanbites.pk', 'Main Boulevard, Johar Town', 'Lahore', ST_GeomFromText('POINT(74.2728 31.4697)', 4326, 'axis-order=long-lat'), 'https://files.foodmind.pk/restaurants/1/logo.png', 'https://files.foodmind.pk/restaurants/1/cover.jpg', 150, 20),
  (2, 3, 'Bella Kitchen', 'Italian comfort food, fresh pasta and garlic bread.', '0300 2223344', 'hello@bellakitchen.pk', 'MM Alam Road, Gulberg III', 'Lahore', ST_GeomFromText('POINT(74.351 31.512)', 4326, 'axis-order=long-lat'), 'https://files.foodmind.pk/restaurants/2/logo.png', 'https://files.foodmind.pk/restaurants/2/cover.jpg', 180, 25),
  (3, 4, 'Burger Lab', 'Smash burgers and loaded fries, open late.', '0300 5556677', 'hello@burgerlab.pk', 'Y Block Commercial, DHA Phase 3', 'Lahore', ST_GeomFromText('POINT(74.379 31.471)', 4326, 'axis-order=long-lat'), 'https://files.foodmind.pk/restaurants/3/logo.png', 'https://files.foodmind.pk/restaurants/3/cover.jpg', 200, 18);
INSERT INTO restaurant_documents (restaurant_id, doc_type, file_url) VALUES
  (1, 'business_license', 'https://files.foodmind.pk/restaurants/1/business_license.pdf'),
  (1, 'owner_cnic', 'https://files.foodmind.pk/restaurants/1/owner_cnic.pdf'),
  (2, 'business_license', 'https://files.foodmind.pk/restaurants/2/business_license.pdf'),
  (2, 'owner_cnic', 'https://files.foodmind.pk/restaurants/2/owner_cnic.pdf'),
  (3, 'business_license', 'https://files.foodmind.pk/restaurants/3/business_license.pdf'),
  (3, 'owner_cnic', 'https://files.foodmind.pk/restaurants/3/owner_cnic.pdf');
INSERT INTO cuisines (id, name) VALUES (1, 'Burgers'), (2, 'Fast Food'), (3, 'Pizza'), (4, 'Pasta'), (5, 'Desi'), (6, 'Italian'), (7, 'Desserts');
INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (2, 4), (2, 6), (3, 1), (3, 2);
INSERT INTO restaurant_hours (restaurant_id, day_of_week, opens_at, closes_at) VALUES
  (1, 0, '11:00', '23:00'),
  (2, 0, '12:00', '15:30'),
  (2, 0, '18:00', '23:30'),
  (3, 0, '17:00', '02:00'),
  (1, 1, '11:00', '23:00'),
  (2, 1, '12:00', '15:30'),
  (2, 1, '18:00', '23:30'),
  (3, 1, '17:00', '02:00'),
  (1, 2, '11:00', '23:00'),
  (2, 2, '12:00', '15:30'),
  (2, 2, '18:00', '23:30'),
  (3, 2, '17:00', '02:00'),
  (1, 3, '11:00', '23:00'),
  (2, 3, '12:00', '15:30'),
  (2, 3, '18:00', '23:30'),
  (3, 3, '17:00', '02:00'),
  (1, 4, '11:00', '23:00'),
  (2, 4, '12:00', '15:30'),
  (2, 4, '18:00', '23:30'),
  (3, 4, '17:00', '02:00'),
  (1, 5, '11:00', '23:00'),
  (2, 5, '12:00', '15:30'),
  (2, 5, '18:00', '23:30'),
  (3, 5, '17:00', '02:00'),
  (1, 6, '11:00', '23:00'),
  (2, 6, '12:00', '15:30'),
  (2, 6, '18:00', '23:30'),
  (3, 6, '17:00', '02:00');
CALL activate_restaurant(1); CALL activate_restaurant(2); CALL activate_restaurant(3);
UPDATE restaurants SET is_accepting_orders = TRUE;

INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES
  (1, 1, 'Pasta', 0),
  (2, 1, 'Burgers', 1),
  (3, 1, 'Sides', 2),
  (4, 1, 'Pizza', 3),
  (5, 1, 'Desi', 4),
  (6, 2, 'Pasta', 0),
  (7, 2, 'Sides', 1),
  (8, 3, 'Burgers', 0),
  (9, 3, 'Sides', 1);
INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, image_url, is_recommended) VALUES
  (1, 1, 1, 'Creamy Chicken Pasta', 'Creamy fettuccine pasta with grilled chicken, parmesan, herbs and signature white sauce.', 1050.00, 'https://files.foodmind.pk/menu/creamy-pasta.png', TRUE),
  (2, 1, 2, 'Zinger Burger', 'Crispy chicken fillet, lettuce and house sauce in a soft bun.', 790.00, 'https://files.foodmind.pk/menu/zinger-burger.png', TRUE),
  (3, 1, 2, 'Classic Smash Burger', 'Beef patty, cheddar cheese, caramelized onion and special sauce.', 890.00, 'https://files.foodmind.pk/menu/classic-smash.png', TRUE),
  (4, 1, 2, 'Fire Burger', 'Spicy chicken burger served with a tangy chili sauce.', 820.00, 'https://files.foodmind.pk/menu/fire-burger.png', FALSE),
  (5, 1, 3, 'Loaded Fries', 'Crispy fries topped with creamy cheese sauce.', 420.00, 'https://files.foodmind.pk/menu/loaded-fries.png', FALSE),
  (6, 1, 3, 'Chicken Wrap', 'Chicken, lettuce and garlic sauce in a soft tortilla.', 650.00, 'https://files.foodmind.pk/menu/chicken-wrap.png', FALSE),
  (7, 1, 1, 'Chicken Alfredo', 'Alfredo pasta with chicken, cream and parmesan.', 1100.00, 'https://files.foodmind.pk/menu/chicken-alfredo.png', FALSE),
  (8, 1, 4, 'Margherita Pizza', 'Mozzarella, tomato sauce and fresh basil on a crisp crust.', 1200.00, 'https://files.foodmind.pk/menu/margherita-pizza.png', FALSE),
  (9, 1, 4, 'Pepperoni Pizza', 'Pepperoni slices and mozzarella with tomato sauce.', 1450.00, 'https://files.foodmind.pk/menu/pepperoni-pizza.png', FALSE),
  (10, 1, 5, 'Chicken Biryani', 'Fragrant rice with spiced chicken and raita.', 550.00, 'https://files.foodmind.pk/menu/chicken-biryani.png', FALSE),
  (11, 1, 5, 'Chicken Karahi', 'Chicken cooked in tomato masala, ginger and green chili.', 1350.00, 'https://files.foodmind.pk/menu/chicken-karahi.png', FALSE),
  (12, 1, 1, 'White Sauce Pasta', 'Rich white sauce pasta topped with herbs.', 950.00, 'https://files.foodmind.pk/menu/white-sauce-pasta.png', FALSE),
  (13, 2, 6, 'Penne Arrabbiata', 'Penne in a spicy tomato and garlic sauce.', 980.00, NULL, FALSE),
  (14, 2, 6, 'Chicken Alfredo', 'Fettuccine in a creamy parmesan sauce with grilled chicken.', 1150.00, NULL, FALSE),
  (15, 2, 7, 'Garlic Bread', 'Toasted baguette with garlic butter and herbs.', 390.00, NULL, FALSE),
  (16, 3, 8, 'Double Smash Burger', 'Two smashed beef patties, cheese and house sauce.', 1090.00, NULL, FALSE),
  (17, 3, 8, 'Crispy Chicken Burger', 'Buttermilk fried chicken with slaw.', 850.00, NULL, FALSE),
  (18, 3, 9, 'Cheese Fries', 'Fries topped with cheese sauce and jalapeños.', 450.00, NULL, FALSE);
INSERT INTO tags (id, name) VALUES (1, 'beef'), (2, 'bread'), (3, 'burger'), (4, 'cheese'), (5, 'chicken'), (6, 'creamy'), (7, 'crispy'), (8, 'curry'), (9, 'desi'), (10, 'fries'), (11, 'italian'), (12, 'pasta'), (13, 'pepperoni'), (14, 'pizza'), (15, 'potato'), (16, 'rice'), (17, 'spicy'), (18, 'vegetarian'), (19, 'white sauce'), (20, 'wrap');
INSERT INTO menu_item_tags (menu_item_id, tag_id) VALUES
  (1, 5),
  (1, 6),
  (1, 12),
  (1, 11),
  (2, 5),
  (2, 7),
  (2, 3),
  (3, 1),
  (3, 3),
  (3, 4),
  (4, 5),
  (4, 17),
  (4, 3),
  (5, 10),
  (5, 15),
  (5, 4),
  (6, 5),
  (6, 20),
  (7, 5),
  (7, 12),
  (7, 6),
  (7, 19),
  (8, 14),
  (8, 4),
  (8, 18),
  (9, 14),
  (9, 13),
  (9, 4),
  (10, 5),
  (10, 16),
  (10, 17),
  (10, 9),
  (11, 5),
  (11, 8),
  (11, 9),
  (12, 12),
  (12, 6),
  (12, 19),
  (13, 12),
  (13, 17),
  (13, 18),
  (14, 12),
  (14, 5),
  (14, 6),
  (15, 2),
  (15, 18),
  (16, 1),
  (16, 3),
  (16, 4),
  (17, 5),
  (17, 3),
  (17, 7),
  (18, 10),
  (18, 4),
  (18, 17);
INSERT INTO option_groups (id, menu_item_id, name, min_select, max_select) VALUES
  (1, 1, 'Add-ons', 0, 1),
  (2, 2, 'Add-ons', 0, 1),
  (3, 4, 'Add-ons', 0, 1),
  (4, 6, 'Add-ons', 0, 1),
  (5, 7, 'Add-ons', 0, 1),
  (6, 10, 'Add-ons', 0, 1),
  (7, 11, 'Add-ons', 0, 1),
  (8, 14, 'Add-ons', 0, 1),
  (9, 17, 'Add-ons', 0, 1);
INSERT INTO options (id, group_id, menu_item_id, name, price_delta) VALUES
  (1, 1, 1, 'Extra Chicken', 200.00),
  (2, 2, 2, 'Extra Chicken', 200.00),
  (3, 3, 4, 'Extra Chicken', 200.00),
  (4, 4, 6, 'Extra Chicken', 200.00),
  (5, 5, 7, 'Extra Chicken', 200.00),
  (6, 6, 10, 'Extra Chicken', 200.00),
  (7, 7, 11, 'Extra Chicken', 200.00),
  (8, 8, 14, 'Extra Chicken', 200.00),
  (9, 9, 17, 'Extra Chicken', 200.00);
INSERT INTO review_tags (name) VALUES ('Great taste'), ('Generous portion'), ('Fresh ingredients'), ('Good value');

INSERT INTO addresses (id, customer_id, label, street, area, city, location, is_default) VALUES
  (1, 1, 'Home', '12 Canal View', 'Model Town', 'Lahore', ST_GeomFromText('POINT(74.3264 31.4834)', 4326, 'axis-order=long-lat'), TRUE),
  (2, 1, 'University', 'FAST NUCES, Block B', 'Faisal Town', 'Lahore', ST_GeomFromText('POINT(74.303 31.4815)', 4326, 'axis-order=long-lat'), FALSE),
  (3, 8, 'Home', '45 Garden Block', 'Johar Town', 'Lahore', ST_GeomFromText('POINT(74.28 31.469)', 4326, 'axis-order=long-lat'), TRUE);
INSERT INTO favorite_items (customer_id, menu_item_id) VALUES (1, 1), (1, 10);
INSERT INTO favorite_restaurants (customer_id, restaurant_id) VALUES (1, 1);

-- Order 1: Creamy Chicken Pasta (+Extra Chicken) and 2 x Loaded Fries, delivered by Tariq.
INSERT INTO orders (id, customer_id, restaurant_id, address_id, delivery_label, delivery_address, delivery_location, delivery_distance_m,
                    subtotal, delivery_fee, platform_fee, total)
SELECT 1, 1, 1, a.id, a.label, CONCAT(a.street, ', ', a.area, ', ', a.city), a.location, 5600,
       2090.00, 150.00, 50.00, 2290.00
  FROM addresses a WHERE a.id = 1;
INSERT INTO order_items (id, order_id, restaurant_id, menu_item_id, item_name, unit_price, options_price, quantity) VALUES
  (1, 1, 1, 1, 'Creamy Chicken Pasta', 1050.00, 200.00, 1),
  (2, 1, 1, 5, 'Loaded Fries', 420.00, 0.00, 2);
INSERT INTO order_item_options (order_item_id, menu_item_id, option_id, option_name, price_delta)
SELECT 1, o.menu_item_id, o.id, o.name, o.price_delta FROM options o WHERE o.menu_item_id = 1;
SET @app_user_id = 2;  UPDATE orders SET status = 'preparing', prep_minutes = 20 WHERE id = 1;
CALL offer_order_to_nearest_rider(1, 5000, 60);
SET @app_user_id = 5;  UPDATE delivery_offers SET response = 'accepted' WHERE order_id = 1 AND rider_id = 5;
SET @app_user_id = 2;  UPDATE orders SET status = 'ready' WHERE id = 1;
SET @app_user_id = 5;  UPDATE orders SET status = 'picked_up' WHERE id = 1;
                       UPDATE orders SET status = 'delivered', proof_photo_url = 'https://files.foodmind.pk/proof/1.jpg' WHERE id = 1;
SET @app_user_id = 1;
INSERT INTO order_reviews (order_id, customer_id, restaurant_id, restaurant_rating, rider_rating, comment)
VALUES (1, 1, 1, 5, 5, 'Still hot and the pasta was really creamy.');
INSERT INTO order_item_ratings (order_item_id, order_id, rating) VALUES (1, 1, 5), (2, 1, 4);
INSERT INTO order_review_tags (order_id, tag_id) SELECT 1, id FROM review_tags WHERE name IN ('Great taste', 'Generous portion');
SET @app_user_id = 5;
INSERT INTO rider_feedback (order_id, rider_id, rating, comment) VALUES (1, 5, 5, 'Customer was ready at the gate.');
SET @app_user_id = NULL;

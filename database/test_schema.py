"""
Integrity tests for database/schema.sql on a real MySQL 8.0 server.
Each test tries something the business rules allow or forbid and checks the database's answer.

  pip install mysql-connector-python
  mysql < schema.sql && mysql < seed.sql
  python test_schema.py            # uses the local server as root via the socket; override with MYSQL_* env vars
"""
import os
import sys
import warnings
import mysql.connector

warnings.filterwarnings('ignore', category=DeprecationWarning)

CONFIG = dict(user=os.environ.get('MYSQL_USER', 'root'), password=os.environ.get('MYSQL_PASSWORD', ''),
              host=os.environ.get('MYSQL_HOST', 'localhost'), database='foodmind', autocommit=True)
if os.environ.get('MYSQL_SOCKET'):
    CONFIG['unix_socket'] = os.environ['MYSQL_SOCKET']
results = []


def db():
    return mysql.connector.connect(**CONFIG)


def run(sql, params=None, conn=None):
    own = conn is None
    conn = conn or db()
    cur = conn.cursor()
    cur.execute(sql, params or ())
    rows = cur.fetchall() if cur.with_rows else None
    cur.close()
    if own:
        conn.close()
    return rows


def scalar(sql, params=None):
    return run(sql, params)[0][0]


def call(name, args, conn=None):
    own = conn is None
    conn = conn or db()
    cur = conn.cursor()
    out = cur.callproc(name, args)
    rows = [row for result in cur.stored_results() for row in result.fetchall()]
    cur.close()
    if own:
        conn.close()
    return out, rows


def expect_ok(name, fn):
    try:
        fn()
        results.append((True, name, ''))
    except Exception as error:  # noqa: BLE001
        results.append((False, name, f'unexpected error: {error}'))


def expect_error(name, fn, contains=''):
    try:
        fn()
        results.append((False, name, 'was allowed but should be rejected'))
    except mysql.connector.Error as error:
        ok = contains.lower() in str(error).lower()
        results.append((ok, name, '' if ok else f'wrong error: {error}'))


def check(name, condition, detail=''):
    results.append((bool(condition), name, '' if condition else detail))


def new_order(customer=8, restaurant=1, address=3, items=((1, 1),), voucher=None, discount=0, fee=150, platform=50, total_delta=0):
    """Places an order the way the backend would; returns its id."""
    conn = db()
    cur = conn.cursor()
    prices = {mid: float(scalar('SELECT price FROM menu_items WHERE id = %s', (mid,))) for mid, _ in items}
    subtotal = sum(prices[mid] * qty for mid, qty in items)
    total = subtotal + fee + platform - discount + total_delta
    cur.execute("""INSERT INTO orders (customer_id, restaurant_id, address_id, delivery_label, delivery_address, delivery_location,
                   subtotal, delivery_fee, platform_fee, voucher_id, discount_amount, total)
                   SELECT %s, %s, a.id, a.label, a.street, a.location, %s, %s, %s, %s, %s, %s FROM addresses a WHERE a.id = %s""",
                (customer, restaurant, subtotal, fee, platform, voucher, discount, total, address))
    order_id = cur.lastrowid
    for mid, qty in items:
        name = scalar('SELECT name FROM menu_items WHERE id = %s', (mid,))
        cur.execute('INSERT INTO order_items (order_id, restaurant_id, menu_item_id, item_name, unit_price, quantity) VALUES (%s,%s,%s,%s,%s,%s)',
                    (order_id, restaurant, mid, name, prices[mid], qty))
    cur.close()
    conn.close()
    return order_id


def set_status(order_id, status, **extra):
    sets = ', '.join([f'{k} = %s' for k in extra] + ['status = %s'])
    run(f'UPDATE orders SET {sets} WHERE id = %s', (*extra.values(), status, order_id))


def touch_riders():
    run('UPDATE rider_locations SET updated_at = NOW()')


# ---------------------------------------------------------------- accounts
expect_error('a customer account cannot be registered as a rider',
             lambda: run("INSERT INTO riders (user_id, city, vehicle_type, vehicle_registration) VALUES (8, 'Lahore', 'motorbike', 'X-1')"),
             'foreign key')
expect_error('emails are unique regardless of letter case',
             lambda: run("INSERT INTO users (role, full_name, email, password_hash) VALUES ('customer', 'Copy', 'DEMO@food.com', 'x')"),
             'Duplicate')
expect_error('a draft rider cannot go online',
             lambda: [run("INSERT INTO users (id, role, full_name, email, password_hash) VALUES (50, 'rider', 'New Rider', 'new.rider@food.com', 'x')"),
                      run("INSERT INTO riders (user_id, city, vehicle_type, vehicle_registration, is_online) VALUES (50, 'Lahore', 'bicycle', 'BIKE-50', TRUE)")],
             'ck_riders_online_needs_active')
expect_error('a rider without all four documents is not activated',
             lambda: [run("INSERT INTO riders (user_id, city, vehicle_type, vehicle_registration) VALUES (50, 'Lahore', 'bicycle', 'BIKE-50')"),
                      call('activate_rider', (50,))],
             'needs national ID')

# ---------------------------------------------------------------- restaurants & menus
expect_error('a restaurant without documents cannot be activated',
             lambda: [run(f"INSERT INTO restaurants (id, partner_id, name, phone, email, address_line, city, location) VALUES (9, 2, 'Second Branch', '0300', 'b@x.pk', 'Street', 'Lahore', ST_GeomFromText('POINT(74.3 31.5)', 4326, 'axis-order=long-lat'))"),
                      call('activate_restaurant', (9,))],
             'needs a logo')
expect_error('a draft restaurant cannot switch on ordering',
             lambda: run('UPDATE restaurants SET is_accepting_orders = TRUE WHERE id = 9'), 'ck_restaurants_open_needs_active')
expect_error('menu categories are unique per restaurant ignoring case ("burgers" = "Burgers")',
             lambda: run("INSERT INTO menu_categories (restaurant_id, name) VALUES (1, 'burgers')"), 'Duplicate')
other_category = scalar("SELECT id FROM menu_categories WHERE restaurant_id = 2 LIMIT 1")
expect_error("an item cannot use another restaurant's category",
             lambda: run('INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (1, %s, %s, 500)', (other_category, 'Wrong Category')),
             'foreign key')
expect_error('prices must be above zero', lambda: run('UPDATE menu_items SET price = 0 WHERE id = 1'), 'ck_menu_items_price')
expect_ok('a deleted dish frees its name for a new dish',
          lambda: [run("INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (1, 1, 'Seasonal Special', 700)"),
                   run("UPDATE menu_items SET deleted_at = NOW() WHERE name = 'Seasonal Special'"),
                   run("INSERT INTO menu_items (restaurant_id, category_id, name, price) VALUES (1, 1, 'Seasonal Special', 750)")])

# ---------------------------------------------------------------- addresses
expect_error('a customer has only one default address',
             lambda: run('UPDATE addresses SET is_default = TRUE WHERE id = 2'), 'Duplicate')
expect_error("an order cannot use another customer's address",
             lambda: new_order(customer=8, address=1), 'foreign key')

# ---------------------------------------------------------------- orders
expect_error('the total must equal subtotal + fees − discount', lambda: new_order(total_delta=10), 'ck_orders_total')
bella_item = scalar("SELECT id FROM menu_items WHERE restaurant_id = 2 LIMIT 1")
expect_error("an order cannot contain another restaurant's dish",
             lambda: new_order(items=((1, 1), (bella_item, 1))), 'foreign key')
expect_error('quantities are limited to 1–99', lambda: new_order(items=((1, 100),)), 'ck_order_items_quantity')
expect_error('ordering is refused while the restaurant is offline',
             lambda: [run('UPDATE restaurants SET is_accepting_orders = FALSE WHERE id = 3'), new_order(restaurant=3, items=((scalar("SELECT id FROM menu_items WHERE restaurant_id = 3 LIMIT 1"), 1),))],
             'not accepting orders')
run('UPDATE restaurants SET is_accepting_orders = TRUE WHERE id = 3')

o2 = new_order()
fries_option = scalar("SELECT id FROM options WHERE menu_item_id <> (SELECT menu_item_id FROM order_items WHERE order_id = %s LIMIT 1) LIMIT 1", (o2,))
line = scalar('SELECT id FROM order_items WHERE order_id = %s', (o2,))
expect_error("an add-on from a different dish cannot be attached to an order line",
             lambda: run('INSERT INTO order_item_options (order_item_id, menu_item_id, option_id, option_name, price_delta) SELECT %s, menu_item_id, id, name, price_delta FROM options WHERE id = %s', (line, fries_option)),
             'foreign key')
expect_error('orders cannot skip stages (placed → delivered)', lambda: set_status(o2, 'delivered'), 'Invalid order status transition')
expect_error('accepting an order requires a prep time', lambda: set_status(o2, 'preparing'), 'ck_orders_prep')
expect_ok('the restaurant accepts with a prep time', lambda: set_status(o2, 'preparing', prep_minutes=15))
check('accepting sets the expected ready time', scalar('SELECT estimated_ready_at IS NOT NULL FROM orders WHERE id = %s', (o2,)) == 1)
expect_ok('the restaurant marks it ready', lambda: set_status(o2, 'ready'))
expect_error('food cannot be picked up before a rider is assigned', lambda: set_status(o2, 'picked_up'), 'ck_orders_rider_before_pickup')
expect_error('orders cannot go backwards', lambda: set_status(o2, 'preparing'), 'Invalid order status transition')

# ---------------------------------------------------------------- nearest-rider assignment
touch_riders()
_, offer = call('offer_order_to_nearest_rider', (o2, 5000, 60))
check('the closest online rider (Tariq) gets the first offer', offer and offer[0][1] == 5, f'got {offer}')
expect_error('only one offer per order is open at a time',
             lambda: call('offer_order_to_nearest_rider', (o2, 5000, 60)), 'still open')
run("UPDATE delivery_offers SET response = 'declined' WHERE order_id = %s AND rider_id = 5", (o2,))
_, offer = call('offer_order_to_nearest_rider', (o2, 5000, 60))
check('after a decline, the next closest rider (Ahmed) is offered', offer and offer[0][1] == 6, f'got {offer}')
expect_error('an answered offer cannot be changed',
             lambda: run("UPDATE delivery_offers SET response = 'accepted' WHERE order_id = %s AND rider_id = 5", (o2,)), 'already been answered')
run("UPDATE delivery_offers SET offered_at = NOW() - INTERVAL 2 MINUTE, expires_at = NOW() - INTERVAL 1 MINUTE WHERE order_id = %s AND rider_id = 6", (o2,))
expect_error('an expired offer cannot be accepted',
             lambda: run("UPDATE delivery_offers SET response = 'accepted' WHERE order_id = %s AND rider_id = 6", (o2,)), 'expired')
_, offer = call('offer_order_to_nearest_rider', (o2, 5000, 60))
check('nobody else within 5 km → no offer is made', offer == [], f'got {offer}')
check('the timed-out offer was closed as expired',
      scalar("SELECT response FROM delivery_offers WHERE order_id = %s AND rider_id = 6", (o2,)) == 'expired')
_, offer = call('offer_order_to_nearest_rider', (o2, 15000, 60))
check('widening the radius reaches Bilal in Gulberg', offer and offer[0][1] == 7, f'got {offer}')
expect_ok('Bilal accepts and becomes the order\'s rider',
          lambda: run("UPDATE delivery_offers SET response = 'accepted' WHERE order_id = %s AND rider_id = 7", (o2,)))
check('accepting sets the rider and a 4-digit pickup code',
      run('SELECT rider_id, CHAR_LENGTH(pickup_code) FROM orders WHERE id = %s', (o2,))[0] == (7, 4))

o3 = new_order(items=((2, 1),))
set_status(o3, 'preparing', prep_minutes=10)
touch_riders()
_, offer = call('offer_order_to_nearest_rider', (o3, 15000, 60))
check('a rider already carrying an order is skipped', offer and offer[0][1] != 7, f'got {offer}')
expect_error('a rider can never hold two active orders',
             lambda: run('UPDATE orders SET rider_id = 7 WHERE id = %s', (o3,)), 'Duplicate')
expect_error('riders whose GPS location is older than 2 minutes are not offered orders',
             lambda: [run("UPDATE delivery_offers SET response = 'declined' WHERE order_id = %s AND response = 'pending'", (o3,)),
                      run('UPDATE rider_locations SET updated_at = NOW() - INTERVAL 10 MINUTE'),
                      (lambda r: (_ for _ in ()).throw(mysql.connector.Error('no rider')) if r == [] else None)(call('offer_order_to_nearest_rider', (o3, 15000, 60))[1])],
             'no rider')
touch_riders()

# ---------------------------------------------------------------- delivery, reviews, points
expect_error('reviews are only for delivered orders',
             lambda: run('INSERT INTO order_reviews (order_id, customer_id, restaurant_id, restaurant_rating) VALUES (%s, 8, 1, 4)', (o2,)),
             'Only delivered orders')
set_status(o2, 'picked_up')
set_status(o2, 'delivered')
check('delivery marks the cash as collected', scalar('SELECT payment_status FROM orders WHERE id = %s', (o2,)) == 'collected')
check('delivery earns 20 points', scalar('SELECT points_balance FROM v_customer_points WHERE customer_id = 8') == 20)
expect_error("a customer cannot review someone else's order",
             lambda: run('INSERT INTO order_reviews (order_id, customer_id, restaurant_id, restaurant_rating) VALUES (%s, 1, 1, 4)', (o2,)),
             'foreign key')
expect_ok('the customer reviews the delivered order',
          lambda: run('INSERT INTO order_reviews (order_id, customer_id, restaurant_id, restaurant_rating, rider_rating) VALUES (%s, 8, 1, 4, 5)', (o2,)))
expect_error('one review per order (edits update the same row)',
             lambda: run('INSERT INTO order_reviews (order_id, customer_id, restaurant_id, restaurant_rating) VALUES (%s, 8, 1, 2)', (o2,)), 'Duplicate')
expect_ok('editing a review does not award points again',
          lambda: run('UPDATE order_reviews SET restaurant_rating = 5 WHERE order_id = %s', (o2,)))
check('first review earns 20 more points (40 total), edits earn none',
      scalar('SELECT points_balance FROM v_customer_points WHERE customer_id = 8') == 40)
expect_error('ratings are 1–5', lambda: run('UPDATE order_reviews SET restaurant_rating = 6 WHERE order_id = %s', (o2,)), 'ck_order_reviews_ratings')
expect_error('only the rider who delivered can leave feedback',
             lambda: run("INSERT INTO rider_feedback (order_id, rider_id, rating) VALUES (%s, 5, 5)", (o2,)), 'foreign key')
expect_ok('the delivering rider leaves feedback', lambda: run("INSERT INTO rider_feedback (order_id, rider_id, rating) VALUES (%s, 7, 4)", (o2,)))

# ---------------------------------------------------------------- vouchers
expect_error('points cannot go negative: 100-point voucher with 40 points',
             lambda: call('redeem_voucher', (8, 100, 100, 30, 0)), 'Not enough points')
out, _ = call('redeem_voucher', (8, 40, 50, 30, 0))
voucher = out[4]
check('redeeming spends the points', scalar('SELECT points_balance FROM v_customer_points WHERE customer_id = 8') == 0)
check('a new voucher is available', scalar('SELECT status FROM v_voucher_status WHERE voucher_id = %s', (voucher,)) == 'available')
expect_error("a voucher cannot be used by another customer",
             lambda: new_order(customer=1, address=1, voucher=voucher, discount=50), 'foreign key')
expect_error('a discount needs a voucher', lambda: new_order(discount=50), 'ck_orders_discount_needs_voucher')
o4 = new_order(voucher=voucher, discount=50)
check('the order total includes the discount', scalar('SELECT total FROM orders WHERE id = %s', (o4,)) == scalar('SELECT subtotal + 200 - 50 FROM orders WHERE id = %s', (o4,)))
check('the voucher now shows as used', scalar('SELECT status FROM v_voucher_status WHERE voucher_id = %s', (voucher,)) == 'used')
expect_error('a voucher works on one order at a time', lambda: new_order(voucher=voucher, discount=50), 'Duplicate')
set_status(o4, 'cancelled')
expect_ok('cancelling the order frees the voucher for another order', lambda: new_order(voucher=voucher, discount=50))

# ---------------------------------------------------------------- performance evidence
plan = run("""EXPLAIN SELECT rider_id FROM rider_locations
              WHERE MBRContains(ST_GeomFromText('POLYGON((74.2 31.4, 74.4 31.4, 74.4 31.6, 74.2 31.6, 74.2 31.4))', 4326, 'axis-order=long-lat'), location)""")
check('the rider search uses the spatial index', any('sx_rider_locations_location' in str(row) for row in plan), str(plan))
check('every status change is in the audit trail',
      scalar("SELECT GROUP_CONCAT(status ORDER BY id) FROM order_status_history WHERE order_id = %s", (o2,)) == 'placed,preparing,ready,picked_up,delivered')

failed = [r for r in results if not r[0]]
for ok, name, detail in results:
    print(('PASS ' if ok else 'FAIL ') + name + (f'  -> {detail}' if detail else ''))
print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
sys.exit(1 if failed else 0)

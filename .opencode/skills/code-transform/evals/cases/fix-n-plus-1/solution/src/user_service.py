import sqlite3
def get_users_with_orders():
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT u.id, u.name, o.id FROM users u LEFT JOIN orders o ON o.user_id = u.id")
    rows = cursor.fetchall()
    users_map = {}
    for row in rows:
        uid, name, oid = row
        if uid not in users_map: users_map[uid] = {"id": uid, "name": name, "orders": []}
        if oid is not None: users_map[uid]["orders"].append({"id": oid})
    conn.close()
    return list(users_map.values())

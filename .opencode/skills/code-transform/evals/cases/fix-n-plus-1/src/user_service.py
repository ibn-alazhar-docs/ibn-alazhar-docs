import sqlite3
def get_users_with_orders():
    conn = sqlite3.connect("app.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM users")
    users = cursor.fetchall()
    result = []
    for user in users:
        cursor.execute("SELECT id FROM orders WHERE user_id = ?", (user[0],))
        orders = cursor.fetchall()
        result.append({"id": user[0], "name": user[1], "orders": orders})
    conn.close()
    return result

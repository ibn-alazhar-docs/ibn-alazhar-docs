class UserManager:
    def __init__(self): self.users = []
    def add_user(self, name, email): self.users.append({"name": name, "email": email})

class OrderManager:
    def __init__(self): self.orders = []
    def add_order(self, user_id, total): self.orders.append({"user_id": user_id, "total": total})
    def get_user_orders(self, user_id): return [o for o in self.orders if o["user_id"] == user_id]
    def calculate_revenue(self): return sum(o["total"] for o in self.orders)

class LogManager:
    def __init__(self): self.logs = []
    def log(self, msg): self.logs.append(msg)
    def export(self): return "\n".join(self.logs)

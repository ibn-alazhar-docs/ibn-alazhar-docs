class OrderProcessor:
    def process_order(self, order):
        if not order.get("customer_id"): raise ValueError("Customer ID required")
        if not order.get("items"): raise ValueError("Items required")
        subtotal = sum(i["qty"] * i["price"] for i in order["items"])
        tax = subtotal * 0.08
        total = subtotal + tax
        receipt = f"Subtotal: ${subtotal}\nTax: ${tax}\nTotal: ${total}"
        return {"receipt": receipt, "total": total}

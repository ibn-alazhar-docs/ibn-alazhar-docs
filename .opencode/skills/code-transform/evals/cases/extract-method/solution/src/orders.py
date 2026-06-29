class OrderProcessor:
    def process_order(self, order):
        self._validate(order)
        subtotal = self._calculate_subtotal(order["items"])
        total = self._apply_tax(subtotal)
        receipt = self._generate_receipt(subtotal, total)
        return {"receipt": receipt, "total": total}
    def _validate(self, order):
        if not order.get("customer_id"): raise ValueError("Customer ID required")
        if not order.get("items"): raise ValueError("Items required")
    def _calculate_subtotal(self, items):
        return sum(i["qty"] * i["price"] for i in items)
    def _apply_tax(self, subtotal):
        return subtotal + subtotal * 0.08
    def _generate_receipt(self, subtotal, total):
        return f"Subtotal: ${subtotal}\nTax: ${total - subtotal}\nTotal: ${total}"

# Copyright (c) 2026, RAhmed-Dev and contributors
# For license information, please see license.txt

"""
API methods for Finance Tracker

Provides methods for:
- Party (Customer/Supplier) caching for offline use
- Transaction category caching
- Transaction statistics
"""

import frappe
from frappe import _


@frappe.whitelist()
def get_cached_parties(party_type="Customer", limit=50):
	"""Get frequently used parties for offline caching.

	Args:
		party_type (str): "Customer" or "Supplier"
		limit (int): Number of parties to return

	Returns:
		list: Party data for offline use
	"""
	# Validate party_type
	if party_type not in ["Customer", "Supplier"]:
		frappe.throw(_("Invalid party type. Must be Customer or Supplier."))

	# Get limit from settings if not provided
	if not limit:
		settings = frappe.get_single("Tracker Settings")
		limit = settings.cache_party_count or 50

	if party_type == "Customer":
		parties = frappe.db.sql("""
			SELECT
				c.name,
				c.customer_name as party_name,
				c.mobile_no,
				c.email_id,
				c.image,
				COUNT(si.name) as transaction_count
			FROM `tabCustomer` c
			LEFT JOIN `tabSales Invoice` si ON si.customer = c.name AND si.docstatus = 1
			WHERE c.disabled = 0
			GROUP BY c.name
			ORDER BY transaction_count DESC, c.modified DESC
			LIMIT %s
		""", (limit,), as_dict=True)
	else:  # Supplier
		parties = frappe.db.sql("""
			SELECT
				s.name,
				s.supplier_name as party_name,
				s.mobile_no,
				s.email_id,
				s.image,
				COUNT(pi.name) as transaction_count
			FROM `tabSupplier` s
			LEFT JOIN `tabPurchase Invoice` pi ON pi.supplier = s.name AND pi.docstatus = 1
			WHERE s.disabled = 0
			GROUP BY s.name
			ORDER BY transaction_count DESC, s.modified DESC
			LIMIT %s
		""", (limit,), as_dict=True)

	return parties


@frappe.whitelist()
def get_transaction_categories(category_type=None):
	"""Get active transaction categories for offline caching.

	Args:
		category_type (str): Optional filter - "Income" or "Expense"

	Returns:
		list: Category data for offline use
	"""
	filters = {"is_active": 1}

	if category_type:
		if category_type not in ["Income", "Expense"]:
			frappe.throw(_("Invalid category type. Must be Income or Expense."))
		filters["category_type"] = category_type

	categories = frappe.get_all(
		"Transaction Category",
		filters=filters,
		fields=[
			"name",
			"category_name",
			"category_code",
			"category_type",
			"account",
			"color",
			"icon"
		],
		order_by="category_name asc"
	)

	return categories


@frappe.whitelist()
def get_default_payment_account():
	"""Get default payment account from settings.

	Returns:
		str: Default payment account name or None
	"""
	settings = frappe.get_single("Tracker Settings")
	return settings.default_payment_account


@frappe.whitelist()
def get_transaction_summary(from_date=None, to_date=None):
	"""Get transaction summary for dashboard.

	Args:
		from_date (str): Start date (optional)
		to_date (str): End date (optional)

	Returns:
		dict: Transaction summary with income, expense, balance
	"""
	from frappe.utils import getdate, nowdate, get_first_day, get_last_day

	# Default to current month if no dates provided
	if not from_date:
		from_date = get_first_day(nowdate())
	if not to_date:
		to_date = get_last_day(nowdate())

	# Get income total
	income = frappe.db.sql("""
		SELECT SUM(amount) as total
		FROM `tabFinancial Transaction`
		WHERE transaction_type = 'Income'
		AND date BETWEEN %s AND %s
		AND docstatus < 2
	""", (from_date, to_date), as_dict=True)[0].total or 0

	# Get expense total
	expense = frappe.db.sql("""
		SELECT SUM(amount) as total
		FROM `tabFinancial Transaction`
		WHERE transaction_type = 'Expense'
		AND date BETWEEN %s AND %s
		AND docstatus < 2
	""", (from_date, to_date), as_dict=True)[0].total or 0

	# Get pending sync count
	pending_sync = frappe.db.count(
		"Financial Transaction",
		{"synced": 0, "docstatus": ["<", 2]}
	)

	return {
		"income": income,
		"expense": expense,
		"balance": income - expense,
		"pending_sync_count": pending_sync,
		"from_date": from_date,
		"to_date": to_date
	}


@frappe.whitelist()
def get_recent_transactions(limit=20):
	"""Get recent transactions for dashboard.

	Args:
		limit (int): Number of transactions to return

	Returns:
		list: Recent transactions
	"""
	transactions = frappe.get_all(
		"Financial Transaction",
		filters={"docstatus": ["<", 2]},
		fields=[
			"name",
			"transaction_type",
			"date",
			"category",
			"amount",
			"customer",
			"supplier",
			"synced",
			"sync_error"
		],
		order_by="date desc",
		limit=limit
	)

	# Enrich with category details
	for txn in transactions:
		if txn.category:
			category = frappe.get_cached_doc("Transaction Category", txn.category)
			txn["category_color"] = category.color
			txn["category_icon"] = category.icon

	return transactions

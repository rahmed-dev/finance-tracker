# Copyright (c) 2026, RAhmed-Dev and contributors
# For license information, please see license.txt

"""
Sync Engine for Financial Transactions

Smart routing logic that creates appropriate ERPNext documents based on transaction type:
- Income + Customer → Sales Invoice
- Income (no customer) → Journal Entry
- Expense + Supplier → Purchase Invoice
- Expense (no supplier) → Journal Entry
- Transfer/Correction → Journal Entry
"""

import frappe
from frappe import _
from frappe.utils import getdate, flt


@frappe.whitelist()
def sync_transaction_to_erpnext(transaction_name):
	"""Sync offline transaction to appropriate ERPNext document.

	Smart logic creates:
	- Income + Customer → Sales Invoice
	- Income (no customer) → Journal Entry
	- Expense + Supplier → Purchase Invoice
	- Expense (no supplier) → Journal Entry
	- Transfer/Correction → Journal Entry

	Args:
		transaction_name (str): Name of Financial Transaction document

	Returns:
		dict: Sync result with status and created document
	"""
	try:
		# Get transaction document
		txn = frappe.get_doc("Financial Transaction", transaction_name)

		# Check if already synced
		if txn.synced:
			return {
				"status": "already_synced",
				"message": _("Transaction already synced to {0}").format(txn.reference_doctype),
				"document": txn.reference_name
			}

		# Get category for account mapping
		category = frappe.get_cached_doc("Transaction Category", txn.category)
		account = category.account

		# Route to appropriate sync handler based on transaction type and party
		if txn.transaction_type == "Income" and txn.customer:
			result = create_sales_invoice(txn, account)
		elif txn.transaction_type == "Expense" and txn.supplier:
			result = create_purchase_invoice(txn, account)
		else:
			# All other types → Journal Entry
			result = create_journal_entry(txn, account)

		# Update transaction with result
		txn.synced = 1
		txn.reference_doctype = result["doctype"]
		txn.reference_name = result["name"]
		txn.sync_error = None
		txn.save(ignore_permissions=True)

		frappe.db.commit()

		return {
			"status": "success",
			"message": _("Successfully synced to {0}").format(result["doctype"]),
			"document": result["name"],
			"doctype": result["doctype"]
		}

	except Exception as e:
		frappe.log_error(message=str(e), title=_("Transaction Sync Failed"))

		# Store error for user visibility
		txn.sync_error = str(e)
		txn.save(ignore_permissions=True)
		frappe.db.commit()

		return {
			"status": "failed",
			"message": str(e),
			"error": str(e)
		}


def create_sales_invoice(txn, income_account):
	"""Create Sales Invoice for customer income.

	Args:
		txn: Financial Transaction document
		income_account: Income GL Account from category

	Returns:
		dict: Created document info
	"""
	# Get item from category, or use generic item as fallback
	category = frappe.get_cached_doc("Transaction Category", txn.category)
	if category.item:
		income_item = category.item
	else:
		income_item = get_or_create_generic_item("Income Item", "Service")

	sales_invoice = frappe.get_doc({
		"doctype": "Sales Invoice",
		"customer": txn.customer,
		"posting_date": getdate(txn.date),
		"due_date": getdate(txn.date),
		"items": [{
			"item_code": income_item,
			"qty": 1,
			"rate": flt(txn.amount),
			"income_account": income_account,
			"description": txn.description or _("Income from Finance Tracker")
		}]
	})

	# Add taxes if applicable
	if txn.tax_amount:
		# TODO: Add tax rows based on default_tax_template from category
		pass

	# Attach receipt image if present
	if txn.receipt_image:
		add_attachment_to_doc(sales_invoice, txn.receipt_image)

	sales_invoice.insert(ignore_permissions=True)

	# Auto-submit if configured
	settings = frappe.get_single("Tracker Settings")
	if settings.auto_submit_documents:
		sales_invoice.submit()

	return {"doctype": "Sales Invoice", "name": sales_invoice.name}


def create_purchase_invoice(txn, expense_account):
	"""Create Purchase Invoice for supplier expense.

	Args:
		txn: Financial Transaction document
		expense_account: Expense GL Account from category

	Returns:
		dict: Created document info
	"""
	# Get item from category, or use generic item as fallback
	category = frappe.get_cached_doc("Transaction Category", txn.category)
	if category.item:
		expense_item = category.item
	else:
		expense_item = get_or_create_generic_item("Expense Item", "Service")

	purchase_invoice = frappe.get_doc({
		"doctype": "Purchase Invoice",
		"supplier": txn.supplier,
		"posting_date": getdate(txn.date),
		"bill_date": getdate(txn.date),
		"items": [{
			"item_code": expense_item,
			"qty": 1,
			"rate": flt(txn.amount),
			"expense_account": expense_account,
			"description": txn.description or _("Expense from Finance Tracker")
		}]
	})

	# Add taxes if applicable
	if txn.tax_amount:
		# TODO: Add tax rows based on default_tax_template from category
		pass

	# Attach receipt image if present
	if txn.receipt_image:
		add_attachment_to_doc(purchase_invoice, txn.receipt_image)

	purchase_invoice.insert(ignore_permissions=True)

	# Auto-submit if configured
	settings = frappe.get_single("Tracker Settings")
	if settings.auto_submit_documents:
		purchase_invoice.submit()

	return {"doctype": "Purchase Invoice", "name": purchase_invoice.name}


def create_journal_entry(txn, category_account):
	"""Create Journal Entry for all other transaction types.

	Args:
		txn: Financial Transaction document
		category_account: GL Account from category

	Returns:
		dict: Created document info
	"""
	# Build journal entry accounts based on transaction type
	accounts = get_journal_accounts(txn, category_account)

	journal_entry = frappe.get_doc({
		"doctype": "Journal Entry",
		"posting_date": getdate(txn.date),
		"voucher_type": get_voucher_type(txn.transaction_type),
		"user_remark": txn.description or _("Transaction from Finance Tracker"),
		"accounts": accounts
	})

	# Attach receipt image if present
	if txn.receipt_image:
		add_attachment_to_doc(journal_entry, txn.receipt_image)

	journal_entry.insert(ignore_permissions=True)

	# Auto-submit if configured
	settings = frappe.get_single("Tracker Settings")
	if settings.auto_submit_documents:
		journal_entry.submit()

	return {"doctype": "Journal Entry", "name": journal_entry.name}


def get_journal_accounts(txn, category_account):
	"""Build journal entry accounts based on transaction type.

	Args:
		txn: Financial Transaction document
		category_account: GL Account from category

	Returns:
		list: Journal entry accounts array
	"""
	accounts = []
	amount = flt(txn.amount)

	if not txn.payment_account:
		frappe.throw(_("Payment Account is required for Journal Entry"))

	if txn.transaction_type == "Income":
		# Debit payment account, Credit income account
		accounts.append({
			"account": txn.payment_account,
			"debit_in_account_currency": amount
		})
		accounts.append({
			"account": category_account,
			"credit_in_account_currency": amount
		})

	elif txn.transaction_type == "Expense":
		# Debit expense account, Credit payment account
		accounts.append({
			"account": category_account,
			"debit_in_account_currency": amount
		})
		accounts.append({
			"account": txn.payment_account,
			"credit_in_account_currency": amount
		})

	elif txn.transaction_type in ["Transfer", "Correction"]:
		# For transfers: requires both from and to accounts
		# For now, use payment_account as "from" and category_account as "to"
		accounts.append({
			"account": category_account,
			"debit_in_account_currency": amount
		})
		accounts.append({
			"account": txn.payment_account,
			"credit_in_account_currency": amount
		})

	return accounts


def get_voucher_type(transaction_type):
	"""Get appropriate voucher type for Journal Entry.

	Args:
		transaction_type (str): Transaction type

	Returns:
		str: Voucher type
	"""
	voucher_map = {
		"Income": "Journal Entry",
		"Expense": "Journal Entry",
		"Transfer": "Bank Entry"
	}
	return voucher_map.get(transaction_type, "Journal Entry")


def get_or_create_generic_item(item_name, item_group="Service"):
	"""Get or create generic item for invoices.

	Args:
		item_name (str): Item name
		item_group (str): Item group

	Returns:
		str: Item code
	"""
	if frappe.db.exists("Item", item_name):
		return item_name

	# Create generic item
	item = frappe.get_doc({
		"doctype": "Item",
		"item_code": item_name,
		"item_name": item_name,
		"item_group": item_group,
		"stock_uom": "Nos",
		"is_stock_item": 0
	})
	item.insert(ignore_permissions=True)
	frappe.db.commit()

	return item.name


def add_attachment_to_doc(doc, file_url):
	"""Add attachment to document.

	Args:
		doc: Frappe document
		file_url (str): File URL
	"""
	# Frappe automatically handles attachments if file_url is in document
	# For now, just store in a field or create File doc link
	pass


@frappe.whitelist()
def get_pending_transactions(limit=50):
	"""Get list of pending (unsynced) transactions.

	Args:
		limit (int): Number of transactions to return

	Returns:
		list: Pending transactions
	"""
	return frappe.get_all(
		"Financial Transaction",
		filters={"synced": 0, "docstatus": ["<", 2]},
		fields=["name", "transaction_type", "date", "amount", "category", "party"],
		order_by="date desc",
		limit=limit
	)


@frappe.whitelist()
def bulk_sync_transactions(transaction_names):
	"""Sync multiple transactions in bulk.

	Args:
		transaction_names (list): List of transaction names

	Returns:
		dict: Bulk sync results
	"""
	if isinstance(transaction_names, str):
		import json
		transaction_names = json.loads(transaction_names)

	results = {"success": [], "failed": []}

	for txn_name in transaction_names:
		result = sync_transaction_to_erpnext(txn_name)
		if result.get("status") == "success":
			results["success"].append(txn_name)
		else:
			results["failed"].append({
				"name": txn_name,
				"error": result.get("error")
			})

	return results

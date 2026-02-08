# Copyright (c) 2026, RAhmed-Dev and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, getdate, now_datetime


class FinancialTransaction(Document):
	def validate(self):
		"""Validate Financial Transaction before save."""
		self.validate_amounts()
		self.validate_party_selection()
		self.validate_category()
		self.set_defaults()

	def validate_amounts(self):
		"""Validate amount fields are positive."""
		if flt(self.amount) <= 0:
			frappe.throw(_("Amount must be greater than zero"))

		if self.tax_amount and flt(self.tax_amount) < 0:
			frappe.throw(_("Tax amount cannot be negative"))

	def validate_party_selection(self):
		"""Validate party fields based on transaction type."""
		# Check for conflicting party selection
		if self.customer and self.supplier:
			frappe.throw(_("Cannot select both Customer and Supplier"))

		# Income should have Customer (if party selected)
		if self.transaction_type == "Income" and self.supplier:
			frappe.throw(_("Income transactions should be linked to Customer, not Supplier"))

		# Expense should have Supplier (if party selected)
		if self.transaction_type == "Expense" and self.customer:
			frappe.throw(_("Expense transactions should be linked to Supplier, not Customer"))

	def validate_category(self):
		"""Validate category type matches transaction type."""
		if not self.category:
			return

		category_doc = frappe.get_cached_doc("Transaction Category", self.category)

		# Validate Income transaction has Income category
		if self.transaction_type == "Income":
			if category_doc.category_type != "Income":
				frappe.throw(_("Income transaction must use an Income category"))

		# Validate Expense transaction has Expense category
		elif self.transaction_type == "Expense":
			if category_doc.category_type != "Expense":
				frappe.throw(_("Expense transaction must use an Expense category"))

		# Validate Transfer transaction has Transfer category
		elif self.transaction_type == "Transfer":
			if category_doc.category_type != "Transfer":
				frappe.throw(_("Transfer transaction must use a Transfer category"))

	def set_defaults(self):
		"""Set default values."""
		# Set default date to now if not provided
		if not self.date:
			self.date = now_datetime()

		# Get default payment account from settings if not provided
		if not self.payment_account:
			settings = frappe.get_single("Tracker Settings")
			if settings.default_payment_account:
				self.payment_account = settings.default_payment_account

	def on_submit(self):
		"""Create ERPNext document on submission."""
		# Get category for account mapping
		category = frappe.get_cached_doc("Transaction Category", self.category)
		account = category.account

		# Create appropriate ERPNext document based on transaction type
		if self.transaction_type == "Income" and self.customer:
			doc = self.create_sales_invoice(account)
		elif self.transaction_type == "Expense" and self.supplier:
			doc = self.create_purchase_invoice(account)
		else:
			doc = self.create_journal_entry(account)

		# Store reference to created document
		self.db_set("reference_doctype", doc.doctype)
		self.db_set("reference_name", doc.name)

		frappe.msgprint(_("Created {0}: {1}").format(doc.doctype, doc.name))

	def on_cancel(self):
		"""Cancel the linked ERPNext document."""
		if self.reference_doctype and self.reference_name:
			# Cancel the linked document
			linked_doc = frappe.get_doc(self.reference_doctype, self.reference_name)
			if linked_doc.docstatus == 1:
				linked_doc.cancel()
				frappe.msgprint(_("Cancelled {0}: {1}").format(self.reference_doctype, self.reference_name))

	def create_sales_invoice(self, income_account):
		"""Create Sales Invoice for customer income."""
		from finance_tracker.finance_tracker.sync_engine import get_or_create_generic_item

		# Get item from category, or use generic item as fallback
		category = frappe.get_cached_doc("Transaction Category", self.category)
		if category.item:
			income_item = category.item
		else:
			income_item = get_or_create_generic_item("Income Item", "Service")

		sales_invoice = frappe.get_doc({
			"doctype": "Sales Invoice",
			"customer": self.customer,
			"posting_date": getdate(self.date),
			"due_date": getdate(self.date),
			"items": [{
				"item_code": income_item,
				"qty": 1,
				"rate": flt(self.amount),
				"income_account": income_account,
				"description": self.description or _("Income from Finance Tracker")
			}]
		})

		sales_invoice.insert()
		sales_invoice.submit()

		return sales_invoice

	def create_purchase_invoice(self, expense_account):
		"""Create Purchase Invoice for supplier expense."""
		from finance_tracker.finance_tracker.sync_engine import get_or_create_generic_item

		# Get item from category, or use generic item as fallback
		category = frappe.get_cached_doc("Transaction Category", self.category)
		if category.item:
			expense_item = category.item
		else:
			expense_item = get_or_create_generic_item("Expense Item", "Service")

		purchase_invoice = frappe.get_doc({
			"doctype": "Purchase Invoice",
			"supplier": self.supplier,
			"posting_date": getdate(self.date),
			"bill_date": getdate(self.date),
			"items": [{
				"item_code": expense_item,
				"qty": 1,
				"rate": flt(self.amount),
				"expense_account": expense_account,
				"description": self.description or _("Expense from Finance Tracker")
			}]
		})

		purchase_invoice.insert()
		purchase_invoice.submit()

		return purchase_invoice

	def create_journal_entry(self, category_account):
		"""Create Journal Entry for transactions without party or transfers."""
		from finance_tracker.finance_tracker.sync_engine import get_voucher_type

		if not self.payment_account:
			frappe.throw(_("Payment Account is required for Journal Entry"))

		amount = flt(self.amount)
		accounts = []

		if self.transaction_type == "Income":
			# Debit payment account, Credit income account
			accounts.append({
				"account": self.payment_account,
				"debit_in_account_currency": amount
			})
			accounts.append({
				"account": category_account,
				"credit_in_account_currency": amount
			})

		elif self.transaction_type == "Expense":
			# Debit expense account, Credit payment account
			accounts.append({
				"account": category_account,
				"debit_in_account_currency": amount
			})
			accounts.append({
				"account": self.payment_account,
				"credit_in_account_currency": amount
			})

		elif self.transaction_type == "Transfer":
			# Transfer: Debit to_account (category), Credit from_account (payment)
			accounts.append({
				"account": category_account,  # To Account (destination)
				"debit_in_account_currency": amount
			})
			accounts.append({
				"account": self.payment_account,  # From Account (source)
				"credit_in_account_currency": amount
			})


		journal_entry = frappe.get_doc({
			"doctype": "Journal Entry",
			"posting_date": getdate(self.date),
			"voucher_type": get_voucher_type(self.transaction_type),
			"user_remark": self.description or _("Transaction from Finance Tracker"),
			"accounts": accounts
		})

		journal_entry.insert()
		journal_entry.submit()

		return journal_entry

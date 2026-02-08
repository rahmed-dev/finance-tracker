# Copyright (c) 2026, RAhmed-Dev and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class TransactionCategory(Document):
	def validate(self):
		"""Validate Transaction Category before save."""
		self.validate_account_type()
		self.validate_item()
		self.set_defaults()

	def validate_account_type(self):
		"""Validate that account type matches category type."""
		if not self.account:
			return

		account_doc = frappe.get_cached_doc("Account", self.account)
		account_type = account_doc.account_type

		# Validate Income category has Income account
		if self.category_type == "Income":
			if account_type not in ["Income Account", "Income"]:
				frappe.throw(
					_("Income category must be linked to an Income Account. Selected account is {0}").format(account_type)
				)

		# Validate Expense category has Expense account
		elif self.category_type == "Expense":
			if account_type not in ["Expense Account", "Expenses"]:
				frappe.throw(
					_("Expense category must be linked to an Expense Account. Selected account is {0}").format(account_type)
				)

		# Validate Transfer category has Bank/Cash account
		elif self.category_type == "Transfer":
			if account_type not in ["Bank", "Cash"]:
				frappe.throw(
					_("Transfer category must be linked to a Bank or Cash Account. Selected account is {0}").format(account_type)
				)

	def validate_item(self):
		"""Validate that item is a non-stock item if provided."""
		if not self.item:
			return

		item_doc = frappe.get_cached_doc("Item", self.item)

		if item_doc.is_stock_item:
			frappe.throw(
				_("Item {0} must be a non-stock item. Please select or create a Service item.").format(self.item)
			)

	def set_defaults(self):
		"""Set default values."""
		# Generate code from category name if not provided
		if not self.category_code and self.category_name:
			self.category_code = self.category_name[:10].upper().replace(" ", "_")

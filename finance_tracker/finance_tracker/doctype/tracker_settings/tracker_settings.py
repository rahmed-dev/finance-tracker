# Copyright (c) 2026, RAhmed-Dev and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class TrackerSettings(Document):
	def validate(self):
		"""Validate Tracker Settings before save."""
		self.validate_cache_party_count()

	def validate_cache_party_count(self):
		"""Validate cache party count is within reasonable limits."""
		if self.cache_party_count:
			if self.cache_party_count < 10:
				frappe.msgprint(_("Cache party count is very low. Recommended minimum is 25."))
			elif self.cache_party_count > 200:
				frappe.msgprint(_("Cache party count is very high. This may impact performance."))

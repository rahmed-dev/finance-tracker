// Copyright (c) 2026, RAhmed-Dev and contributors
// For license information, please see license.txt

frappe.ui.form.on("Transaction Category", {
	refresh(frm) {
		// Set account filters based on category type
		set_account_filters(frm);
	},

	category_type(frm) {
		// Update account filters when category type changes
		set_account_filters(frm);

		// Clear account if type changed (may no longer be valid)
		if (frm.doc.account) {
			frappe.msgprint(__("Please re-select the account to ensure it matches the category type."));
		}
	}
});

function set_account_filters(frm) {
	// Filter accounts based on category type
	if (frm.doc.category_type === "Income") {
		frm.set_query("account", function() {
			return {
				filters: {
					"account_type": ["in", ["Income Account", "Income"]],
					"is_group": 0
				}
			};
		});
	} else if (frm.doc.category_type === "Expense") {
		frm.set_query("account", function() {
			return {
				filters: {
					"account_type": ["in", ["Expense Account", "Expenses"]],
					"is_group": 0
				}
			};
		});
	}
}

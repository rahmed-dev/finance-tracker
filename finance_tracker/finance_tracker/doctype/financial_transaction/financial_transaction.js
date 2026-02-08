// Copyright (c) 2026, RAhmed-Dev and contributors
// For license information, please see license.txt

frappe.ui.form.on("Financial Transaction", {
	refresh(frm) {
		// Set field dependencies
		setup_field_dependencies(frm);

		// Set query filters
		setup_filters(frm);

		// Add custom buttons
		add_custom_buttons(frm);
	},

	transaction_type(frm) {
		// Update field visibility and filters based on transaction type
		setup_field_dependencies(frm);
		setup_filters(frm);

		// Clear party selection when type changes
		if (frm.doc.customer || frm.doc.supplier) {
			frm.set_value("customer", "");
			frm.set_value("supplier", "");
		}
	},

	category(frm) {
		if (frm.doc.category) {
			// Get category details and auto-set transaction type
			frappe.db.get_value("Transaction Category", frm.doc.category, "category_type", function(r) {
				if (r && r.category_type) {
					// Auto-set transaction type based on category type
					frm.set_value("transaction_type", r.category_type);
				}
			});

			// Fetch default payment account if not set
			if (!frm.doc.payment_account) {
				frappe.call({
					method: "finance_tracker.finance_tracker.api.get_default_payment_account",
					callback: function(r) {
						if (r.message) {
							frm.set_value("payment_account", r.message);
						}
					}
				});
			}
		}
	}
});

function setup_field_dependencies(frm) {
	// Show/hide party fields based on transaction type
	if (frm.doc.transaction_type === "Income") {
		frm.toggle_display("customer", true);
		frm.toggle_display("supplier", false);
		frm.set_df_property("customer", "description", "Optional: Link to customer for Sales Invoice");
		frm.set_df_property("payment_account", "description", "");
		frm.set_df_property("category", "description", "");
	} else if (frm.doc.transaction_type === "Expense") {
		frm.toggle_display("customer", false);
		frm.toggle_display("supplier", true);
		frm.set_df_property("supplier", "description", "Optional: Link to supplier for Purchase Invoice");
		frm.set_df_property("payment_account", "description", "");
		frm.set_df_property("category", "description", "");
	} else if (frm.doc.transaction_type === "Transfer") {
		frm.toggle_display("customer", false);
		frm.toggle_display("supplier", false);
		frm.set_df_property("payment_account", "description", "From Account (source of transfer)");
		frm.set_df_property("category", "description", "Select Transfer category (destination account)");
	} else {
		frm.toggle_display("customer", false);
		frm.toggle_display("supplier", false);
		frm.set_df_property("payment_account", "description", "");
		frm.set_df_property("category", "description", "");
	}
}

function setup_filters(frm) {
	// Filter categories based on transaction type
		frm.set_query("category", function() {
			return {
				filters: {
					"is_active": 1
				}
			};
		});
		frm.set_query("payment_account", function() {
			return {
				filters: {
					"account_type": ["in", ["Cash", "Bank"]],
					"is_group": 0
				}
			}
		});
		frm.set_query("receiving_account", function() {
			return {
				filters: {
					"account_type": ["in", ["Cash", "Bank"]],
					"is_group": 0
				}
			}
		})

}

function add_custom_buttons(frm) {
	// Only show button if document is submitted and has created document
	if (frm.doc.docstatus === 1 && frm.doc.reference_doctype && frm.doc.reference_name) {
		frm.add_custom_button(__("View {0}", [frm.doc.reference_doctype]), function() {
			frappe.set_route("Form", frm.doc.reference_doctype, frm.doc.reference_name);
		});
	}

	// Show info about what will be created on submit
	if (frm.doc.docstatus === 0 && !frm.doc.__islocal) {
		let target_doc = get_target_doctype(frm.doc);
		frm.set_df_property("transaction_type", "description",
			__("On submit, this will create: {0}", [target_doc])
		);
	}
}

function get_target_doctype(doc) {
	// Determine which doctype will be created on submit
	if (doc.transaction_type === "Income" && doc.customer) {
		return "Sales Invoice";
	} else if (doc.transaction_type === "Expense" && doc.supplier) {
		return "Purchase Invoice";
	} else {
		return "Journal Entry";
	}
}

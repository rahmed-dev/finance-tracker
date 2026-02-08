// Copyright (c) 2026, RAhmed-Dev and contributors
// For license information, please see license.txt

frappe.ui.form.on("Tracker Settings", {
	refresh(frm) {
		// Set query filters
		setup_filters(frm);

		// Add custom buttons for bulk operations
		add_custom_buttons(frm);
	},

	cache_party_count(frm) {
		// Validate and show warnings for cache count
		let count = parseInt(frm.doc.cache_party_count) || 0;

		if (count < 10 && count > 0) {
			frappe.msgprint({
				title: __("Low Cache Count"),
				message: __("Cache party count is very low. Recommended minimum is 25 for optimal offline performance."),
				indicator: "orange"
			});
		} else if (count > 200) {
			frappe.msgprint({
				title: __("High Cache Count"),
				message: __("Cache party count is very high. This may impact performance and storage."),
				indicator: "orange"
			});
		}
	}
});

function setup_filters(frm) {
	// Filter default payment account to bank/cash only
	frm.set_query("default_payment_account", function() {
		return {
			filters: {
				"account_type": ["in", ["Bank", "Cash"]],
				"is_group": 0
			}
		};
	});
}

function add_custom_buttons(frm) {
	// Add button to view pending transactions
	frm.add_custom_button(__("View Pending Sync"), function() {
		frappe.set_route("List", "Financial Transaction", {
			"synced": 0,
			"docstatus": ["<", 2]
		});
	});

	// Add button for bulk sync (if there are pending transactions)
	frappe.call({
		method: "finance_tracker.finance_tracker.sync_engine.get_pending_transactions",
		args: { limit: 1 },
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				frm.add_custom_button(__("Bulk Sync Pending"), function() {
					show_bulk_sync_dialog();
				}).addClass("btn-primary");
			}
		}
	});
}

function show_bulk_sync_dialog() {
	// Show dialog for bulk sync
	frappe.call({
		method: "finance_tracker.finance_tracker.sync_engine.get_pending_transactions",
		args: { limit: 100 },
		callback: function(r) {
			if (r.message && r.message.length > 0) {
				let pending_list = r.message;

				let d = new frappe.ui.Dialog({
					title: __("Bulk Sync Transactions"),
					fields: [
						{
							fieldname: "info",
							fieldtype: "HTML",
							options: `<p>${__("Found {0} pending transactions", [pending_list.length])}</p>`
						},
						{
							fieldname: "transactions",
							fieldtype: "Table MultiSelect",
							label: __("Select Transactions"),
							options: pending_list.map(t => ({
								name: t.name,
								label: `${t.name} - ${t.transaction_type} - ${t.amount}`
							}))
						}
					],
					primary_action_label: __("Sync Selected"),
					primary_action: function(values) {
						// Get selected transaction names
						let selected = pending_list.map(t => t.name);

						frappe.call({
							method: "finance_tracker.finance_tracker.sync_engine.bulk_sync_transactions",
							args: {
								transaction_names: selected
							},
							freeze: true,
							freeze_message: __("Syncing {0} transactions...", [selected.length]),
							callback: function(r) {
								if (r.message) {
									frappe.msgprint({
										title: __("Bulk Sync Complete"),
										message: __("Success: {0}<br>Failed: {1}", [
											r.message.success.length,
											r.message.failed.length
										]),
										indicator: r.message.failed.length === 0 ? "green" : "orange"
									});
									d.hide();
								}
							}
						});
					}
				});

				d.show();
			} else {
				frappe.msgprint(__("No pending transactions found"));
			}
		}
	});
}

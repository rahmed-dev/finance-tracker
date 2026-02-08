"""Finance Tracker PWA - Main Tracker Page"""

import frappe

def get_context(context):
    """Page context for Finance Tracker PWA."""
    context.no_cache = 1
    context.show_sidebar = False

    # Check if user is logged in
    if frappe.session.user == "Guest":
        frappe.local.flags.redirect_location = "/login?redirect-to=/tracker"
        raise frappe.Redirect

    return context

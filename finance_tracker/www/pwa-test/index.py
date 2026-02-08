"""PWA Phase 1 Test Page"""

import frappe

def get_context(context):
    """Page context for PWA test page."""
    context.no_cache = 1
    context.show_sidebar = False
    return context

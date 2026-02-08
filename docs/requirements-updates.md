# Requirements Update Summary - 2026-02-06

## Changes Made Based on Riz's Feedback

### 1. ✅ Custom App Architecture (NOT Standard ERPNext)
**Before:** Using standard ERPNext Expense Claim
**After:** Fully custom app with no dependency on standard Expense Claim DocType

**Rationale:** Standard Expense Claim doesn't fit the use case. Need full control over functionality.

---

### 2. ✅ Unified Transaction DocType with Smart Logic
**Before:** Separate "Expense Entry" and "Income Entry" DocTypes
**After:** Single "Financial Transaction" DocType with `transaction_type` field

**Smart Document Creation Logic:**
```
Financial Transaction Type → Creates ERPNext Document
─────────────────────────────────────────────────
Income + Customer          → Sales Invoice
Income (no customer)       → Journal Entry
Expense + Supplier         → Purchase Invoice
Expense (no supplier)      → Journal Entry
Transfer                   → Journal Entry (transfer type)
Correction                 → Journal Entry (adjustment)
```

**Benefits:**
- Cleaner architecture (1 DocType instead of 2)
- Unified transaction history
- Flexible routing to appropriate ERPNext documents
- Simpler UI (one entry form)

---

### 3. ✅ Category-Based Account Mapping
**Before:** Default accounts in Tracker Settings
**After:** Accounts linked at Category level

**New DocType:** Transaction Category
- Category name and code
- Category type (Income/Expense)
- **Linked Account** (GL Account) - Required
- Default tax template
- Color and icon for UI
- Active/inactive status

**Example Categories:**
```
Meals & Entertainment → 5110 - Meals Expense
Product Sales → 4000 - Sales Revenue
Consulting → 4200 - Consulting Revenue
```

**Benefits:**
- No default account configuration needed
- Flexible per-category account mapping
- Easy to add new categories
- Consistent accounting

---

### 4. ✅ Accounting Dimension Support (Future)
**Phase 2+ Feature:** Make Transaction Category an Accounting Dimension

**Benefits:**
- Enable dimension-based reporting across all ERPNext transactions
- Budget tracking by category dimension
- Advanced analytics and insights

**Note:** Documented for future implementation, not Phase 1.

---

### 5. ✅ Modern UI Design (Cashew-Inspired)
**Before:** Basic/simple interface
**After:** Modern, card-based design inspired by Cashew Budget App

**Reference:** https://cashewapp.web.app

**Key Design Elements:**
- Clean, minimal, modern interface
- Color-coded category cards with icons
- Card-based transaction list
- Floating action button (FAB) for quick entry
- Touch-optimized controls (44px+ targets)
- Bottom navigation for mobile
- Smooth animations and transitions
- Pull-to-refresh for sync
- Visual feedback for all actions

**Dashboard Layout:**
- Balance summary card (monthly income/expense)
- Recent transactions (card list)
- Sync status indicator
- Quick action FAB

---

### 6. ✅ Technical Implementation Guidance
**Directive:** Use Frappe's own apps as reference, follow Frappe best practices

**Implementation Approach:**
- Study **frappe/frappe** repo for core patterns
- Reference **frappe/erpnext** for DocType design
- Use Frappe's built-in utilities (never reinvent)
- Follow Frappe coding standards
- Leverage Frappe UI components

**Note:** Cannot pre-confirm technical architecture details. Will follow Frappe best practices during implementation.

---

## Updated DocType Structure

### Financial Transaction (Main)
```python
{
  "doctype": "Financial Transaction",
  "fields": [
    "transaction_type",    # Income/Expense/Transfer/Correction
    "date",
    "category",            # Link to Transaction Category
    "amount",
    "party_type",          # Customer/Supplier (optional)
    "party",               # Dynamic Link (optional)
    "payment_account",
    "description",
    "receipt_image",
    "tax_amount",
    "tags",
    "synced",              # Sync status
    "reference_doctype",   # Created document type
    "reference_name",      # Created document name
    "sync_error"
  ]
}
```

### Transaction Category (Master)
```python
{
  "doctype": "Transaction Category",
  "fields": [
    "category_name",
    "category_code",
    "category_type",         # Income/Expense
    "account",               # Linked GL Account (required)
    "default_tax_template",
    "color",                 # For UI
    "icon",                  # For UI
    "is_active"
  ]
}
```

---

## Sync Logic Updates

### Smart Sync Function
```python
def sync_transaction_to_erpnext(transaction_name):
    """Route transaction to appropriate ERPNext document."""
    txn = frappe.get_doc("Financial Transaction", transaction_name)
    category = frappe.get_doc("Transaction Category", txn.category)

    # Smart routing based on type and party
    if txn.transaction_type == "Income" and txn.party_type == "Customer":
        result = create_sales_invoice(txn, category.account)
    elif txn.transaction_type == "Expense" and txn.party_type == "Supplier":
        result = create_purchase_invoice(txn, category.account)
    else:
        result = create_journal_entry(txn, category.account)

    # Update transaction with created document reference
    txn.synced = 1
    txn.reference_doctype = result["doctype"]
    txn.reference_name = result["name"]
    txn.save()
```

---

## What Stays the Same

✅ Offline-first architecture with IndexedDB
✅ PWA with service workers
✅ Background sync when online
✅ Photo receipt capture
✅ Party caching for offline access
✅ Sync status indicators
✅ Budget tracking as Phase 2 feature

---

## Next Steps

1. **Review:** Confirm these architectural changes align with requirements
2. **Design:** Reference Cashew app UI for detailed design patterns
3. **Implement:** Begin Phase 1 development using `*implement` command
4. **Test:** Validate offline mode, sync logic, and ERPNext integration

---

## Open Questions

1. Should categories support hierarchy (parent-child)? → **Phase 1: Flat structure**
2. Multi-currency support? → **Phase 1: Single currency, Phase 2: Multi-currency**
3. Allow editing synced transactions? → **No, create correction entry instead**

---

---

## Phase 1 Implementation Updates - 2026-02-06 Evening Session

### 7. ✅ Category-Specific Item Linking (User Testing Feedback)
**Problem:** Sales/Purchase Invoices require items, but system was using generic items for all categories
**Solution:** Added optional `item` field to Transaction Category DocType

**Implementation:**
- Added `item` field (Link to Item) in Transaction Category
- Added validation: Item must be non-stock (is_stock_item = 0)
- Updated invoice creation logic:
  - Priority: Use category.item if set
  - Fallback: Use generic "Income Item" / "Expense Item"
- Updated both financial_transaction.py and sync_engine.py

**Benefits:**
- Category-specific items for better reporting
- Flexible: Optional field with smart fallback
- Each category can have its own service item
- Example: "Consulting Services" category → "Hourly Consulting" item

**Example Usage:**
```
Category: Professional Services
→ Account: 4100 - Service Income
→ Item: "Consulting Service" (non-stock)
→ Creates SI with specific item instead of generic "Income Item"
```

---

### 8. ✅ Dynamic Link for Created Documents (User Testing Feedback)
**Problem:** `reference_name` was plain text field, not clickable in UI
**Solution:** Changed to Dynamic Link field for direct navigation

**Implementation:**
- Changed `reference_name` from Data to Dynamic Link
- Added options: reference_doctype
- Allows clicking to navigate to Sales Invoice / Purchase Invoice / Journal Entry

**Benefits:**
- One-click navigation to created documents
- Better UX for tracking and reviewing transactions
- Standard Frappe pattern for document references

---

## Updated DocType Structure (Post Phase 1 Implementation)

### Transaction Category (Master) - UPDATED
```python
{
  "doctype": "Transaction Category",
  "fields": [
    "category_name",
    "category_code",
    "category_type",         # Income/Expense/Transfer
    "account",               # Linked GL Account (required)
    "item",                  # Non-stock Item (optional) ← NEW
    "default_tax_template",
    "color",                 # For UI
    "icon",                  # For UI
    "is_active"
  ]
}
```

### Financial Transaction (Main) - UPDATED
```python
{
  "doctype": "Financial Transaction",
  "fields": [
    "transaction_type",      # Income/Expense/Transfer
    "date",
    "category",              # Link to Transaction Category
    "amount",
    "customer",              # Shown for Income type
    "supplier",              # Shown for Expense type
    "payment_account",
    "description",
    "receipt_image",
    "tax_amount",
    "tags",
    "reference_doctype",     # Created document type
    "reference_name",        # Dynamic Link (clickable!) ← UPDATED
    "amended_from"
  ]
}
```

---

**Document Status:** ✅ Phase 1 Complete with User Testing Improvements
**Last Updated:** 2026-02-06 Evening
**Primary Requirements Doc:** `/home/riz/bench-15/_bmad-output/expense-income-tracker-pwa-requirements.md`

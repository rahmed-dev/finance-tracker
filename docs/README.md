# Finance Tracker App - Complete Documentation

**For:** Future Context & Development Reference
**Date:** 2026-02-06
**Site:** bt.dev
**Status:** ✅ Phase 1 Complete - Core functionality implemented and migrated

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [DocTypes Reference](#doctypes-reference)
4. [Business Logic](#business-logic)
5. [Client Scripts](#client-scripts)
6. [API Endpoints](#api-endpoints)
7. [Workflows](#workflows)
8. [Code Files](#code-files)
9. [Development Notes](#development-notes)
10. [Future Enhancements](#future-enhancements)

---

## 1. Overview

### Purpose
A simplified expense/income tracking system integrated directly with ERPNext accounting. **NOT** using standard ERPNext Expense Claim - fully custom implementation.

### Key Features
- ✅ Financial Transaction tracking (Income/Expense/Transfer)
- ✅ Category-based account mapping
- ✅ Automatic ERPNext document creation on submit
- ✅ Support for Customer/Supplier linking
- ✅ Mobile-friendly (foundation for future PWA)

### Design Philosophy
**Simple and Direct:** Financial Transaction → Submit → ERPNext Document Created

**No Sync Complexity:** Originally designed with offline sync, but **simplified** to direct submission for cleaner UX.

---

## 2. Architecture Decisions

### 2.1 Key Design Choices

#### ❌ What We DON'T Use:
- Standard ERPNext Expense Claim
- Sync button (removed for simplicity)
- Dynamic Link fields (caused validation issues)
- Offline sync complexity

#### ✅ What We DO Use:
- Custom Financial Transaction DocType (submittable)
- Direct document creation on submit
- Category-based routing (auto-selects transaction type)
- Separate Customer/Supplier Link fields

### 2.2 Transaction Flow

```
User creates Financial Transaction (Draft)
    ↓
Selects Category (auto-sets Type)
    ↓
Submits
    ↓
on_submit() creates appropriate ERPNext document:
    ├─ Income + Customer → Sales Invoice (submitted)
    ├─ Expense + Supplier → Purchase Invoice (submitted)
    └─ Everything else → Journal Entry (submitted)
```

### 2.3 Why This Approach?

**Original Plan:** Offline-first PWA with sync button
**Problem:** Too complex for initial use case
**Solution:** Simplified to direct submission
**Benefit:** Clean, standard Frappe pattern, immediate accounting entries

---

## 3. DocTypes Reference

### 3.1 Transaction Category (Master Data)

**Purpose:** Define income/expense/transfer categories with linked GL accounts

**Key Fields:**
```python
{
    "category_name": "Data (Required, Unique)",  # e.g., "Meals & Entertainment"
    "category_code": "Data",                      # Auto-generated, e.g., "MEALS_ENTE"
    "category_type": "Select (Required)",         # Income / Expense / Transfer
    "account": "Link to Account (Required)",      # GL Account to post to
    "item": "Link to Item",                       # Non-stock item for invoices (optional)
    "default_tax_template": "Link to Item Tax Template",
    "color": "Color",                             # For UI (future PWA)
    "icon": "Data",                               # For UI (future PWA)
    "is_active": "Check (Default: 1)"
}
```

**Validations:**
- Income category → Must link to Income Account
- Expense category → Must link to Expense Account
- Transfer category → Must link to Bank/Cash Account
- Item (if provided) → Must be a non-stock item

**Auto-Generate:** Category code from name (e.g., "Meals" → "MEALS")

**Item Linking:**
- Optional: Link a specific non-stock item per category
- If no item linked: System uses generic "Income Item" or "Expense Item"
- Benefit: Category-specific items for better invoice reporting

**Naming:** TC-##### (auto-number)

**Permissions:**
- Accounts Manager: Full access
- Accounts User: Full access
- System Manager: Full access

---

### 3.2 Financial Transaction (Transaction DocType)

**Purpose:** Record income/expense/transfer transactions, auto-create ERPNext documents on submit

**Key Fields:**
```python
{
    # Core Fields
    "transaction_type": "Select (Read-only, Auto-set from category)",  # Income / Expense / Transfer
    "date": "Datetime (Required, Default: Now)",
    "category": "Link to Transaction Category (Required)",
    "amount": "Currency (Required)",

    # Party Fields (conditional visibility)
    "customer": "Link to Customer",          # Shown only for Income type
    "supplier": "Link to Supplier",          # Shown only for Expense type

    # Payment Fields
    "payment_account": "Link to Account",    # Bank/Cash account
    "tax_amount": "Currency",

    # Details
    "description": "Text",
    "receipt_image": "Attach Image",
    "tags": "Data",

    # System Fields (auto-populated on submit)
    "reference_doctype": "Data (Read-only)",        # e.g., "Sales Invoice"
    "reference_name": "Dynamic Link (Read-only)",   # e.g., "SI-2024-00001" (clickable!)
    "amended_from": "Link to Financial Transaction"
}
```

**Important Behaviors:**
- `transaction_type` is **read-only** - auto-set when category is selected
- Customer field shown only when type = Income
- Supplier field shown only when type = Expense
- Both hidden for Transfer type

**Document Lifecycle:**
```python
Draft (docstatus=0):
    - User can edit freely
    - No ERPNext document created yet

Submitted (docstatus=1):
    - on_submit() creates ERPNext document
    - reference_doctype and reference_name populated
    - Cannot be edited
    - Can be cancelled

Cancelled (docstatus=2):
    - on_cancel() cancels linked ERPNext document
    - Reversal entry
```

**Naming:** FT-##### (auto-number)

**Is Submittable:** Yes

**Permissions:**
- All: Create, Read Own, Write Own
- Accounts User: Read All
- System Manager: Full Access

---

### 3.3 Tracker Settings (Single DocType)

**Purpose:** Global settings for Finance Tracker app

**Fields:**
```python
{
    "auto_submit_documents": "Check",             # NOT USED (always submit)
    "sync_interval": "Select",                    # NOT USED (no sync)
    "cache_party_count": "Int (Default: 50)",     # For future PWA
    "default_payment_account": "Link to Account"  # Default bank/cash account
}
```

**Note:** Some fields are placeholders for future PWA implementation.

**Permissions:**
- System Manager: Full access
- Accounts Manager: Read, Write

---

## 4. Business Logic

### 4.1 Transaction Category Controller

**File:** `transaction_category.py`

**Methods:**
```python
def validate(self):
    """Main validation hook."""
    self.validate_account_type()
    self.validate_item()
    self.set_defaults()

def validate_account_type(self):
    """Ensure account type matches category type."""
    # Income → Income Account
    # Expense → Expense Account
    # Transfer → Bank or Cash Account

def validate_item(self):
    """Validate that item is a non-stock item if provided."""
    # If item is linked, must be non-stock (is_stock_item = 0)
    # Prevents linking stock items which would cause issues

def set_defaults(self):
    """Auto-generate category code from name."""
    # "Meals & Entertainment" → "MEALS_ENTE"
```

---

### 4.2 Financial Transaction Controller

**File:** `financial_transaction.py`

**Validation Methods:**
```python
def validate(self):
    """Main validation hook."""
    self.validate_amounts()
    self.validate_party_selection()
    self.validate_category()
    self.set_defaults()

def validate_amounts(self):
    """Amount must be > 0, tax cannot be negative."""
    if flt(self.amount) <= 0:
        frappe.throw("Amount must be greater than zero")

def validate_party_selection(self):
    """Validate customer/supplier based on type."""
    # Cannot select both customer AND supplier
    # Income → Should use Customer (if party selected)
    # Expense → Should use Supplier (if party selected)

def validate_category(self):
    """Category type must match transaction type."""
    # Income transaction → Income category
    # Expense transaction → Expense category
    # Transfer transaction → Transfer category

def set_defaults(self):
    """Set default date and payment account."""
    if not self.date:
        self.date = now_datetime()
    if not self.payment_account:
        # Get from Tracker Settings
        self.payment_account = settings.default_payment_account
```

**Document Creation Methods:**
```python
def on_submit(self):
    """Create ERPNext document on submission."""
    category = frappe.get_cached_doc("Transaction Category", self.category)
    account = category.account

    # Route based on type and party
    if self.transaction_type == "Income" and self.customer:
        doc = self.create_sales_invoice(account)
    elif self.transaction_type == "Expense" and self.supplier:
        doc = self.create_purchase_invoice(account)
    else:
        doc = self.create_journal_entry(account)

    # Store reference
    self.db_set("reference_doctype", doc.doctype)
    self.db_set("reference_name", doc.name)

def create_sales_invoice(self, income_account):
    """Create and submit Sales Invoice."""
    # Gets item from category.item (if set)
    # Falls back to generic "Income Item" (auto-created if not exists)
    # Posts to income_account from category
    # Auto-submits
    return sales_invoice

def create_purchase_invoice(self, expense_account):
    """Create and submit Purchase Invoice."""
    # Gets item from category.item (if set)
    # Falls back to generic "Expense Item" (auto-created if not exists)
    # Posts to expense_account from category
    # Auto-submits
    return purchase_invoice

def create_journal_entry(self, category_account):
    """Create and submit Journal Entry."""
    # For Income (no customer): Dr Payment, Cr Income
    # For Expense (no supplier): Dr Expense, Cr Payment
    # For Transfer: Dr To-Account, Cr From-Account
    return journal_entry

def on_cancel(self):
    """Cancel linked ERPNext document."""
    if self.reference_doctype and self.reference_name:
        linked_doc = frappe.get_doc(self.reference_doctype, self.reference_name)
        if linked_doc.docstatus == 1:
            linked_doc.cancel()
```

**Transfer Logic (Detailed):**
```python
# For Transfer transactions:
# payment_account = FROM account (source)
# category.account = TO account (destination)
#
# Journal Entry:
#   Debit:  TO account (destination)   Amount
#   Credit: FROM account (source)      Amount
```

---

## 5. Client Scripts

### 5.1 Transaction Category Client Script

**File:** `transaction_category.js`

**Features:**
- Dynamic account filtering based on category_type
- Shows only Income accounts for Income category
- Shows only Expense accounts for Expense category
- Shows only Bank/Cash for Transfer category

```javascript
frappe.ui.form.on("Transaction Category", {
    refresh(frm) {
        set_account_filters(frm);
    },
    category_type(frm) {
        set_account_filters(frm);
        // Warn user to re-select account if type changed
    }
});
```

---

### 5.2 Financial Transaction Client Script

**File:** `financial_transaction.js`

**Key Features:**

**1. Auto-Set Transaction Type from Category**
```javascript
category(frm) {
    if (frm.doc.category) {
        // Fetch category_type from Transaction Category
        frappe.db.get_value("Transaction Category", frm.doc.category, "category_type", function(r) {
            // Auto-set transaction_type = category_type
            frm.set_value("transaction_type", r.category_type);
        });
    }
}
```

**2. Smart Field Visibility**
```javascript
function setup_field_dependencies(frm) {
    if (frm.doc.transaction_type === "Income") {
        frm.toggle_display("customer", true);
        frm.toggle_display("supplier", false);
    } else if (frm.doc.transaction_type === "Expense") {
        frm.toggle_display("customer", false);
        frm.toggle_display("supplier", true);
    } else if (frm.doc.transaction_type === "Transfer") {
        frm.toggle_display("customer", false);
        frm.toggle_display("supplier", false);
        // Show hints about from/to accounts
    }
}
```

**3. View Created Document Button**
```javascript
function add_custom_buttons(frm) {
    if (frm.doc.docstatus === 1 && frm.doc.reference_doctype) {
        frm.add_custom_button(__("View {0}", [frm.doc.reference_doctype]), function() {
            frappe.set_route("Form", frm.doc.reference_doctype, frm.doc.reference_name);
        });
    }
}
```

**4. Info Message**
```javascript
// Shows user what will be created on submit
if (frm.doc.docstatus === 0) {
    let target_doc = get_target_doctype(frm.doc);
    // "On submit, this will create: Sales Invoice"
}
```

---

### 5.3 Tracker Settings Client Script

**File:** `tracker_settings.js`

**Features:**
- View Pending Sync button (placeholder for future)
- Bulk operations (placeholder for future PWA)
- Cache count validation warnings

---

## 6. API Endpoints

### 6.1 Party Caching API

**File:** `api.py`

**Endpoints:**

```python
@frappe.whitelist()
def get_cached_parties(party_type="Customer", limit=50):
    """Get frequently used customers/suppliers.

    Returns parties sorted by transaction frequency.
    Used for future PWA offline caching.
    """
    # Queries Sales Invoices for Customers
    # Queries Purchase Invoices for Suppliers
    # Returns: name, party_name, mobile, email, image, transaction_count

@frappe.whitelist()
def get_transaction_categories(category_type=None):
    """Get active transaction categories.

    Args:
        category_type: Optional filter (Income/Expense/Transfer)

    Returns: Active categories with account info
    """

@frappe.whitelist()
def get_default_payment_account():
    """Get default payment account from Tracker Settings."""

@frappe.whitelist()
def get_transaction_summary(from_date=None, to_date=None):
    """Get transaction summary for dashboard.

    Returns: income, expense, balance, pending_sync_count
    """

@frappe.whitelist()
def get_recent_transactions(limit=20):
    """Get recent transactions with category details.

    Enriches with category color/icon for future PWA.
    """
```

---

### 6.2 Sync Engine API (Mostly Unused)

**File:** `sync_engine.py`

**Status:** Most functions are **NOT USED** since we removed sync complexity.

**Still Used:**
```python
def get_or_create_generic_item(item_name, item_group="Service"):
    """Create generic items for invoices if not exists.

    Creates: "Income Item" and "Expense Item"
    Used by: create_sales_invoice(), create_purchase_invoice()
    """

def get_voucher_type(transaction_type):
    """Get Journal Entry voucher type.

    Income/Expense → "Journal Entry"
    Transfer → "Bank Entry"
    """
```

**NOT Used (Legacy from sync design):**
- `sync_transaction_to_erpnext()`
- `get_pending_transactions()`
- `bulk_sync_transactions()`

**Note:** These can be removed in future cleanup.

---

## 7. Workflows

### 7.1 Income with Customer → Sales Invoice

**Steps:**
1. User creates Financial Transaction
2. Selects Income category (e.g., "Service Revenue")
3. Transaction type auto-set to "Income"
4. Selects Customer
5. Enters amount, payment account, description
6. Submits

**Result:**
- Sales Invoice created and submitted
- Customer invoiced
- Income posted to GL Account from category
- reference_doctype = "Sales Invoice"
- reference_name = SI-####

---

### 7.2 Expense with Supplier → Purchase Invoice

**Steps:**
1. User creates Financial Transaction
2. Selects Expense category (e.g., "Office Supplies")
3. Transaction type auto-set to "Expense"
4. Selects Supplier
5. Enters amount, payment account, description
6. Submits

**Result:**
- Purchase Invoice created and submitted
- Supplier billed
- Expense posted to GL Account from category
- reference_doctype = "Purchase Invoice"
- reference_name = PI-####

---

### 7.3 Income without Customer → Journal Entry

**Steps:**
1. User creates Financial Transaction
2. Selects Income category (e.g., "Miscellaneous Income")
3. Transaction type auto-set to "Income"
4. Does NOT select Customer
5. Enters amount, payment account
6. Submits

**Result:**
- Journal Entry created and submitted
- Dr: Payment Account (cash/bank)
- Cr: Income Account (from category)

---

### 7.4 Expense without Supplier → Journal Entry

**Steps:**
1. User creates Financial Transaction
2. Selects Expense category (e.g., "Petty Cash Expense")
3. Transaction type auto-set to "Expense"
4. Does NOT select Supplier
5. Enters amount, payment account
6. Submits

**Result:**
- Journal Entry created and submitted
- Dr: Expense Account (from category)
- Cr: Payment Account (cash/bank)

---

### 7.5 Transfer → Journal Entry

**Steps:**
1. Create Transfer Category:
   - Name: "Bank to Petty Cash"
   - Type: Transfer
   - Linked Account: Petty Cash (TO account)

2. User creates Financial Transaction:
   - Selects category "Bank to Petty Cash"
   - Transaction type auto-set to "Transfer"
   - Payment Account: Main Bank (FROM account)
   - Amount: $500
   - Submits

**Result:**
- Journal Entry created and submitted
- Dr: Petty Cash (TO - from category)    $500
- Cr: Main Bank (FROM - payment_account) $500
- Voucher Type: "Bank Entry"

---

## 8. Code Files

### 8.1 File Structure

```
finance_tracker/finance_tracker/
│
├── doctype/
│   ├── transaction_category/
│   │   ├── transaction_category.json          (8 fields, 3 types)
│   │   ├── transaction_category.py            (40 lines - validation)
│   │   ├── transaction_category.js            (40 lines - account filtering)
│   │   └── test_transaction_category.py
│   │
│   ├── financial_transaction/
│   │   ├── financial_transaction.json         (15 fields, submittable)
│   │   ├── financial_transaction.py           (170 lines - full logic)
│   │   ├── financial_transaction.js           (130 lines - UI behavior)
│   │   └── test_financial_transaction.py
│   │
│   └── tracker_settings/
│       ├── tracker_settings.json              (4 fields, single)
│       ├── tracker_settings.py                (20 lines - validation)
│       ├── tracker_settings.js                (120 lines - bulk ops)
│       └── test_tracker_settings.py
│
├── sync_engine.py                             (350 lines - mostly unused)
├── api.py                                     (180 lines - caching APIs)
└── hooks.py                                   (standard Frappe hooks)
```

### 8.2 Lines of Code Summary

| Category | Files | Lines |
|----------|-------|-------|
| Python Controllers | 3 | ~230 |
| JavaScript | 3 | ~290 |
| API & Sync Engine | 2 | ~530 |
| **Total** | **8** | **~1,050** |

---

## 9. Development Notes

### 9.1 Important Decisions Made

**1. Removed Dynamic Link Field**
- **Problem:** Frappe validation error with `party_type` (Select) + `party` (Dynamic Link)
- **Solution:** Separate `customer` (Link) and `supplier` (Link) fields
- **Benefit:** Simpler, more standard, no validation issues

**2. Removed Sync Button**
- **Problem:** Original design had sync complexity for offline PWA
- **Solution:** Direct submission with `on_submit()` hook
- **Benefit:** Much simpler, standard Frappe pattern

**3. Auto-Select Type from Category**
- **Problem:** Users could mismatch transaction type and category type
- **Solution:** Made transaction_type read-only, auto-set from category
- **Benefit:** Always in sync, fewer errors, better UX

**4. Added Transfer Category Type**
- **Problem:** Transfer logic was unclear, no proper category support
- **Solution:** Added "Transfer" as category_type option
- **Benefit:** Clean transfer handling, category determines TO account

**5. Category-Specific Item Linking** (2026-02-06 Update)
- **Problem:** All invoices used generic "Income Item" / "Expense Item"
- **Solution:** Added optional `item` field to Transaction Category
- **Benefit:** Each category can have specific item for better invoice reporting
- **Validation:** Item must be non-stock if provided
- **Fallback:** System still uses generic items if category.item is empty

**6. Dynamic Link for Reference** (2026-02-06 Update)
- **Problem:** `reference_name` was plain text, not clickable
- **Solution:** Changed to Dynamic Link field with options: reference_doctype
- **Benefit:** Click reference_name to navigate directly to created document

---

### 9.2 Validation Rules

**Transaction Category:**
- category_name must be unique
- Income category → Income Account
- Expense category → Expense Account
- Transfer category → Bank/Cash Account

**Financial Transaction:**
- amount > 0
- tax_amount >= 0
- Cannot select both customer AND supplier
- Income + Supplier = Error (should use Customer)
- Expense + Customer = Error (should use Supplier)
- Category type must match transaction type
- Cannot submit if already synced (legacy field, should be removed)

---

### 9.3 Known Issues / Technical Debt

**1. Unused Sync Engine Functions**
- Many functions in `sync_engine.py` are unused
- **Action:** Can be removed or refactored in future

**2. Unused Settings Fields**
- `auto_submit_documents` - not used (always submits)
- `sync_interval` - not used (no sync concept)
- **Action:** Clean up or repurpose for future features

**3. Generic Items**
- Creates "Income Item" and "Expense Item" on first use
- These are service items with no stock
- **Consider:** Could be created during app installation as fixtures

**4. Missing Fixtures**
- No default categories created
- **Action:** Add default categories as fixtures for new installations

**5. Test Files**
- Test files exist but are empty scaffolds
- **Action:** Write unit tests for validation logic

---

### 9.4 Frappe Best Practices Followed

✅ **Server-side business logic** - All calculations in Python
✅ **Parameterized SQL** - No string concatenation
✅ **@frappe.whitelist()** - All API methods decorated
✅ **frappe.utils** - Using getdate(), flt(), now_datetime()
✅ **frappe.get_cached_doc()** - For performance
✅ **frappe.throw()** - User-facing errors
✅ **frappe.log_error()** - System errors
✅ **Descriptive names** - No x, data, temp variables
✅ **Minimal helpers** - Only created when used 3+ times

---

## 10. Future Enhancements

### 10.1 Phase 2: Budget Tracking

**Goal:** Monthly budgets by category with alerts

**Requirements:**
- Budget DocType (monthly limits by category)
- Budget vs actual dashboard
- Alert notifications (80%, 100% thresholds)
- Historical trends

**Estimated Effort:** 3-4 days

---

### 10.2 Phase 3: PWA Implementation

**Goal:** True offline-first mobile app

**Requirements:**
- Service workers for offline support
- IndexedDB for local storage
- Background sync when online
- Installable as mobile app
- Modern UI (Cashew-inspired design)

**Estimated Effort:** 5-7 days

**Notes:**
- Many API endpoints already prepared for this
- Party/category caching functions ready
- UI color/icon fields in place

---

### 10.3 Future Features (Ideas)

**Receipt OCR:**
- Auto-extract amount, date, vendor from photos
- Uses cloud vision API
- Pre-fills transaction fields

**Recurring Transactions:**
- Template for repeating expenses/income
- Auto-create on schedule
- Useful for subscriptions, rent, etc.

**Multi-Currency:**
- Support foreign currency transactions
- Auto-conversion at posting date rate
- Separate forex gain/loss handling

**Analytics Dashboard:**
- Spending trends by category
- Income vs expense charts
- Category-wise breakdown
- Month-over-month comparison

**Bank Feed Integration:**
- Import bank transactions
- Auto-match to Financial Transactions
- Reconciliation workflow

---

## 11. Quick Reference

### 11.1 Common Tasks

**Create a new Income category:**
```
Go to: Transaction Category > New
Category Name: Service Revenue
Category Type: Income
Linked Account: 4100 - Service Income
Save
```

**Create a new Expense category:**
```
Go to: Transaction Category > New
Category Name: Office Supplies
Category Type: Expense
Linked Account: 5130 - Office Expense
Save
```

**Create a Transfer category:**
```
Go to: Transaction Category > New
Category Name: Bank to Cash Transfer
Category Type: Transfer
Linked Account: Cash - Main (destination account)
Save
```

**Record Income from Customer:**
```
Go to: Financial Transaction > New
Category: Service Revenue (auto-sets Type = Income)
Customer: ABC Corp
Amount: $1,000
Payment Account: Main Bank
Submit → Sales Invoice created!
```

**Record Expense to Supplier:**
```
Go to: Financial Transaction > New
Category: Office Supplies (auto-sets Type = Expense)
Supplier: Office Depot
Amount: $250
Payment Account: Main Bank
Submit → Purchase Invoice created!
```

**Transfer Money:**
```
Go to: Financial Transaction > New
Category: Bank to Cash Transfer (auto-sets Type = Transfer)
Payment Account: Main Bank (FROM)
Amount: $500
Submit → Journal Entry created!
   Dr: Cash - Main    $500
   Cr: Main Bank      $500
```

---

### 11.2 Troubleshooting

**Problem:** Transaction type doesn't auto-fill when category selected
- **Check:** Is transaction_type field visible? Should be read-only
- **Fix:** Clear cache, rebuild: `bench build --app finance_tracker`

**Problem:** Cannot select certain accounts in category
- **Check:** Account type matches category type?
- **Fix:** Use correct account type (Income Account for Income, etc.)

**Problem:** Submit fails with "Amount must be greater than zero"
- **Check:** Amount field value
- **Fix:** Enter valid positive amount

**Problem:** Generic items not created
- **Check:** Item creation permission
- **Fix:** Ensure user has Item create permission

**Problem:** Reference document not showing after submit
- **Check:** ERPNext document was created?
- **Fix:** Check error log, may need to fix document creation logic

---

### 11.3 Development Commands

**Build assets:**
```bash
bench build --app finance_tracker
```

**Migrate database:**
```bash
bench --site bt.dev migrate
```

**Clear cache:**
```bash
bench --site bt.dev clear-cache
```

**Restart bench:**
```bash
bench restart
```

**Run tests:**
```bash
bench --site bt.dev run-tests --app finance_tracker
```

**Export fixtures:**
```bash
bench --site bt.dev export-fixtures
```

---

## 12. Context for Next Session

### What Was Built
✅ Complete Phase 1 implementation
✅ All 3 DocTypes created and migrated
✅ Business logic fully implemented
✅ Client scripts with auto-type-selection
✅ Transfer logic working properly
✅ Direct submission (no sync complexity)

### What Works
✅ Income with customer → Sales Invoice
✅ Expense with supplier → Purchase Invoice
✅ Income/Expense without party → Journal Entry
✅ Transfer between accounts → Journal Entry
✅ Category-based account mapping
✅ Auto-cancel of linked documents

### What's Next
- User testing on bt.dev
- Create default categories (fixtures)
- Write unit tests
- Clean up unused sync functions
- Consider PWA implementation (Phase 3)

### State of Files
- All Python controllers: ✅ Complete
- All JavaScript: ✅ Complete
- All JSON: ✅ Complete
- Build: ✅ Success
- Migration: ✅ Success
- Site: bt.dev
- Status: Ready for use

---

## 13. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (Frappe Desk / ERPNext UI)                  │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│           Financial Transaction (DocType)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  User Selects Category → Type Auto-Set           │  │
│  │  Fills: Amount, Customer/Supplier, Payment Acct  │  │
│  │  Submits                                          │  │
│  └───────────────┬───────────────────────────────────┘  │
└──────────────────┼──────────────────────────────────────┘
                   │
                   ▼ on_submit()
         ┌─────────┴──────────┐
         │  Route Based On:   │
         │  - Type            │
         │  - Party (if any)  │
         └─────────┬──────────┘
                   │
       ┌───────────┼───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌────────────┐
│  Sales   │ │ Purchase │ │  Journal   │
│ Invoice  │ │ Invoice  │ │   Entry    │
└────┬─────┘ └────┬─────┘ └─────┬──────┘
     │            │              │
     └────────────┼──────────────┘
                  │
                  ▼
        ┌──────────────────┐
        │  General Ledger  │
        │   (Accounting)   │
        └──────────────────┘
```

---

## 14. Database Schema

### Transaction Category
```sql
CREATE TABLE `tabTransaction Category` (
  `name` varchar(140) PRIMARY KEY,
  `category_name` varchar(140) UNIQUE NOT NULL,
  `category_code` varchar(140),
  `category_type` varchar(140) NOT NULL,  -- Income/Expense/Transfer
  `account` varchar(140) NOT NULL,
  `default_tax_template` varchar(140),
  `color` varchar(140),
  `icon` varchar(140),
  `is_active` int(1) DEFAULT 1,
  -- Standard Frappe fields (creation, modified, owner, etc.)
);
```

### Financial Transaction
```sql
CREATE TABLE `tabFinancial Transaction` (
  `name` varchar(140) PRIMARY KEY,
  `transaction_type` varchar(140) NOT NULL,
  `date` datetime NOT NULL,
  `category` varchar(140) NOT NULL,
  `amount` decimal(18,6) NOT NULL,
  `customer` varchar(140),
  `supplier` varchar(140),
  `payment_account` varchar(140),
  `tax_amount` decimal(18,6),
  `description` text,
  `receipt_image` text,
  `tags` varchar(140),
  `reference_doctype` varchar(140),
  `reference_name` varchar(140),
  `docstatus` int(1) DEFAULT 0,  -- 0=Draft, 1=Submitted, 2=Cancelled
  `amended_from` varchar(140),
  -- Standard Frappe fields
);
```

---

_End of Documentation_

**Document Version:** 1.0
**Last Updated:** 2026-02-06
**Status:** Complete and Current
**Next Review:** After user testing on bt.dev

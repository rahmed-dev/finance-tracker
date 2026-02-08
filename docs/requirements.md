# Expense & Income Tracker PWA - Product Requirements Document

**Project:** Offline-First Expense & Income Tracking PWA for ERPNext
**Owner:** Riz
**Date:** 2026-02-06
**Status:** Requirements Definition
**Target Site:** tk.dev (Truckoom ERP)

---

## 1. Project Overview

### 1.1 Purpose
Build a **Progressive Web App (PWA)** integrated with ERPNext to enable offline-first expense and income tracking on mobile devices. The app will automatically sync data to ERPNext when online, creating appropriate accounting entries (Sales Invoices, Purchase Invoices, or Journal Entries) based on transaction type.

### 1.2 Problem Statement
- Current expense tracking requires manual entry in ERPNext (desktop-only, requires internet)
- No mobile-friendly way to capture expenses on-the-go
- Income tracking with customer attribution is cumbersome
- No offline capability for field workers or areas with poor connectivity
- Standard ERPNext Expense Claim is not fit for purpose

### 1.3 Solution
A **custom Frappe app** (NOT using standard ERPNext Expense Claim) with PWA that:
- Works offline using IndexedDB
- Single unified transaction DocType with smart entry type detection
- Automatically creates correct ERPNext documents:
  - **Income + Customer** → Sales Invoice
  - **Expense + Supplier** → Purchase Invoice
  - **Expense (no supplier)** → Journal Entry
  - **Transfer/Correction** → Journal Entry (transfer type)
- Category-based account mapping (no default accounts)
- Provides budget tracking and alerts (Phase 2)

---

## 2. Core Features

### 2.1 Unified Transaction Entry (Phase 1 - Priority)

**User Story:**
> As a user, I want to quickly record financial transactions (expense/income/transfer) on my mobile phone (even offline), and have the system automatically create the correct accounting entry in ERPNext.

**Features:**
- ✅ Single transaction form with **Type selector**:
  - **Income** (with/without customer)
  - **Expense** (with/without supplier)
  - **Transfer** (between accounts)
  - **Correction** (adjustment entries)
- ✅ Category selection (custom Expense/Income Categories)
- ✅ Amount with currency support
- ✅ Date/time capture (defaults to now)
- ✅ Description/notes field
- ✅ Photo receipt/proof capture (camera or upload)
- ✅ **Party selection** (Customer for income, Supplier for expense)
- ✅ Payment method/account selection
- ✅ Tax/VAT tracking (optional)
- ✅ Tags for custom categorization
- ✅ **Offline storage** - saves to IndexedDB when no connection
- ✅ **Smart sync** - creates appropriate ERPNext document based on type
- ✅ Sync status indicator (pending/synced/failed)

**Data Flow:**
```
User → PWA Form → Select Type → IndexedDB (offline) → Background Sync →
  ↓
  ├─ Income + Customer → Sales Invoice
  ├─ Income (no customer) → Journal Entry
  ├─ Expense + Supplier → Purchase Invoice
  ├─ Expense (no supplier) → Journal Entry
  └─ Transfer/Correction → Journal Entry
```

**ERPNext Integration:**
- **NO standard Expense Claim usage** - fully custom
- Creates appropriate document based on transaction type
- Maps categories to accounts via Category master
- Attaches receipt photo to document
- Applies correct accounting entries

---

### 2.2 Category Management (Phase 1 - Priority)

**User Story:**
> As an admin, I want to configure expense and income categories with linked accounts, so that transactions automatically post to correct ledgers.

**Features:**
- ✅ **Custom DocType: Expense/Income Category**
  - Category name and code
  - Category type (Expense/Income)
  - **Linked account** (GL Account)
  - Default tax template (optional)
  - Color coding for UI
  - Active/inactive status
- ✅ **Future: Accounting Dimension** _(Phase 2+)_
  - Make category an accounting dimension for reporting
  - Enable dimension tracking across all ERPNext transactions
  - Dimension-based analytics and budgeting

**Category Examples:**
```
Expense Categories:
- Meals & Entertainment → 5110 - Meals Expense
- Transportation → 5120 - Travel Expense
- Office Supplies → 5130 - Office Expense
- Utilities → 5140 - Utility Expense

Income Categories:
- Product Sales → 4000 - Sales Revenue
- Service Revenue → 4100 - Service Income
- Consulting → 4200 - Consulting Revenue
```

**Data Flow:**
```
Transaction → Category Selected → Account Auto-Populated → Sync → ERPNext Entry
```

**Benefits:**
- No default account configuration needed
- Flexible account mapping per category
- Consistent accounting across transactions
- Easy category-based reporting

---

### 2.3 Budget Tracking (Phase 2 - Future)

**User Story:**
> As a user, I want to set monthly budgets by category and see spending alerts, so that I stay within budget limits.

**Features (Future):**
- ⏳ Monthly budget setup by expense category
- ⏳ Budget vs actual dashboard
- ⏳ Visual progress bars (spent/remaining)
- ⏳ Alert notifications when approaching limit (80%, 100%)
- ⏳ Historical budget comparison (month-over-month)
- ⏳ Budget rollover options

**Note:** Budget feature deferred to Phase 2 to focus on core expense/income tracking first.

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | Frappe Framework 15.x | Native ERPNext integration |
| **Frontend** | Frappe UI + Vue.js | Frappe's built-in front-end |
| **PWA Support** | Service Workers | Built into Frappe |
| **Offline Storage** | IndexedDB | Browser-native, no extra libs |
| **Image Handling** | Frappe File API | Stores in ERPNext files |
| **Sync Engine** | Background Sync API | Browser-native when online |
| **Authentication** | Frappe Session | SSO with ERPNext |

**Implementation Reference:**
- Study **frappe/frappe** repository for core framework patterns
- Reference **frappe/erpnext** for DocType design and business logic
- Follow Frappe's coding standards and conventions
- Use Frappe's built-in utilities and helpers (never reinvent)
- Cannot confirm technical architecture details - will follow Frappe best practices during implementation

### 3.2 App Structure

```
expense_income_tracker/
├── expense_income_tracker/
│   ├── hooks.py                    # PWA config, doc events
│   ├── expense_tracker/            # Module
│   │   ├── doctype/
│   │   │   ├── expense_entry/      # Offline expense storage
│   │   │   │   ├── expense_entry.py
│   │   │   │   ├── expense_entry.js
│   │   │   │   └── expense_entry.json
│   │   │   ├── income_entry/       # Offline income storage
│   │   │   │   ├── income_entry.py
│   │   │   │   ├── income_entry.js
│   │   │   │   └── income_entry.json
│   │   │   └── tracker_settings/   # App configuration
│   │   │       ├── tracker_settings.py
│   │   │       └── tracker_settings.json
│   │   ├── page/
│   │   │   ├── expense_dashboard/  # Main PWA page
│   │   │   │   ├── expense_dashboard.py
│   │   │   │   ├── expense_dashboard.js
│   │   │   │   └── expense_dashboard.html
│   │   ├── api.py                  # Sync methods
│   │   └── utils.py                # Helper functions
│   ├── public/
│   │   ├── js/
│   │   │   ├── offline_manager.js  # IndexedDB handling
│   │   │   └── sync_engine.js      # Background sync
│   │   └── css/
│   │       └── tracker_mobile.css  # Mobile-optimized styles
│   ├── www/
│   │   └── tracker/                # PWA entry point
│   │       └── index.html
│   └── fixtures/                   # Default expense categories
├── setup.py
└── README.md
```

### 3.3 DocType Design

#### **Financial Transaction** (Main Offline Storage)
```json
{
  "doctype": "Financial Transaction",
  "fields": [
    {"fieldname": "transaction_type", "fieldtype": "Select", "options": "Income\nExpense\nTransfer\nCorrection", "label": "Type", "reqd": 1},
    {"fieldname": "date", "fieldtype": "Datetime", "label": "Date", "reqd": 1},
    {"fieldname": "category", "fieldtype": "Link", "options": "Transaction Category", "label": "Category", "reqd": 1},
    {"fieldname": "amount", "fieldtype": "Currency", "label": "Amount", "reqd": 1},
    {"fieldname": "party_type", "fieldtype": "Select", "options": "\nCustomer\nSupplier", "label": "Party Type"},
    {"fieldname": "party", "fieldtype": "Dynamic Link", "options": "party_type", "label": "Party"},
    {"fieldname": "payment_account", "fieldtype": "Link", "options": "Account", "label": "Payment Account"},
    {"fieldname": "description", "fieldtype": "Text", "label": "Description"},
    {"fieldname": "receipt_image", "fieldtype": "Attach Image", "label": "Receipt/Proof"},
    {"fieldname": "tax_amount", "fieldtype": "Currency", "label": "Tax/VAT"},
    {"fieldname": "tags", "fieldtype": "Data", "label": "Tags"},
    {"fieldname": "synced", "fieldtype": "Check", "label": "Synced to ERPNext", "default": 0},
    {"fieldname": "reference_doctype", "fieldtype": "Data", "label": "Created Document Type", "read_only": 1},
    {"fieldname": "reference_name", "fieldtype": "Dynamic Link", "options": "reference_doctype", "label": "Created Document", "read_only": 1},
    {"fieldname": "sync_error", "fieldtype": "Text", "label": "Sync Error", "read_only": 1}
  ],
  "permissions": [
    {"role": "All", "read": 1, "write": 1, "create": 1}
  ]
}
```

**Smart Logic:**
- `transaction_type = "Income"` + `party_type = "Customer"` → Creates **Sales Invoice**
- `transaction_type = "Income"` + `party = NULL` → Creates **Journal Entry** (income)
- `transaction_type = "Expense"` + `party_type = "Supplier"` → Creates **Purchase Invoice**
- `transaction_type = "Expense"` + `party = NULL` → Creates **Journal Entry** (expense)
- `transaction_type = "Transfer"` → Creates **Journal Entry** (transfer between accounts)
- `transaction_type = "Correction"` → Creates **Journal Entry** (adjustment)

#### **Transaction Category** (Master Data)
```json
{
  "doctype": "Transaction Category",
  "fields": [
    {"fieldname": "category_name", "fieldtype": "Data", "label": "Category Name", "reqd": 1},
    {"fieldname": "category_code", "fieldtype": "Data", "label": "Code"},
    {"fieldname": "category_type", "fieldtype": "Select", "options": "Income\nExpense", "label": "Type", "reqd": 1},
    {"fieldname": "account", "fieldtype": "Link", "options": "Account", "label": "Linked Account", "reqd": 1},
    {"fieldname": "default_tax_template", "fieldtype": "Link", "options": "Item Tax Template", "label": "Default Tax Template"},
    {"fieldname": "color", "fieldtype": "Color", "label": "Color"},
    {"fieldname": "icon", "fieldtype": "Data", "label": "Icon"},
    {"fieldname": "is_active", "fieldtype": "Check", "label": "Active", "default": 1}
  ],
  "permissions": [
    {"role": "Accounts Manager", "read": 1, "write": 1, "create": 1},
    {"role": "System Manager", "read": 1, "write": 1, "create": 1}
  ]
}
```

**Future Enhancement (Phase 2+):**
```python
# Make Transaction Category an Accounting Dimension
# This enables dimension-based reporting across ERPNext
# Configuration in Accounting Dimensions settings
```

#### **Tracker Settings** (Configuration)
```json
{
  "doctype": "Tracker Settings",
  "issingle": 1,
  "fields": [
    {"fieldname": "auto_submit_documents", "fieldtype": "Check", "label": "Auto-Submit Created Documents"},
    {"fieldname": "cache_party_count", "fieldtype": "Int", "label": "Cached Parties Count", "default": 50},
    {"fieldname": "sync_interval", "fieldtype": "Select", "options": "Manual\nEvery 5 minutes\nEvery 15 minutes\nEvery hour", "label": "Auto-Sync Interval", "default": "Every 15 minutes"},
    {"fieldname": "default_payment_account", "fieldtype": "Link", "options": "Account", "label": "Default Payment Account"}
  ]
}
```

---

## 4. Offline-First Architecture

### 4.1 Offline Data Flow

```
┌─────────────────┐
│   User Input    │
│  (PWA Form)     │
└────────┬────────┘
         │
         ▼
    ┌─────────┐
    │ Online? │
    └────┬────┘
         │
    ┌────┴─────┐
    │          │
   NO         YES
    │          │
    ▼          ▼
┌─────────┐  ┌──────────────┐
│IndexedDB│  │ Direct Save  │
│ (Local) │  │  to ERPNext  │
└────┬────┘  └──────────────┘
     │
     │ (When connection restored)
     │
     ▼
┌─────────────────┐
│ Background Sync │
│   to ERPNext    │
└─────────────────┘
```

### 4.2 IndexedDB Schema

**Database Name:** `expense_income_tracker_db`

**Object Stores:**
1. **expenses** - Offline expense entries
2. **income** - Offline income entries
3. **cached_customers** - Customer data for offline access
4. **sync_queue** - Pending sync operations

### 4.3 Service Worker Strategy

**Cache Strategy:**
- **App Shell:** Cache First (HTML, CSS, JS)
- **API Calls:** Network First, fallback to cache
- **Images:** Cache First with expiration
- **Customer Data:** Stale While Revalidate

**Background Sync:**
- Register sync event on save
- Retry failed syncs with exponential backoff
- Show sync status in UI

---

## 5. Sync Engine Specifications

### 5.1 Expense Sync Logic

```python
@frappe.whitelist()
def sync_expense_to_erpnext(expense_entry_name):
    """Sync offline expense entry to ERPNext Expense Claim.

    Args:
        expense_entry_name (str): Name of Expense Entry document

    Returns:
        dict: Sync result with status and created document
    """
    try:
        # Get offline expense
        expense = frappe.get_doc("Expense Entry", expense_entry_name)

        # Create or update Expense Claim
        if not expense.expense_claim:
            # Create new Expense Claim
            expense_claim = frappe.get_doc({
                "doctype": "Expense Claim",
                "employee": frappe.session.user,
                "posting_date": expense.date,
                "expenses": [{
                    "expense_date": expense.date,
                    "expense_type": expense.category,
                    "amount": expense.amount,
                    "description": expense.description
                }]
            })

            # Attach receipt image
            if expense.receipt_image:
                expense_claim.append("attachments", {
                    "file_url": expense.receipt_image
                })

            expense_claim.insert()

            # Auto-submit if configured
            settings = frappe.get_single("Tracker Settings")
            if settings.auto_submit_expense_claims:
                expense_claim.submit()

            # Link back to offline entry
            expense.expense_claim = expense_claim.name

        # Mark as synced
        expense.synced = 1
        expense.sync_error = None
        expense.save()

        return {
            "status": "success",
            "expense_claim": expense.expense_claim
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="Expense Sync Failed")

        # Store error for user visibility
        expense.sync_error = str(e)
        expense.save()

        return {
            "status": "failed",
            "error": str(e)
        }
```

### 5.2 Income Sync Logic

```python
@frappe.whitelist()
def sync_income_to_erpnext(income_entry_name):
    """Sync offline income entry to ERPNext Sales Invoice or Journal Entry.

    Args:
        income_entry_name (str): Name of Income Entry document

    Returns:
        dict: Sync result with status and created document
    """
    try:
        income = frappe.get_doc("Income Entry", income_entry_name)

        # Determine if Sales Invoice or Journal Entry
        if income.customer:
            # Create Sales Invoice
            sales_invoice = frappe.get_doc({
                "doctype": "Sales Invoice",
                "customer": income.customer,
                "posting_date": income.date,
                "items": [{
                    "item_code": "Income Item",  # Generic income item
                    "qty": 1,
                    "rate": income.amount,
                    "income_account": income.income_account,
                    "description": income.description
                }]
            })

            if income.receipt_image:
                sales_invoice.append("attachments", {
                    "file_url": income.receipt_image
                })

            sales_invoice.insert()
            sales_invoice.submit()

            income.sales_invoice = sales_invoice.name
        else:
            # Create Journal Entry for non-customer income
            journal_entry = frappe.get_doc({
                "doctype": "Journal Entry",
                "posting_date": income.date,
                "accounts": [
                    {
                        "account": income.payment_method_account,  # Bank/Cash account
                        "debit_in_account_currency": income.amount
                    },
                    {
                        "account": income.income_account,
                        "credit_in_account_currency": income.amount
                    }
                ]
            })

            journal_entry.insert()
            journal_entry.submit()

            income.journal_entry = journal_entry.name

        # Mark as synced
        income.synced = 1
        income.sync_error = None
        income.save()

        return {
            "status": "success",
            "document": income.sales_invoice or income.journal_entry
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="Income Sync Failed")
        income.sync_error = str(e)
        income.save()

        return {
            "status": "failed",
            "error": str(e)
        }
```

### 5.3 Customer Caching

```python
@frappe.whitelist()
def get_cached_customers(limit=50):
    """Get frequently used customers for offline caching.

    Args:
        limit (int): Number of customers to return

    Returns:
        list: Customer data for offline use
    """
    # Get customers by transaction frequency
    customers = frappe.db.sql("""
        SELECT
            c.name,
            c.customer_name,
            c.mobile_no,
            c.email_id,
            COUNT(si.name) as transaction_count
        FROM `tabCustomer` c
        LEFT JOIN `tabSales Invoice` si ON si.customer = c.name
        WHERE c.disabled = 0
        GROUP BY c.name
        ORDER BY transaction_count DESC, c.modified DESC
        LIMIT %s
    """, (limit,), as_dict=True)

    return customers
```

---

## 6. User Interface Design

### 6.1 Design Reference

**Primary Inspiration:** Cashew Budget App (https://cashewapp.web.app)

**Design Principles:**
- Modern, clean, minimal interface
- Color-coded categories with icons
- Card-based transaction list
- Smooth animations and transitions
- Touch-optimized controls (44px+ targets)
- Bottom navigation for mobile
- Swipe gestures for quick actions

**Key UI Patterns to Replicate:**
- Transaction cards with category colors
- Floating action button for quick entry
- Dashboard with spending summary
- Category chips with icons and colors
- Modern form inputs with proper spacing
- Visual feedback for sync status
- Pull-to-refresh for sync

### 6.2 Main Dashboard (PWA Home)

**Layout (Cashew-inspired):**
```
┌─────────────────────────────┐
│  📊 Dashboard               │
│  [Sync: ● Online]    [⚙️]   │
├─────────────────────────────┤
│  💰 Balance Summary         │
│  ┌───────────────────────┐ │
│  │  This Month           │ │
│  │  Income:  $5,240      │ │
│  │  Expense: $3,120      │ │
│  │  Balance: $2,120      │ │
│  └───────────────────────┘ │
├─────────────────────────────┤
│  Recent Transactions        │
│  ┌─────────────────────┐   │
│  │ 🍔 Meals           │   │
│  │ Lunch at cafe      │   │
│  │ $12.50         ✅  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 🚗 Transport       │   │
│  │ Fuel               │   │
│  │ $45.00         ⏳  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ 💼 Client Payment  │   │
│  │ ABC Corp           │   │
│  │ +$500.00       ✅  │   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
         [➕] FAB
```

### 6.3 Transaction Entry Form (Modern)

**Features:**
- Type selector (Income/Expense/Transfer) as large buttons
- Category selection with visual grid (icons + colors)
- Large numpad for amount entry
- Party autocomplete with avatars
- Inline camera capture
- Quick save with haptic feedback

**Form Flow:**
```
Step 1: Select Type [Income] [Expense] [Transfer]
Step 2: Enter Amount (large numpad)
Step 3: Choose Category (visual grid)
Step 4: Add Details (party, description, photo)
Step 5: Save (auto-sync when online)
```

### 6.4 Sync Status Indicators

**Visual Feedback:**
```
● Green dot   = Online, all synced
⏳ Orange dot  = Syncing...
❌ Red dot     = Sync failed (tap to retry)
📴 Gray dot    = Offline mode
↻ Icon        = Manual sync available
```

### 6.5 Technical Implementation

**Reference Frappe Apps for UI Patterns:**
- Study `frappe/frappe` repo for native Frappe UI components
- Reference `frappe/erpnext` for form layouts and list views
- Use Frappe's built-in CSS framework (not custom CSS unless necessary)
- Leverage frappe.ui.Dialog, frappe.ui.form for consistency
- Follow Frappe's responsive breakpoints

**Color Scheme:**
- Follow ERPNext's primary color palette
- Category colors: User-defined per category
- Status colors: Green (success), Orange (pending), Red (error), Gray (offline)

**Fonts & Spacing:**
- Use Frappe's default font stack
- 16px minimum for body text (accessibility)
- 44px minimum touch targets
- 16-24px padding/margins for mobile

---

## 7. Security & Permissions

### 7.1 Authentication
- Uses Frappe session authentication
- Inherits ERPNext role permissions
- No separate login required

### 7.2 Role Permissions

| Role | Expense Entry | Income Entry | Sync Actions |
|------|--------------|--------------|--------------|
| **Employee** | Create, Read Own | No Access | Sync Own |
| **Sales User** | No Access | Create, Read Own | Sync Own |
| **Accounts User** | Read All | Read All | Sync All |
| **Expense Approver** | Read All | No Access | No Sync |
| **System Manager** | Full Access | Full Access | Full Access |

### 7.3 Data Validation
- Server-side validation for all synced data
- Permission checks before creating ERPNext documents
- Customer existence validation
- Account balance checks
- Duplicate entry prevention

---

## 8. Implementation Phases

### **Phase 1: Core Expense & Income Tracking** (Priority)
**Timeline:** 5-7 days

✅ **Deliverables:**
1. Create custom Frappe app (`expense_income_tracker`)
2. Implement DocTypes: Expense Entry, Income Entry, Tracker Settings
3. Build PWA dashboard page
4. Implement offline storage (IndexedDB)
5. Build sync engine (expenses → Expense Claim, income → Sales Invoice)
6. Customer caching mechanism
7. Receipt photo capture and upload
8. Sync status UI
9. Basic testing on mobile devices

**Acceptance Criteria:**
- [ ] Can add expenses offline, syncs when online
- [ ] Can add income with customer link, syncs to Sales Invoice
- [ ] App works as installed PWA on mobile
- [ ] Photos attach correctly to ERPNext documents
- [ ] Sync retries on failure with user notification

---

### **Phase 2: Budget Tracking** (Future)
**Timeline:** 3-4 days (deferred)

⏳ **Deliverables:**
1. Budget DocType with monthly limits by category
2. Budget vs actual dashboard
3. Alert notifications (80%, 100% thresholds)
4. Historical budget reports
5. Budget rollover logic

**Note:** Budget feature will be implemented after Phase 1 is stable and user-tested.

---

## 9. Testing Requirements

### 9.1 Functional Testing
- [ ] Expense entry works offline
- [ ] Income entry with customer link works offline
- [ ] Sync creates correct ERPNext documents
- [ ] Photos attach successfully
- [ ] Customer autocomplete works
- [ ] Sync retry on failure
- [ ] Duplicate prevention
- [ ] Permission enforcement

### 9.2 PWA Testing
- [ ] App installs as PWA on Android
- [ ] App installs as PWA on iOS
- [ ] Service worker registers correctly
- [ ] Offline mode activates when no connection
- [ ] Background sync triggers on reconnection
- [ ] Cache updates properly

### 9.3 Performance Testing
- [ ] IndexedDB handles 1000+ entries
- [ ] Customer cache loads in <2 seconds
- [ ] Sync completes in <5 seconds per entry
- [ ] Photo upload completes in <10 seconds
- [ ] UI remains responsive during sync

---

## 10. Success Metrics

### 10.1 Adoption Metrics
- **Target:** 80% of employees use PWA instead of manual entry
- **Measure:** Weekly active users vs total employees

### 10.2 Efficiency Metrics
- **Target:** Reduce expense entry time from 5 minutes to 30 seconds
- **Measure:** Time from expense occurrence to ERPNext entry

### 10.3 Data Quality Metrics
- **Target:** 95% of expenses have receipt photos
- **Measure:** Percentage of Expense Claims with attachments

### 10.4 Reliability Metrics
- **Target:** 99% sync success rate
- **Measure:** Successful syncs / total sync attempts

---

## 11. Future Enhancements (Post-Phase 2)

### 11.1 Advanced Features
- 📊 **Analytics Dashboard** - Spending trends, category breakdowns
- 🔔 **Smart Notifications** - Unusual spending alerts, missing receipts
- 🧾 **OCR Receipt Scanning** - Auto-extract amount, date, vendor from photos
- 🌍 **Multi-Currency Support** - Foreign expenses with auto-conversion
- 👥 **Team Expenses** - Shared team budgets and splitting
- 📱 **Native Mobile App** - Wrapper for iOS/Android app stores

### 11.2 Integration Enhancements
- 🔗 **Bank Feed Integration** - Auto-match expenses to bank transactions
- 💳 **Credit Card Import** - Direct import from card statements
- 📧 **Email Receipt Forwarding** - Email receipts → auto-create expense
- 🚗 **Mileage Tracking** - GPS-based distance logging

---

## 12. Technical Constraints & Considerations

### 12.1 Browser Compatibility
- **Supported:** Chrome 90+, Safari 14+, Edge 90+, Firefox 88+
- **IndexedDB:** Required, all modern browsers support
- **Service Workers:** HTTPS required (except localhost)

### 12.2 Storage Limits
- **IndexedDB:** ~50MB per domain (browser-dependent)
- **Photo Storage:** Compress images to <500KB each
- **Cache Strategy:** LRU eviction for old data

### 12.3 Sync Conflicts
- **Strategy:** Server always wins (last-write-wins)
- **Edge Case:** If ERPNext document modified before sync, alert user
- **Resolution:** Manual review required for conflicts

### 12.4 Network Requirements
- **Offline:** Full functionality except sync
- **Online:** Requires internet for initial load and sync
- **Bandwidth:** Low data usage (~50KB per sync)

---

## 13. Dependencies

### 13.1 ERPNext Setup
- ✅ ERPNext 15.x installed
- ✅ HRMS module installed (for Expense Claims)
- ✅ Expense Claim Types configured
- ✅ Employees linked to users
- ✅ Customers master data available
- ✅ Chart of Accounts configured

### 13.2 Frappe Bench Requirements
- ✅ Python 3.12+
- ✅ Node.js 24+
- ✅ HTTPS enabled (for PWA)
- ✅ Redis running
- ✅ Background workers active

### 13.3 Mobile Device Requirements
- 📱 Android 8+ or iOS 14+
- 📷 Camera permission for receipt photos
- 💾 Storage permission for offline data
- 🌐 Modern browser (Chrome/Safari)

---

## 14. Deployment Plan

### 14.1 Development Environment
```bash
# Create app
cd /home/riz/bench-15/apps
bench new-app expense_income_tracker

# Install on site
bench --site tk.dev install-app expense_income_tracker

# Enable developer mode
bench --site tk.dev set-config developer_mode 1

# Start bench
bench start
```

### 14.2 Production Deployment
```bash
# Build assets
bench build --app expense_income_tracker

# Migrate database
bench --site tk.dev migrate

# Clear cache
bench --site tk.dev clear-cache

# Restart
sudo supervisorctl restart all
```

### 14.3 PWA Installation
1. Open `https://tk.dev/tracker` on mobile browser
2. Tap browser menu → "Add to Home Screen"
3. App icon appears on home screen
4. Launch app → full-screen experience

---

## 15. Support & Maintenance

### 15.1 Documentation
- User guide for mobile app usage
- Admin guide for configuration
- API documentation for sync endpoints
- Troubleshooting guide

### 15.2 Monitoring
- Error logs in ERPNext Error Log
- Sync failure alerts
- Storage usage monitoring
- Performance metrics

### 15.3 Backup Strategy
- ERPNext database backups (daily)
- Client-side data syncs to server (no local-only data)
- Photo backups to ERPNext files

---

## 16. Questions & Decisions

### 16.1 Open Questions
- ❓ Support multiple currencies? → **Phase 1: Single currency, Phase 2: Multi-currency**
- ❓ Allow editing synced entries? → **No, create correction entry instead**
- ❓ Should categories be hierarchical? → **Phase 1: Flat, Phase 2: Consider hierarchy**

### 16.2 Design Decisions (Confirmed by Riz - 2026-02-06)

**Architecture Decisions:**
- ✅ **Custom app, NOT standard ERPNext Expense Claim** - Full control over functionality
- ✅ **Single DocType "Financial Transaction" with Type field** - Smart logic creates appropriate ERPNext documents based on type and party
- ✅ **Category-based account mapping** - No default accounts in settings; accounts linked at Category level
- ✅ **Transaction Category as future Accounting Dimension** - Note for Phase 2+ implementation
- ✅ **Smart document creation:**
  - Income + Customer → Sales Invoice
  - Income (no customer) → Journal Entry
  - Expense + Supplier → Purchase Invoice
  - Expense (no supplier) → Journal Entry
  - Transfer/Correction → Journal Entry

**Technical Decisions:**
- ✅ Use Frappe native PWA (not React/Vue separate app)
- ✅ IndexedDB for offline storage (not localStorage)
- ✅ Background Sync API (not polling)
- ✅ Photo compression before upload (save bandwidth)
- ✅ Party caching (Customer/Supplier) based on transaction frequency
- ✅ **Reference Frappe's own apps for implementation patterns** - Study frappe/frappe and frappe/erpnext repos
- ✅ Follow Frappe Framework best practices and conventions

**UI/UX Decisions:**
- ✅ **Design inspiration: Cashew Budget App (https://cashewapp.web.app)** - Modern, clean, card-based interface
- ✅ Color-coded categories with icons
- ✅ Touch-optimized mobile-first design
- ✅ Use Frappe's native UI components where possible

---

## 17. Appendix

### 17.1 Glossary
- **PWA:** Progressive Web App - web app that works offline and installs like native app
- **IndexedDB:** Browser database for offline storage
- **Service Worker:** Background script that enables offline functionality
- **Background Sync:** API that retries operations when connection restored
- **Expense Claim:** ERPNext document for employee expense reimbursement
- **Sales Invoice:** ERPNext document for customer billing

### 17.2 References
- [Frappe PWA Documentation](https://frappeframework.com/docs/user/en/guides/pwa)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [ERPNext Expense Claim](https://docs.erpnext.com/docs/user/manual/en/human-resources/expense-claim)

---

**Document Status:** ✅ Ready for Implementation
**Next Steps:** Review with stakeholder (Riz) → Begin Phase 1 implementation

---

_End of Document_

# Finance Tracker PWA - Technical Specification Document
**Version:** 1.0
**Date:** 2026-02-07
**Status:** Ready for Implementation
**Estimated Effort:** 7-10 days
**Target Site:** bt.dev
**App:** finance_tracker

---

## 📋 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [PWA Infrastructure (pwa_frappe Integration)](#3-pwa-infrastructure-pwa_frappe-integration)
4. [IndexedDB Schema](#4-indexeddb-schema)
5. [Background Sync Engine](#5-background-sync-engine)
6. [Mobile UI Specifications](#6-mobile-ui-specifications)
7. [API Endpoints](#7-api-endpoints)
8. [Component Specifications](#8-component-specifications)
9. [Implementation Phases](#9-implementation-phases)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Plan](#11-deployment-plan)
12. [Security Considerations](#12-security-considerations)
13. [Performance Targets](#13-performance-targets)
14. [Google Play Distribution](#14-google-play-distribution)

---

## 1. Executive Summary

### 1.1 Project Goal
Transform finance_tracker from a desktop web app into a **fully offline-capable Progressive Web App** with a modern mobile-first interface, enabling users to:
- Record transactions offline on mobile devices
- Automatically sync to ERPNext when online
- Install as native-like app on Android/iOS
- Distribute via Google Play Store (optional)

### 1.2 Technical Approach
**Foundation:** Leverage `pwa_frappe` for PWA infrastructure (service workers, manifest, static caching)
**Build On Top:** IndexedDB storage, background sync, mobile UI, transaction queue management
**Result:** Offline-first expense tracker with automatic ERPNext integration

### 1.3 Key Decisions
- ✅ Use pwa_frappe for PWA boilerplate (saves 3-4 days)
- ✅ Keep existing `sync_engine.py` functions (activate for PWA)
- ✅ Cashew-inspired mobile UI design
- ✅ Background Sync API for queue management
- ✅ IndexedDB for offline transaction storage
- ✅ TWA wrapper for Google Play distribution

---

## 2. Architecture Overview

### 2.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│              (Mobile-Optimized PWA UI)                   │
│   • Card-based transaction list                         │
│   • FAB for quick entry                                 │
│   • Touch-optimized forms                               │
│   • Sync status indicators                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│              Application Logic Layer                     │
│   • offline_manager.js - IndexedDB CRUD                 │
│   • sync_manager.js - Queue & sync logic                │
│   • transaction_form.js - Form handling                 │
│   • cache_manager.js - Party/category cache             │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  IndexedDB   │        │ Service      │
│  (Offline)   │        │ Worker       │
│              │        │ (pwa_frappe) │
└──────┬───────┘        └──────┬───────┘
       │                       │
       │   ┌───────────────────┘
       │   │
       ▼   ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API Layer                           │
│   • sync_engine.py - Transaction sync                   │
│   • api.py - Party/category caching                     │
│   • financial_transaction.py - ERPNext integration      │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                    ERPNext Core                          │
│   • Sales Invoice                                       │
│   • Purchase Invoice                                    │
│   • Journal Entry                                       │
│   • General Ledger                                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### **Offline Transaction Creation:**
```
User fills form → Save to IndexedDB → Register background sync event →
Display as "Pending Sync" → When online → Background sync triggers →
Call sync_engine.py → Create ERPNext document → Update IndexedDB status
```

#### **Online Transaction Creation:**
```
User fills form → Save to IndexedDB → Immediately trigger sync →
Call sync_engine.py → Create ERPNext document → Mark as "Synced"
```

### 2.3 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **PWA Infrastructure** | pwa_frappe | Service worker, manifest, install prompts |
| **Offline Storage** | IndexedDB | Transaction queue, cached parties/categories |
| **Background Sync** | Background Sync API | Queue management, retry logic |
| **Mobile UI** | Frappe UI + Custom CSS | Touch-optimized interface |
| **Service Worker** | Auto-generated (pwa_frappe) | Static asset caching |
| **Photo Compression** | Canvas API | Client-side image resize |
| **Sync Engine** | Python (sync_engine.py) | ERPNext integration |
| **API Layer** | Frappe @frappe.whitelist() | Server endpoints |

---

## 3. PWA Infrastructure (pwa_frappe Integration)

### 3.1 What pwa_frappe Provides

✅ **Service Worker** (`/sw.js`)
- Cache-first strategy for static assets
- Stale-while-revalidate pattern
- Auto-versioning and cleanup

✅ **Manifest** (`/manifest.json`)
- Dynamic generation from DocType
- All PWA manifest fields supported

✅ **Install Prompts**
- "Add to Home Screen" flow
- Custom install page (`/install`)

### 3.2 Configuration Steps

#### **Step 1: Configure Web App Manifest DocType**
```
Navigate to: Web App Manifest (Single)

Fill fields:
- app_name: "Finance Tracker"
- short_name: "FinTrack"
- description: "Offline-first expense and income tracker"
- theme_color: "#4CAF50"
- background_color: "#ffffff"
- display: "standalone"
- orientation: "portrait"
- start_url: "/tracker"
- scope: "/tracker"

Add Icons (Child Table):
1. Icon 1:
   - src: /assets/finance_tracker/images/icon-192.png
   - sizes: 192x192
   - type: image/png

2. Icon 2:
   - src: /assets/finance_tracker/images/icon-512.png
   - sizes: 512x512
   - type: image/png

Save → Click "Automatically configure PWA"
```

#### **Step 2: Update finance_tracker hooks.py**
```python
# finance_tracker/hooks.py

# Include pwa_frappe client scripts
web_include_js = [
    "/assets/pwa_frappe/js/pwa.js",
    "/assets/finance_tracker/js/offline_manager.js",
    "/assets/finance_tracker/js/sync_manager.js"
]

web_include_css = [
    "/assets/finance_tracker/css/pwa_mobile.css"
]
```

#### **Step 3: Create PWA Icons**
```bash
# Create icons directory
mkdir -p apps/finance_tracker/finance_tracker/public/images

# Add icons (192x192 and 512x512 PNG)
# Use logo or create simple icon with app initial
```

### 3.3 Service Worker Caching Strategy

**pwa_frappe handles automatically:**
- Static assets (CSS, JS, images)
- Frappe core resources
- finance_tracker assets from hooks

**We don't need to modify service worker** - it's auto-generated and sufficient for our needs.

---

## 4. IndexedDB Schema

### 4.1 Database Design

**Database Name:** `finance_tracker_db`
**Version:** 1

### 4.2 Object Stores

#### **Store 1: transactions**
**Purpose:** Offline transaction queue

```javascript
{
    keyPath: "id", // Auto-increment ID
    indexes: [
        { name: "sync_status", keyPath: "sync_status" },
        { name: "date", keyPath: "date" },
        { name: "created_at", keyPath: "created_at" }
    ]
}
```

**Schema:**
```javascript
{
    id: "auto-increment",                    // Local ID
    transaction_type: "Income/Expense/Transfer",
    date: "2026-02-07T10:30:00",
    category: "Category Name",
    category_id: "TC-00001",                 // For sync
    amount: 100.00,
    customer: "Customer Name",               // Optional
    customer_id: "CUST-00001",              // Optional
    supplier: "Supplier Name",               // Optional
    supplier_id: "SUPP-00001",              // Optional
    payment_account: "Main Bank",
    payment_account_id: "ACC-00001",
    tax_amount: 15.00,
    description: "Transaction notes",
    receipt_image_blob: Blob,                // Photo as blob
    receipt_image_name: "receipt.jpg",
    tags: "business,travel",

    // Sync fields
    sync_status: "pending/syncing/synced/failed",
    sync_error: null,                        // Error message if failed
    retry_count: 0,
    reference_doctype: null,                 // After sync: "Sales Invoice"
    reference_name: null,                    // After sync: "SI-00001"
    created_at: "2026-02-07T10:30:00",
    synced_at: null
}
```

---

#### **Store 2: cached_parties**
**Purpose:** Offline customer/supplier data

```javascript
{
    keyPath: "id",
    indexes: [
        { name: "party_type", keyPath: "party_type" },
        { name: "transaction_count", keyPath: "transaction_count" }
    ]
}
```

**Schema:**
```javascript
{
    id: "CUST-00001",                        // ERPNext ID
    party_type: "Customer",                  // or "Supplier"
    party_name: "ABC Corporation",
    mobile_no: "+1234567890",
    email_id: "contact@abc.com",
    image: "/files/customer_image.jpg",
    transaction_count: 25,                   // Sort by frequency
    cached_at: "2026-02-07T10:00:00"
}
```

---

#### **Store 3: cached_categories**
**Purpose:** Offline transaction categories

```javascript
{
    keyPath: "id",
    indexes: [
        { name: "category_type", keyPath: "category_type" },
        { name: "is_active", keyPath: "is_active" }
    ]
}
```

**Schema:**
```javascript
{
    id: "TC-00001",                          // ERPNext ID
    category_name: "Meals & Entertainment",
    category_code: "MEALS_ENTE",
    category_type: "Expense",                // Income/Expense/Transfer
    account: "5110 - Meals Expense",
    account_id: "ACC-00001",
    item: "Meal Expense Item",               // Optional
    item_id: "ITEM-00001",                   // Optional
    color: "#FF5722",
    icon: "restaurant",
    is_active: 1,
    cached_at: "2026-02-07T10:00:00"
}
```

---

#### **Store 4: app_settings**
**Purpose:** App configuration and metadata

```javascript
{
    keyPath: "key"
}
```

**Schema:**
```javascript
{
    key: "last_sync_timestamp",
    value: "2026-02-07T10:30:00"
},
{
    key: "default_payment_account",
    value: "Main Bank"
},
{
    key: "user_preferences",
    value: {
        theme: "light",
        show_amounts: true
    }
}
```

---

### 4.3 IndexedDB Manager Class

**File:** `finance_tracker/public/js/offline_manager.js`

```javascript
class OfflineManager {
    constructor() {
        this.dbName = 'finance_tracker_db';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    transactionStore.createIndex('sync_status', 'sync_status', { unique: false });
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('created_at', 'created_at', { unique: false });
                }

                if (!db.objectStoreNames.contains('cached_parties')) {
                    const partyStore = db.createObjectStore('cached_parties', { keyPath: 'id' });
                    partyStore.createIndex('party_type', 'party_type', { unique: false });
                    partyStore.createIndex('transaction_count', 'transaction_count', { unique: false });
                }

                if (!db.objectStoreNames.contains('cached_categories')) {
                    const categoryStore = db.createObjectStore('cached_categories', { keyPath: 'id' });
                    categoryStore.createIndex('category_type', 'category_type', { unique: false });
                    categoryStore.createIndex('is_active', 'is_active', { unique: false });
                }

                if (!db.objectStoreNames.contains('app_settings')) {
                    db.createObjectStore('app_settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Save transaction offline
     */
    async saveTransaction(transaction) {
        transaction.sync_status = 'pending';
        transaction.created_at = new Date().toISOString();
        transaction.retry_count = 0;

        const tx = this.db.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        const request = store.add(transaction);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const id = request.result;
                console.log('[OfflineManager] Transaction saved:', id);
                resolve(id);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get pending transactions
     */
    async getPendingTransactions() {
        const tx = this.db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('sync_status');
        const request = index.getAll('pending');

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update transaction status
     */
    async updateTransactionStatus(id, status, data = {}) {
        const tx = this.db.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        const getRequest = store.get(id);

        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;
                transaction.sync_status = status;

                if (status === 'synced') {
                    transaction.synced_at = new Date().toISOString();
                    transaction.reference_doctype = data.reference_doctype;
                    transaction.reference_name = data.reference_name;
                    transaction.sync_error = null;
                } else if (status === 'failed') {
                    transaction.sync_error = data.error;
                    transaction.retry_count = (transaction.retry_count || 0) + 1;
                }

                const putRequest = store.put(transaction);
                putRequest.onsuccess = () => resolve(transaction);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Cache parties for offline use
     */
    async cacheParties(parties) {
        const tx = this.db.transaction(['cached_parties'], 'readwrite');
        const store = tx.objectStore('cached_parties');

        // Clear old cache
        await store.clear();

        // Add new cache
        for (const party of parties) {
            party.cached_at = new Date().toISOString();
            await store.add(party);
        }

        console.log('[OfflineManager] Cached', parties.length, 'parties');
    }

    /**
     * Get cached parties by type
     */
    async getCachedParties(partyType) {
        const tx = this.db.transaction(['cached_parties'], 'readonly');
        const store = tx.objectStore('cached_parties');
        const index = store.index('party_type');
        const request = index.getAll(partyType);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Cache categories
     */
    async cacheCategories(categories) {
        const tx = this.db.transaction(['cached_categories'], 'readwrite');
        const store = tx.objectStore('cached_categories');

        await store.clear();

        for (const category of categories) {
            category.cached_at = new Date().toISOString();
            await store.add(category);
        }

        console.log('[OfflineManager] Cached', categories.length, 'categories');
    }

    /**
     * Get cached categories by type
     */
    async getCachedCategories(categoryType = null) {
        const tx = this.db.transaction(['cached_categories'], 'readonly');
        const store = tx.objectStore('cached_categories');

        if (categoryType) {
            const index = store.index('category_type');
            const request = index.getAll(categoryType);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else {
            const request = store.getAll();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Get all transactions (for display)
     */
    async getAllTransactions(limit = 50) {
        const tx = this.db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('created_at');
        const request = index.openCursor(null, 'prev'); // Newest first

        return new Promise((resolve, reject) => {
            const transactions = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    transactions.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(transactions);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
window.offlineManager = new OfflineManager();
```

---

## 5. Background Sync Engine

### 5.1 Sync Manager Class

**File:** `finance_tracker/public/js/sync_manager.js`

```javascript
class SyncManager {
    constructor(offlineManager) {
        this.offlineManager = offlineManager;
        this.isSyncing = false;
        this.syncInProgress = new Set();
    }

    /**
     * Register background sync
     */
    async registerSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            const registration = await navigator.serviceWorker.ready;
            try {
                await registration.sync.register('sync-transactions');
                console.log('[SyncManager] Background sync registered');
            } catch (error) {
                console.error('[SyncManager] Sync registration failed:', error);
                // Fallback: Manual sync
                this.syncAll();
            }
        } else {
            console.log('[SyncManager] Background Sync not supported, using manual sync');
            this.syncAll();
        }
    }

    /**
     * Sync all pending transactions
     */
    async syncAll() {
        if (this.isSyncing) {
            console.log('[SyncManager] Sync already in progress');
            return;
        }

        if (!navigator.onLine) {
            console.log('[SyncManager] Offline, skipping sync');
            return;
        }

        this.isSyncing = true;
        console.log('[SyncManager] Starting sync...');

        try {
            const pending = await this.offlineManager.getPendingTransactions();
            console.log('[SyncManager] Found', pending.length, 'pending transactions');

            for (const transaction of pending) {
                if (this.syncInProgress.has(transaction.id)) {
                    continue; // Already syncing
                }

                await this.syncTransaction(transaction);
            }

            console.log('[SyncManager] Sync completed');
        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync single transaction
     */
    async syncTransaction(transaction) {
        this.syncInProgress.add(transaction.id);

        try {
            console.log('[SyncManager] Syncing transaction:', transaction.id);

            // Update status to syncing
            await this.offlineManager.updateTransactionStatus(transaction.id, 'syncing');

            // Upload photo first if exists
            let receipt_image_url = null;
            if (transaction.receipt_image_blob) {
                receipt_image_url = await this.uploadPhoto(
                    transaction.receipt_image_blob,
                    transaction.receipt_image_name
                );
            }

            // Prepare data for sync
            const syncData = {
                transaction_type: transaction.transaction_type,
                date: transaction.date,
                category: transaction.category_id,
                amount: transaction.amount,
                customer: transaction.customer_id || null,
                supplier: transaction.supplier_id || null,
                payment_account: transaction.payment_account_id,
                tax_amount: transaction.tax_amount || 0,
                description: transaction.description || '',
                receipt_image: receipt_image_url,
                tags: transaction.tags || ''
            };

            // Call server sync endpoint
            const result = await frappe.call({
                method: 'finance_tracker.sync_engine.sync_transaction_to_erpnext',
                args: { transaction_data: syncData },
                freeze: false
            });

            if (result.message && result.message.status === 'success') {
                // Mark as synced
                await this.offlineManager.updateTransactionStatus(transaction.id, 'synced', {
                    reference_doctype: result.message.reference_doctype,
                    reference_name: result.message.reference_name
                });

                console.log('[SyncManager] Transaction synced:', transaction.id, '→', result.message.reference_name);

                // Show success notification
                this.showSyncNotification('success', `Synced: ${result.message.reference_name}`);
            } else {
                throw new Error(result.message?.error || 'Sync failed');
            }
        } catch (error) {
            console.error('[SyncManager] Transaction sync failed:', error);

            // Mark as failed
            await this.offlineManager.updateTransactionStatus(transaction.id, 'failed', {
                error: error.message
            });

            // Retry logic (exponential backoff)
            if (transaction.retry_count < 3) {
                const delay = Math.pow(2, transaction.retry_count) * 1000; // 1s, 2s, 4s
                console.log(`[SyncManager] Will retry in ${delay}ms`);
                setTimeout(() => {
                    this.syncTransaction(transaction);
                }, delay);
            } else {
                console.error('[SyncManager] Max retries exceeded for transaction:', transaction.id);
                this.showSyncNotification('error', `Sync failed: ${error.message}`);
            }
        } finally {
            this.syncInProgress.delete(transaction.id);
        }
    }

    /**
     * Upload photo to ERPNext
     */
    async uploadPhoto(blob, filename) {
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('is_private', 0);
        formData.append('folder', 'Home/Attachments');

        const response = await fetch('/api/method/upload_file', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': frappe.csrf_token
            }
        });

        if (!response.ok) {
            throw new Error('Photo upload failed');
        }

        const data = await response.json();
        return data.message.file_url;
    }

    /**
     * Show sync notification
     */
    showSyncNotification(type, message) {
        frappe.show_alert({
            message: message,
            indicator: type === 'success' ? 'green' : 'red'
        }, 3);
    }

    /**
     * Start periodic sync (every 5 minutes when online)
     */
    startPeriodicSync() {
        setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                this.syncAll();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
}

// Initialize when online
window.addEventListener('online', () => {
    console.log('[SyncManager] Online, triggering sync');
    if (window.syncManager) {
        window.syncManager.syncAll();
    }
});

// Global instance
window.syncManager = new SyncManager(window.offlineManager);
```

---

### 5.2 Service Worker Background Sync Handler

**File:** `finance_tracker/public/js/sw_sync_handler.js`

This will be injected into the service worker by extending pwa_frappe's sw.js:

```javascript
// Listen for background sync event
self.addEventListener('sync', function(event) {
    console.log('[SW] Sync event:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncTransactions());
    }
});

async function syncTransactions() {
    console.log('[SW] Background sync: syncing transactions...');

    // Open IndexedDB
    const db = await openDatabase();
    const pending = await getPendingTransactions(db);

    console.log('[SW] Found', pending.length, 'pending transactions');

    for (const transaction of pending) {
        try {
            await syncTransaction(transaction);
        } catch (error) {
            console.error('[SW] Sync failed for transaction:', transaction.id, error);
        }
    }
}

// Helper functions for SW context
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('finance_tracker_db', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getPendingTransactions(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('sync_status');
        const request = index.getAll('pending');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function syncTransaction(transaction) {
    // Call sync API endpoint
    const response = await fetch('/api/method/finance_tracker.sync_engine.sync_transaction_to_erpnext', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': '<token>' // Need to handle CSRF in SW
        },
        body: JSON.stringify({
            transaction_data: transaction
        })
    });

    if (!response.ok) {
        throw new Error('Sync failed');
    }

    return await response.json();
}
```

**Note:** Service worker CSRF token handling needs special consideration. Alternative: Use postMessage to main thread for sync.

---

### 5.3 Server-Side Sync Engine Updates

**File:** `finance_tracker/finance_tracker/sync_engine.py`

Update existing sync functions to handle PWA transactions:

```python
@frappe.whitelist()
def sync_transaction_to_erpnext(transaction_data):
    """Sync offline transaction to ERPNext.

    Args:
        transaction_data (dict): Transaction data from IndexedDB

    Returns:
        dict: Sync result with status and created document
    """
    try:
        # Parse transaction data
        transaction_type = transaction_data.get('transaction_type')
        date = transaction_data.get('date')
        category_id = transaction_data.get('category')
        amount = flt(transaction_data.get('amount'))
        customer_id = transaction_data.get('customer')
        supplier_id = transaction_data.get('supplier')
        payment_account_id = transaction_data.get('payment_account')
        tax_amount = flt(transaction_data.get('tax_amount', 0))
        description = transaction_data.get('description', '')
        receipt_image = transaction_data.get('receipt_image')
        tags = transaction_data.get('tags', '')

        # Get category details
        category = frappe.get_doc("Transaction Category", category_id)
        category_account = category.account

        # Route to appropriate document type
        if transaction_type == "Income" and customer_id:
            doc = create_sales_invoice_from_sync(
                customer=customer_id,
                amount=amount,
                income_account=category_account,
                item=category.item or None,
                date=date,
                description=description,
                tax_amount=tax_amount,
                receipt_image=receipt_image
            )
        elif transaction_type == "Expense" and supplier_id:
            doc = create_purchase_invoice_from_sync(
                supplier=supplier_id,
                amount=amount,
                expense_account=category_account,
                item=category.item or None,
                date=date,
                description=description,
                tax_amount=tax_amount,
                receipt_image=receipt_image
            )
        else:
            doc = create_journal_entry_from_sync(
                transaction_type=transaction_type,
                amount=amount,
                category_account=category_account,
                payment_account=payment_account_id,
                date=date,
                description=description
            )

        # Submit document
        doc.insert()
        doc.submit()

        return {
            "status": "success",
            "reference_doctype": doc.doctype,
            "reference_name": doc.name
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="Transaction Sync Failed")
        return {
            "status": "failed",
            "error": str(e)
        }


def create_sales_invoice_from_sync(customer, amount, income_account, item, date, description, tax_amount, receipt_image):
    """Create Sales Invoice from synced transaction."""
    # Get or create generic income item if no category item
    if not item:
        item = get_or_create_generic_item("Income Item", "Service")

    si = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": customer,
        "posting_date": getdate(date),
        "posting_time": get_time(date),
        "items": [{
            "item_code": item,
            "qty": 1,
            "rate": amount,
            "income_account": income_account,
            "description": description
        }]
    })

    # Add tax if provided
    if tax_amount > 0:
        si.append("taxes", {
            "charge_type": "Actual",
            "account_head": "VAT - Company",  # TODO: Make configurable
            "description": "Tax",
            "tax_amount": tax_amount
        })

    # Attach receipt image
    if receipt_image:
        si.append("attachments", {
            "file_url": receipt_image
        })

    return si


def create_purchase_invoice_from_sync(supplier, amount, expense_account, item, date, description, tax_amount, receipt_image):
    """Create Purchase Invoice from synced transaction."""
    # Get or create generic expense item if no category item
    if not item:
        item = get_or_create_generic_item("Expense Item", "Service")

    pi = frappe.get_doc({
        "doctype": "Purchase Invoice",
        "supplier": supplier,
        "posting_date": getdate(date),
        "posting_time": get_time(date),
        "items": [{
            "item_code": item,
            "qty": 1,
            "rate": amount,
            "expense_account": expense_account,
            "description": description
        }]
    })

    # Add tax if provided
    if tax_amount > 0:
        pi.append("taxes", {
            "charge_type": "Actual",
            "account_head": "VAT - Company",  # TODO: Make configurable
            "description": "Tax",
            "tax_amount": tax_amount
        })

    # Attach receipt image
    if receipt_image:
        pi.append("attachments", {
            "file_url": receipt_image
        })

    return pi


def create_journal_entry_from_sync(transaction_type, amount, category_account, payment_account, date, description):
    """Create Journal Entry from synced transaction."""
    voucher_type = get_voucher_type(transaction_type)

    je = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": voucher_type,
        "posting_date": getdate(date),
        "user_remark": description,
        "accounts": []
    })

    # Determine debit/credit based on transaction type
    if transaction_type == "Income":
        # Dr: Payment Account, Cr: Income Account
        je.append("accounts", {
            "account": payment_account,
            "debit_in_account_currency": amount
        })
        je.append("accounts", {
            "account": category_account,
            "credit_in_account_currency": amount
        })
    elif transaction_type == "Expense":
        # Dr: Expense Account, Cr: Payment Account
        je.append("accounts", {
            "account": category_account,
            "debit_in_account_currency": amount
        })
        je.append("accounts", {
            "account": payment_account,
            "credit_in_account_currency": amount
        })
    elif transaction_type == "Transfer":
        # Dr: TO Account (category_account), Cr: FROM Account (payment_account)
        je.append("accounts", {
            "account": category_account,  # TO
            "debit_in_account_currency": amount
        })
        je.append("accounts", {
            "account": payment_account,  # FROM
            "credit_in_account_currency": amount
        })

    return je
```

---

## 6. Mobile UI Specifications

### 6.1 Design Reference: Cashew Budget App

**Inspiration:** https://cashewapp.web.app

**Key Design Principles:**
- Clean, minimal, modern
- Card-based transaction list
- Color-coded categories
- Touch-optimized (44px+ targets)
- Smooth animations
- Visual sync feedback

### 6.2 PWA Pages Structure

```
finance_tracker/www/tracker/
├── index.html              # Main PWA page
├── index.py                # Context provider
├── transaction_form.html   # Transaction entry modal
└── assets/
    ├── tracker.js          # PWA UI logic
    ├── tracker.css         # Mobile-optimized styles
    └── images/
        ├── icon-192.png
        └── icon-512.png
```

### 6.3 Main Dashboard UI

**File:** `finance_tracker/www/tracker/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#4CAF50">
    <title>Finance Tracker</title>

    <!-- Frappe assets -->
    <link rel="stylesheet" href="/assets/css/frappe-web.css">
    <link rel="stylesheet" href="/assets/finance_tracker/css/pwa_mobile.css">

    <!-- PWA manifest -->
    <link rel="manifest" href="/manifest.json">

    <style>
        /* Critical CSS - inline for fast load */
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            overscroll-behavior: none;
        }

        .tracker-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
            padding-bottom: 80px; /* Space for FAB */
        }

        .header {
            background: #4CAF50;
            color: white;
            padding: 20px 16px;
            margin: -16px -16px 16px -16px;
            position: sticky;
            top: 0;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 500;
        }

        .sync-status {
            font-size: 12px;
            opacity: 0.9;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sync-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }

        .sync-indicator.online { background: #8BC34A; }
        .sync-indicator.syncing { background: #FF9800; animation: pulse 1s infinite; }
        .sync-indicator.offline { background: #9E9E9E; }
        .sync-indicator.error { background: #F44336; }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .summary-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .summary-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 12px;
        }

        .summary-amounts {
            display: flex;
            justify-content: space-between;
            gap: 16px;
        }

        .amount-item {
            flex: 1;
        }

        .amount-label {
            font-size: 12px;
            color: #999;
            margin-bottom: 4px;
        }

        .amount-value {
            font-size: 24px;
            font-weight: 600;
        }

        .amount-value.income { color: #4CAF50; }
        .amount-value.expense { color: #F44336; }

        .transaction-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .transaction-card {
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 12px;
            position: relative;
            border-left: 4px solid #ddd;
        }

        .transaction-card.income { border-left-color: #4CAF50; }
        .transaction-card.expense { border-left-color: #F44336; }
        .transaction-card.transfer { border-left-color: #2196F3; }

        .transaction-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        .transaction-details {
            flex: 1;
            min-width: 0;
        }

        .transaction-category {
            font-weight: 500;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .transaction-description {
            font-size: 13px;
            color: #666;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .transaction-amount {
            font-size: 18px;
            font-weight: 600;
            white-space: nowrap;
        }

        .transaction-amount.income { color: #4CAF50; }
        .transaction-amount.expense { color: #F44336; }

        .transaction-status {
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            background: #f5f5f5;
            color: #666;
        }

        .transaction-status.synced { background: #E8F5E9; color: #4CAF50; }
        .transaction-status.pending { background: #FFF3E0; color: #FF9800; }
        .transaction-status.failed { background: #FFEBEE; color: #F44336; }

        .fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #4CAF50;
            color: white;
            border: none;
            font-size: 24px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .fab:active {
            transform: scale(0.95);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #999;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .empty-state-icon {
            font-size: 64px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="tracker-container">
        <!-- Header -->
        <div class="header">
            <h1>Finance Tracker</h1>
            <div class="sync-status">
                <span class="sync-indicator online" id="syncIndicator"></span>
                <span id="syncStatusText">All synced</span>
            </div>
        </div>

        <!-- Summary Card -->
        <div class="summary-card">
            <div class="summary-title">This Month</div>
            <div class="summary-amounts">
                <div class="amount-item">
                    <div class="amount-label">Income</div>
                    <div class="amount-value income" id="totalIncome">$0</div>
                </div>
                <div class="amount-item">
                    <div class="amount-label">Expense</div>
                    <div class="amount-value expense" id="totalExpense">$0</div>
                </div>
                <div class="amount-item">
                    <div class="amount-label">Balance</div>
                    <div class="amount-value" id="netBalance">$0</div>
                </div>
            </div>
        </div>

        <!-- Transaction List -->
        <div class="transaction-list" id="transactionList">
            <div class="loading" id="loadingState">Loading transactions...</div>
        </div>
    </div>

    <!-- FAB -->
    <button class="fab" id="addTransactionBtn" aria-label="Add Transaction">
        +
    </button>

    <!-- Scripts -->
    <script src="/assets/frappe/js/lib/jquery/jquery.min.js"></script>
    <script src="/assets/js/frappe-web.min.js"></script>
    <script src="/assets/pwa_frappe/js/pwa.js"></script>
    <script src="/assets/finance_tracker/js/offline_manager.js"></script>
    <script src="/assets/finance_tracker/js/sync_manager.js"></script>
    <script src="/assets/finance_tracker/js/tracker_ui.js"></script>
</body>
</html>
```

---

### 6.4 Tracker UI Logic

**File:** `finance_tracker/public/js/tracker_ui.js`

```javascript
class TrackerUI {
    constructor() {
        this.offlineManager = window.offlineManager;
        this.syncManager = window.syncManager;
        this.transactions = [];
    }

    async init() {
        // Initialize IndexedDB
        await this.offlineManager.init();

        // Cache parties and categories on load
        await this.cacheData();

        // Load transactions
        await this.loadTransactions();

        // Update sync status
        this.updateSyncStatus();

        // Set up event listeners
        this.setupEventListeners();

        // Start periodic sync
        this.syncManager.startPeriodicSync();

        console.log('[TrackerUI] Initialized');
    }

    async cacheData() {
        try {
            // Cache parties
            const parties = await frappe.call({
                method: 'finance_tracker.api.get_cached_parties',
                args: { limit: 50 }
            });

            if (parties.message) {
                await this.offlineManager.cacheParties(parties.message);
            }

            // Cache categories
            const categories = await frappe.call({
                method: 'finance_tracker.api.get_transaction_categories'
            });

            if (categories.message) {
                await this.offlineManager.cacheCategories(categories.message);
            }

            console.log('[TrackerUI] Data cached successfully');
        } catch (error) {
            console.error('[TrackerUI] Caching failed:', error);
            // Continue anyway - offline mode will use existing cache
        }
    }

    async loadTransactions() {
        try {
            this.transactions = await this.offlineManager.getAllTransactions(50);
            this.renderTransactions();
            this.updateSummary();
        } catch (error) {
            console.error('[TrackerUI] Failed to load transactions:', error);
            $('#loadingState').html('Failed to load transactions');
        }
    }

    renderTransactions() {
        const $list = $('#transactionList');
        $list.empty();

        if (this.transactions.length === 0) {
            $list.html(`
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>No transactions yet</div>
                    <div style="font-size: 14px; margin-top: 8px;">Tap + to add your first transaction</div>
                </div>
            `);
            return;
        }

        this.transactions.forEach(txn => {
            const $card = this.createTransactionCard(txn);
            $list.append($card);
        });
    }

    createTransactionCard(txn) {
        const type = txn.transaction_type.toLowerCase();
        const icon = this.getTransactionIcon(txn.category || txn.transaction_type);
        const amount = this.formatAmount(txn.amount, type);
        const statusBadge = this.getStatusBadge(txn.sync_status);

        return $(`
            <div class="transaction-card ${type}">
                <div class="transaction-icon" style="background: ${this.getCategoryColor(txn.category)}">
                    ${icon}
                </div>
                <div class="transaction-details">
                    <div class="transaction-category">${txn.category || txn.transaction_type}</div>
                    <div class="transaction-description">${txn.description || 'No description'}</div>
                </div>
                <div class="transaction-amount ${type}">${amount}</div>
                ${statusBadge}
            </div>
        `);
    }

    getTransactionIcon(category) {
        // Simple icon mapping - can be enhanced
        const icons = {
            'Meals': '🍔',
            'Transport': '🚗',
            'Entertainment': '🎬',
            'Shopping': '🛍️',
            'Income': '💰',
            'Expense': '💸',
            'Transfer': '↔️'
        };

        for (const [key, icon] of Object.entries(icons)) {
            if (category.includes(key)) {
                return icon;
            }
        }

        return '📊';
    }

    getCategoryColor(category) {
        // Simple color generation from category name
        let hash = 0;
        for (let i = 0; i < category.length; i++) {
            hash = category.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 65%, 75%)`;
    }

    formatAmount(amount, type) {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);

        if (type === 'income') {
            return '+' + formatted;
        } else if (type === 'expense') {
            return '-' + formatted;
        }
        return formatted;
    }

    getStatusBadge(status) {
        const badges = {
            'synced': '<div class="transaction-status synced">✓</div>',
            'pending': '<div class="transaction-status pending">⏳</div>',
            'syncing': '<div class="transaction-status pending">↻</div>',
            'failed': '<div class="transaction-status failed">✗</div>'
        };
        return badges[status] || '';
    }

    updateSummary() {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();

        let income = 0;
        let expense = 0;

        this.transactions.forEach(txn => {
            const txnDate = new Date(txn.date);
            if (txnDate.getMonth() === thisMonth && txnDate.getFullYear() === thisYear) {
                if (txn.transaction_type === 'Income') {
                    income += txn.amount;
                } else if (txn.transaction_type === 'Expense') {
                    expense += txn.amount;
                }
            }
        });

        const balance = income - expense;

        $('#totalIncome').text(this.formatAmount(income, 'income'));
        $('#totalExpense').text(this.formatAmount(expense, 'expense'));
        $('#netBalance').text(this.formatAmount(balance, balance >= 0 ? 'income' : 'expense'));
    }

    updateSyncStatus() {
        const $indicator = $('#syncIndicator');
        const $text = $('#syncStatusText');

        const pendingCount = this.transactions.filter(t => t.sync_status === 'pending').length;
        const syncingCount = this.transactions.filter(t => t.sync_status === 'syncing').length;
        const failedCount = this.transactions.filter(t => t.sync_status === 'failed').length;

        if (!navigator.onLine) {
            $indicator.attr('class', 'sync-indicator offline');
            $text.text('Offline mode');
        } else if (syncingCount > 0) {
            $indicator.attr('class', 'sync-indicator syncing');
            $text.text(`Syncing ${syncingCount}...`);
        } else if (failedCount > 0) {
            $indicator.attr('class', 'sync-indicator error');
            $text.text(`${failedCount} failed`);
        } else if (pendingCount > 0) {
            $indicator.attr('class', 'sync-indicator syncing');
            $text.text(`${pendingCount} pending`);
        } else {
            $indicator.attr('class', 'sync-indicator online');
            $text.text('All synced');
        }
    }

    setupEventListeners() {
        // Add transaction button
        $('#addTransactionBtn').on('click', () => {
            this.showTransactionForm();
        });

        // Online/offline events
        window.addEventListener('online', () => {
            this.updateSyncStatus();
            this.syncManager.syncAll();
        });

        window.addEventListener('offline', () => {
            this.updateSyncStatus();
        });

        // Pull to refresh
        let startY = 0;
        let pulling = false;

        $(window).on('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                pulling = true;
            }
        });

        $(window).on('touchmove', (e) => {
            if (pulling && e.touches[0].pageY - startY > 100) {
                pulling = false;
                this.handlePullToRefresh();
            }
        });

        $(window).on('touchend', () => {
            pulling = false;
        });
    }

    async handlePullToRefresh() {
        console.log('[TrackerUI] Pull to refresh triggered');
        $('#syncStatusText').text('Refreshing...');

        await this.syncManager.syncAll();
        await this.cacheData();
        await this.loadTransactions();

        frappe.show_alert({
            message: 'Refreshed',
            indicator: 'green'
        }, 2);
    }

    showTransactionForm() {
        // Open transaction form modal
        // This will be a separate component - simplified here
        frappe.msgprint({
            title: 'Add Transaction',
            message: 'Transaction form will open here',
            primary_action: {
                label: 'Save',
                action: () => {
                    // Handle save
                }
            }
        });
    }
}

// Initialize on page load
$(document).ready(async function() {
    window.trackerUI = new TrackerUI();
    await window.trackerUI.init();
});
```

---

## 7. API Endpoints

### 7.1 Existing Endpoints (From api.py)

These already exist and will be used for caching:

```python
@frappe.whitelist()
def get_cached_parties(party_type="Customer", limit=50):
    """Get frequently used customers/suppliers for offline caching."""

@frappe.whitelist()
def get_transaction_categories(category_type=None):
    """Get active transaction categories."""

@frappe.whitelist()
def get_default_payment_account():
    """Get default payment account from Tracker Settings."""

@frappe.whitelist()
def get_transaction_summary(from_date=None, to_date=None):
    """Get transaction summary for dashboard."""

@frappe.whitelist()
def get_recent_transactions(limit=20):
    """Get recent transactions with category details."""
```

### 7.2 New Endpoints (To Add)

**File:** `finance_tracker/api.py` (additions)

```python
@frappe.whitelist()
def get_sync_status():
    """Get sync status and pending transaction count.

    Returns:
        dict: Sync status information
    """
    # This is called from server, so no IndexedDB access
    # Can return general sync health, last sync time, etc.

    settings = frappe.get_single("Tracker Settings")

    return {
        "last_sync": frappe.cache().get_value("finance_tracker_last_sync"),
        "sync_enabled": True,
        "default_payment_account": settings.default_payment_account
    }


@frappe.whitelist()
def mark_cache_refreshed():
    """Mark that cache has been refreshed."""
    frappe.cache().set_value("finance_tracker_last_sync", now_datetime())
    return {"status": "success"}


@frappe.whitelist(allow_guest=False)
def validate_offline_transaction(transaction_data):
    """Validate transaction data before storing offline.

    This can be called even when offline if cached properly.
    Provides client-side validation feedback.
    """
    errors = []

    # Validate required fields
    if not transaction_data.get('transaction_type'):
        errors.append("Transaction type is required")

    if not transaction_data.get('category'):
        errors.append("Category is required")

    if not transaction_data.get('amount') or flt(transaction_data.get('amount')) <= 0:
        errors.append("Amount must be greater than zero")

    if transaction_data.get('transaction_type') == 'Income' and transaction_data.get('supplier'):
        errors.append("Income transactions should not have supplier")

    if transaction_data.get('transaction_type') == 'Expense' and transaction_data.get('customer'):
        errors.append("Expense transactions should not have customer")

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }
```

---

## 8. Component Specifications

### 8.1 Photo Compression Component

**File:** `finance_tracker/public/js/photo_compressor.js`

```javascript
class PhotoCompressor {
    constructor(maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.quality = quality;
    }

    /**
     * Compress image file
     */
    async compress(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;

                    // Calculate new dimensions
                    if (width > this.maxWidth) {
                        height = height * (this.maxWidth / width);
                        width = this.maxWidth;
                    }

                    if (height > this.maxHeight) {
                        width = width * (this.maxHeight / height);
                        height = this.maxHeight;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob
                    canvas.toBlob((blob) => {
                        console.log('[PhotoCompressor] Original:', file.size, 'Compressed:', blob.size);
                        resolve(blob);
                    }, 'image/jpeg', this.quality);
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Capture photo from camera
     */
    async capturePhoto() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment'; // Use rear camera

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const compressed = await this.compress(file);
                        resolve({
                            blob: compressed,
                            filename: file.name
                        });
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('No file selected'));
                }
            };

            input.click();
        });
    }
}

window.photoCompressor = new PhotoCompressor();
```

---

### 8.2 Transaction Form Component

**File:** `finance_tracker/www/tracker/transaction_form.html`

This will be loaded as a modal/dialog when adding transactions.

```html
<div class="transaction-form-container">
    <div class="form-header">
        <h2>New Transaction</h2>
        <button class="close-btn">&times;</button>
    </div>

    <!-- Type Selector -->
    <div class="type-selector">
        <button class="type-btn" data-type="Income">
            <span class="type-icon">💰</span>
            <span>Income</span>
        </button>
        <button class="type-btn" data-type="Expense">
            <span class="type-icon">💸</span>
            <span>Expense</span>
        </button>
        <button class="type-btn" data-type="Transfer">
            <span class="type-icon">↔️</span>
            <span>Transfer</span>
        </button>
    </div>

    <!-- Amount Input -->
    <div class="amount-input">
        <div class="currency-symbol">$</div>
        <input type="number" id="amount" placeholder="0.00" step="0.01" inputmode="decimal">
    </div>

    <!-- Category Grid -->
    <div class="category-grid" id="categoryGrid">
        <!-- Populated dynamically -->
    </div>

    <!-- Details -->
    <div class="form-details">
        <div class="form-field">
            <label>Party (Optional)</label>
            <input type="text" id="party" placeholder="Customer or Supplier">
        </div>

        <div class="form-field">
            <label>Description</label>
            <textarea id="description" rows="2" placeholder="Add a note..."></textarea>
        </div>

        <div class="form-field">
            <label>Receipt Photo</label>
            <button class="photo-btn" id="capturePhotoBtn">
                📷 Capture Photo
            </button>
            <div id="photoPreview" style="display:none;">
                <img src="" alt="Receipt" style="max-width: 100%; border-radius: 8px;">
            </div>
        </div>
    </div>

    <!-- Actions -->
    <div class="form-actions">
        <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
        <button class="btn btn-primary" id="saveBtn">Save</button>
    </div>
</div>

<style>
    .transaction-form-container {
        background: white;
        border-radius: 16px 16px 0 0;
        max-height: 90vh;
        overflow-y: auto;
        padding: 24px;
    }

    .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 28px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .type-selector {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
    }

    .type-btn {
        flex: 1;
        padding: 16px;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
    }

    .type-btn.selected {
        border-color: #4CAF50;
        background: #E8F5E9;
    }

    .type-icon {
        font-size: 32px;
    }

    .amount-input {
        display: flex;
        align-items: center;
        font-size: 48px;
        font-weight: 300;
        margin-bottom: 24px;
        justify-content: center;
    }

    .amount-input input {
        border: none;
        outline: none;
        font-size: inherit;
        font-weight: inherit;
        width: 200px;
        text-align: right;
    }

    .category-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 24px;
    }

    .category-btn {
        aspect-ratio: 1;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        background: white;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        transition: all 0.2s;
    }

    .category-btn.selected {
        border-color: #4CAF50;
        background: #E8F5E9;
    }

    .category-btn-icon {
        font-size: 32px;
    }

    .category-btn-name {
        font-size: 11px;
        text-align: center;
        line-height: 1.2;
    }

    .form-field {
        margin-bottom: 16px;
    }

    .form-field label {
        display: block;
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
    }

    .form-field input,
    .form-field textarea {
        width: 100%;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 16px;
    }

    .photo-btn {
        width: 100%;
        padding: 12px;
        border: 2px dashed #e0e0e0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        font-size: 16px;
    }

    .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
    }

    .btn {
        flex: 1;
        padding: 16px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
    }

    .btn-secondary {
        background: #f5f5f5;
        color: #666;
    }

    .btn-primary {
        background: #4CAF50;
        color: white;
    }
</style>
```

---

## 9. Implementation Phases

### Phase 1: PWA Foundation (Days 1-2)

**Tasks:**
1. Configure pwa_frappe Web App Manifest
2. Create PWA icons
3. Update finance_tracker hooks.py
4. Test PWA installation (Add to Home Screen)
5. Implement IndexedDB manager (offline_manager.js)
6. Test offline storage CRUD operations

**Deliverable:** Basic PWA that can be installed, IndexedDB working

**Files Created/Modified:**
- `hooks.py` - Add web_include_js
- `public/js/offline_manager.js` - NEW
- `public/images/icon-192.png` - NEW
- `public/images/icon-512.png` - NEW

**Testing:**
- Install PWA on Android
- Store transaction in IndexedDB
- Retrieve transaction from IndexedDB
- Verify cache stores work

---

### Phase 2: Background Sync (Days 3-4)

**Tasks:**
1. Implement sync_manager.js
2. Update sync_engine.py for PWA transactions
3. Implement background sync event handlers
4. Add photo upload logic
5. Add retry logic with exponential backoff
6. Test offline → online sync flow

**Deliverable:** Transactions sync automatically when online

**Files Created/Modified:**
- `public/js/sync_manager.js` - NEW
- `sync_engine.py` - UPDATE (add sync_transaction_to_erpnext)
- `api.py` - UPDATE (add sync endpoints)

**Testing:**
- Create transaction offline
- Go online, verify auto-sync
- Test sync retry on failure
- Test photo upload
- Verify ERPNext document creation

---

### Phase 3: Mobile UI (Days 5-7)

**Tasks:**
1. Create /tracker page (index.html, index.py)
2. Implement tracker_ui.js (dashboard logic)
3. Create transaction form modal
4. Implement photo compression
5. Add category grid UI
6. Style for mobile (pwa_mobile.css)
7. Add pull-to-refresh
8. Add sync status indicators

**Deliverable:** Beautiful mobile interface (Cashew-inspired)

**Files Created/Modified:**
- `www/tracker/index.html` - NEW
- `www/tracker/index.py` - NEW
- `www/tracker/transaction_form.html` - NEW
- `public/js/tracker_ui.js` - NEW
- `public/js/photo_compressor.js` - NEW
- `public/css/pwa_mobile.css` - NEW

**Testing:**
- Open /tracker on mobile
- Add transaction via form
- Test photo capture
- Test category selection
- Test pull-to-refresh
- Verify responsive layout

---

### Phase 4: Caching & Polish (Days 8-10)

**Tasks:**
1. Implement party caching logic
2. Implement category caching logic
3. Add periodic sync (every 5 minutes)
4. Add sync status dashboard
5. Write comprehensive tests
6. Update documentation
7. Clean up technical debt
8. Final testing on mobile devices

**Deliverable:** Production-ready PWA

**Files Created/Modified:**
- All files polished and tested
- `docs/pwa-user-guide.md` - NEW
- `docs/pwa-admin-guide.md` - NEW
- Test files - NEW

**Testing:**
- Full offline mode testing
- 1000+ transaction performance test
- Multiple device sync test
- Network failure scenarios
- Google Play TWA packaging test

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File:** `finance_tracker/tests/test_pwa_functionality.py`

```python
import unittest
import frappe
from frappe.utils import now_datetime, getdate

class TestPWAFunctionality(unittest.TestCase):

    def setUp(self):
        """Set up test fixtures."""
        self.category = frappe.get_doc({
            "doctype": "Transaction Category",
            "category_name": "Test Category",
            "category_type": "Expense",
            "account": "5110 - Expense Account - TC",
            "is_active": 1
        }).insert()

    def tearDown(self):
        """Clean up test data."""
        frappe.delete_doc("Transaction Category", self.category.name)

    def test_sync_transaction_to_erpnext(self):
        """Test transaction sync from offline to ERPNext."""
        from finance_tracker.sync_engine import sync_transaction_to_erpnext

        transaction_data = {
            "transaction_type": "Expense",
            "date": now_datetime(),
            "category": self.category.name,
            "amount": 100.00,
            "payment_account": "Cash - TC",
            "description": "Test expense"
        }

        result = sync_transaction_to_erpnext(transaction_data)

        self.assertEqual(result["status"], "success")
        self.assertIn(result["reference_doctype"], ["Purchase Invoice", "Journal Entry"])
        self.assertIsNotNone(result["reference_name"])

        # Clean up
        doc = frappe.get_doc(result["reference_doctype"], result["reference_name"])
        doc.cancel()
        doc.delete()

    def test_get_cached_parties(self):
        """Test party caching API."""
        from finance_tracker.api import get_cached_parties

        parties = get_cached_parties(party_type="Customer", limit=10)

        self.assertIsInstance(parties, list)
        self.assertLessEqual(len(parties), 10)

        if len(parties) > 0:
            self.assertIn("name", parties[0])
            self.assertIn("party_name", parties[0])

    def test_get_transaction_categories(self):
        """Test category caching API."""
        from finance_tracker.api import get_transaction_categories

        categories = get_transaction_categories()

        self.assertIsInstance(categories, list)
        self.assertGreater(len(categories), 0)

        for cat in categories:
            self.assertIn("category_name", cat)
            self.assertIn("category_type", cat)
            self.assertIn("account", cat)
```

---

### 10.2 Integration Tests

**Manual Test Scenarios:**

1. **Offline Transaction Creation**
   - Disconnect internet
   - Open /tracker
   - Create transaction
   - Verify stored in IndexedDB
   - Verify "Pending Sync" status

2. **Online Sync**
   - Connect internet
   - Wait for auto-sync (or trigger manually)
   - Verify ERPNext document created
   - Verify status updated to "Synced"

3. **Photo Capture**
   - Add transaction with photo
   - Verify photo compressed
   - Sync transaction
   - Verify photo attached to ERPNext document

4. **Sync Retry**
   - Create transaction with invalid data (e.g., missing account)
   - Trigger sync
   - Verify retry with exponential backoff
   - Fix data
   - Verify eventual sync success

5. **PWA Installation**
   - Open site on mobile browser
   - Verify "Add to Home Screen" prompt
   - Install PWA
   - Launch from home screen
   - Verify full-screen mode

---

### 10.3 Performance Tests

**Metrics to Validate:**

| Metric | Target | Test Method |
|--------|--------|-------------|
| PWA Install Size | < 5MB | Chrome DevTools > Application |
| IndexedDB 1000 Transactions | < 2s load | Create 1000 records, measure getAllTransactions() |
| Photo Compression | < 500KB per image | Upload large photo, verify compressed size |
| Sync Speed | < 5s per transaction | Measure sync_transaction_to_erpnext() |
| UI Responsiveness | < 100ms interactions | Touch delay measurement |
| Cache Load Time | < 2s | Measure cacheParties() + cacheCategories() |

---

## 11. Deployment Plan

### 11.1 Pre-Deployment Checklist

- [ ] All unit tests passing
- [ ] Integration tests completed
- [ ] Performance benchmarks met
- [ ] PWA manifest configured
- [ ] Icons created (192x192, 512x512)
- [ ] HTTPS enabled on bt.dev
- [ ] Service worker registered
- [ ] IndexedDB working in all browsers
- [ ] Sync engine tested
- [ ] Mobile UI tested on Android/iOS
- [ ] Documentation complete

---

### 11.2 Deployment Steps

#### **Step 1: Prepare Assets**
```bash
# Create PWA icons
# Add to: apps/finance_tracker/finance_tracker/public/images/

# Build assets
bench build --app finance_tracker
```

#### **Step 2: Configure pwa_frappe**
```
1. Go to: Web App Manifest (Desk)
2. Fill all fields (as per Section 3.2)
3. Upload icons
4. Save
5. Click: "Automatically configure PWA"
```

#### **Step 3: Migrate Database**
```bash
bench --site bt.dev migrate
bench --site bt.dev clear-cache
```

#### **Step 4: Test PWA**
```
1. Open: https://bt.dev/tracker (mobile browser)
2. Verify: Manifest loads
3. Verify: Service worker registers
4. Install: Add to Home Screen
5. Test: Offline mode
6. Test: Sync when online
```

#### **Step 5: Production Deployment**
```bash
# If using supervisor
sudo supervisorctl restart all

# If using systemd
sudo systemctl restart frappe-web
sudo systemctl restart frappe-worker

# Verify
bench --site bt.dev console
# Test imports
```

---

### 11.3 Post-Deployment Validation

1. **Functionality Check:**
   - Create transaction offline
   - Verify sync when online
   - Test photo upload
   - Verify ERPNext document creation

2. **Performance Check:**
   - Measure page load time
   - Check IndexedDB performance
   - Monitor sync speed

3. **User Acceptance:**
   - Get feedback from test users
   - Monitor error logs
   - Check sync success rate

---

## 12. Security Considerations

### 12.1 Data Security

**Offline Data:**
- IndexedDB data is stored locally (per-device, per-browser)
- Not accessible by other websites
- Cleared when browser data is cleared
- Encrypted at rest by browser (OS-level)

**Sensitive Data Handling:**
- Don't store passwords or API keys in IndexedDB
- Receipt photos stored as blobs (not accessible externally)
- Sync uses HTTPS (encrypted in transit)

---

### 12.2 Authentication

**Service Worker:**
- Inherits Frappe session authentication
- CSRF token validation required for API calls
- Session timeout applies to PWA

**API Endpoints:**
- All whitelisted methods check permissions
- `@frappe.whitelist()` decorator required
- Permission checks before sync

---

### 12.3 CSRF Handling

**Challenge:** Service workers can't easily access CSRF tokens

**Solution:**
```javascript
// Store CSRF token in IndexedDB on page load
await offlineManager.storeSetting('csrf_token', frappe.csrf_token);

// Use in sync requests
const csrfToken = await offlineManager.getSetting('csrf_token');
fetch(url, {
    headers: {
        'X-Frappe-CSRF-Token': csrfToken
    }
});
```

---

## 13. Performance Targets

### 13.1 Key Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| **First Contentful Paint** | < 1.5s | Fast perceived load |
| **Time to Interactive** | < 3s | Quick interactivity |
| **IndexedDB Write** | < 50ms | Smooth UX |
| **IndexedDB Read (50 records)** | < 200ms | Fast list load |
| **Photo Compression** | < 2s | Acceptable delay |
| **Sync per Transaction** | < 5s | Network dependent |
| **Cache Refresh** | < 3s | Background acceptable |

---

### 13.2 Optimization Strategies

**Code Splitting:**
- Load transaction form on-demand
- Lazy load photo compressor
- Separate sync logic from UI

**Asset Optimization:**
- Minify CSS and JS
- Compress images (icons < 50KB)
- Use WebP for photos where supported

**Database Optimization:**
- Index frequently queried fields (sync_status, date)
- Limit transaction list (50 most recent)
- Paginate if needed

**Network Optimization:**
- Batch sync multiple transactions
- Queue photo uploads separately
- Use compression for API responses

---

## 14. Google Play Distribution

### 14.1 TWA (Trusted Web Activity) Setup

**Prerequisites:**
- PWA fully functional at https://bt.dev/tracker
- Valid SSL certificate
- manifest.json configured
- Service worker registered

---

### 14.2 Using PWABuilder (Recommended)

**Steps:**
1. Visit https://www.pwabuilder.com
2. Enter: `https://bt.dev/tracker`
3. Click: "Start"
4. Wait for analysis
5. Click: "Package for Stores"
6. Select: "Android"
7. Fill TWA details:
   - Package name: `com.financetracker.app`
   - App name: "Finance Tracker"
   - Version: 1.0.0
   - Icon: Upload (512x512)
8. Click: "Generate"
9. Download: `finance-tracker.apk`

---

### 14.3 Digital Asset Links

**Required for TWA:**

Create file: `bt.dev/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.financetracker.app",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

Get SHA256 fingerprint:
```bash
keytool -list -v -keystore release-key.jks
```

---

### 14.4 Google Play Submission

**Steps:**
1. Create Google Play Developer account ($25 one-time)
2. Go to: Google Play Console
3. Create new app
4. Fill app details:
   - Title: "Finance Tracker"
   - Short description
   - Full description
   - Screenshots (from mobile)
   - Icon (512x512)
   - Feature graphic (1024x500)
5. Upload APK (from PWABuilder)
6. Set content rating
7. Set pricing (Free/Paid)
8. Submit for review
9. Wait 1-3 days for approval

**Result:**
- ✅ Listed on Google Play Store
- ✅ Users install like native app
- ✅ Auto-updates when PWA updates
- ✅ Single codebase (no separate Android dev needed)

---

## 15. Appendix

### 15.1 File Structure Summary

```
finance_tracker/
├── finance_tracker/
│   ├── api.py                          # UPDATED
│   ├── sync_engine.py                  # UPDATED
│   ├── hooks.py                        # UPDATED
│   └── public/
│       ├── js/
│       │   ├── offline_manager.js      # NEW
│       │   ├── sync_manager.js         # NEW
│       │   ├── tracker_ui.js           # NEW
│       │   └── photo_compressor.js     # NEW
│       ├── css/
│       │   └── pwa_mobile.css          # NEW
│       └── images/
│           ├── icon-192.png            # NEW
│           └── icon-512.png            # NEW
├── www/
│   └── tracker/
│       ├── index.html                  # NEW
│       ├── index.py                    # NEW
│       └── transaction_form.html       # NEW
├── tests/
│   └── test_pwa_functionality.py       # NEW
└── docs/
    ├── pwa-exploration-findings.md     # CREATED
    ├── pwa-technical-specification.md  # THIS FILE
    ├── pwa-user-guide.md               # TODO
    └── pwa-admin-guide.md              # TODO
```

---

### 15.2 Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Service Workers | ✅ 40+ | ✅ 11.3+ | ✅ 44+ | ✅ 17+ |
| IndexedDB | ✅ 24+ | ✅ 10+ | ✅ 16+ | ✅ 12+ |
| Background Sync | ✅ 49+ | ❌ | ❌ | ✅ 79+ |
| Push Notifications | ✅ 42+ | ✅ 16+ (limited) | ✅ 44+ | ✅ 17+ |
| Add to Home Screen | ✅ | ✅ (iOS 11.3+) | ❌ | ✅ |

**Note:** Safari has limited PWA support. iOS users can still install, but some features (background sync) won't work. Fallback: Manual sync button.

---

### 15.3 Fallback Strategies

**No Background Sync API:**
- Use periodic sync (setInterval)
- Add manual "Sync Now" button
- Sync on app open

**No Service Worker:**
- App works as regular web app
- No offline capability
- Show warning to user

**No IndexedDB:**
- Fallback to localStorage (5MB limit)
- Or require online-only mode

---

### 15.4 Future Enhancements

**Phase 3 (Post-Launch):**
1. Push notifications for sync failures
2. Biometric authentication
3. Voice-to-text for descriptions
4. Receipt OCR (extract amount/date)
5. Multi-currency support
6. Budget tracking integration
7. Analytics dashboard
8. Export to CSV/Excel
9. Share transactions
10. Apple App Store (via Capacitor)

---

## 16. Conclusion

This Technical Specification provides a complete roadmap for transforming finance_tracker into a fully offline-capable Progressive Web App. By leveraging `pwa_frappe` for infrastructure and building custom application logic on top, we achieve:

✅ **Offline-first expense tracking**
✅ **Modern mobile UI** (Cashew-inspired)
✅ **Automatic sync** to ERPNext
✅ **Google Play distribution** (via TWA)
✅ **7-10 day implementation** (reduced from 10-15 days)

**Next Steps:**
1. Review and approve this TSD
2. Begin Phase 1 implementation (Days 1-2)
3. Iterate through phases
4. Deploy to bt.dev
5. Test with users
6. Publish to Google Play (optional)

---

**Document Status:** ✅ Ready for Implementation
**Approval Required:** Yes
**Estimated Start Date:** 2026-02-08
**Estimated Completion:** 2026-02-17

---

*End of Technical Specification Document*

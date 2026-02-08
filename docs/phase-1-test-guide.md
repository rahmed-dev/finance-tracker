# Finance Tracker PWA - Phase 1 Testing Guide

**Date:** 2026-02-08
**Status:** Ready for Testing
**Site:** bt.dev
**Test Page:** `/pwa-test`

---

## 📋 Overview

This guide covers comprehensive testing for Phase 1 of the Finance Tracker PWA implementation:
- ✅ PWA Installation capability
- ✅ IndexedDB initialization
- ✅ Transaction CRUD operations
- ✅ Cache operations (parties/categories)
- ✅ Settings storage

---

## 🚀 Getting Started

### 1. Access the Test Page

**Desktop:**
```
https://bt.dev/pwa-test
```

**Mobile:**
- Connect your mobile device to the same network
- Access via browser: `https://bt.dev/pwa-test`
- Or use your device's IP address if accessible

### 2. Prerequisites

- ✅ Bench running (`bench start`)
- ✅ Site bt.dev accessible
- ✅ HTTPS enabled (required for PWA)
- ✅ Modern browser (Chrome, Edge, Safari, Firefox)

---

## 🧪 Test Procedures

### Test 1: PWA Installation ✅

**Objective:** Verify the app can be installed as a PWA

**Steps:**
1. Click **"Check PWA Support"** button
2. Review console log for:
   - ✅ Service Worker API supported
   - ✅ Running on HTTPS
   - ✅ Web App Manifest detected
3. Status should show: "PWA Ready" (green)

**If "PWA Ready":**
4. Click **"Install PWA"** button (if available)
5. Follow browser's install prompt
6. Verify app icon appears on home screen/app list

**Alternative Installation Methods:**
- **Chrome Desktop:** Three dots → Install Finance Tracker
- **Chrome Mobile:** Three dots → Add to Home Screen
- **Safari iOS:** Share → Add to Home Screen
- **Edge:** Apps → Install Finance Tracker

**Expected Results:**
- ✅ All PWA requirements met
- ✅ Install prompt appears (or manual installation works)
- ✅ App installs successfully
- ✅ Can launch as standalone app
- ✅ No browser UI visible when launched

**Common Issues:**
- ❌ "Not running on HTTPS" → Enable SSL on bt.dev
- ❌ "Service Worker not supported" → Update browser
- ❌ "Manifest not found" → Check pwa_frappe configuration

---

### Test 2: IndexedDB Initialization ✅

**Objective:** Verify IndexedDB database creation and schema

**Steps:**
1. Click **"Initialize Database"** button
2. Check console log for:
   - ✅ "IndexedDB initialized successfully"
   - ✅ Database name and version logged
3. Status should change to: "Initialized" (green)
4. All other test buttons should become enabled

**Browser DevTools Verification:**
1. Open DevTools (F12)
2. Navigate to **Application** tab
3. Expand **Storage → IndexedDB**
4. Find `finance_tracker_db`
5. Verify object stores exist:
   - `transactions` (with indexes: sync_status, date, created_at)
   - `cached_parties` (with indexes: party_type, transaction_count)
   - `cached_categories` (with indexes: category_type, is_active)
   - `app_settings` (with index: key)

**Expected Results:**
- ✅ Database created successfully
- ✅ All 4 object stores present
- ✅ All indexes created correctly
- ✅ Status changes to "Initialized"
- ✅ Other test buttons enabled

**Common Issues:**
- ❌ "Failed to open IndexedDB" → Check browser support
- ❌ IndexedDB disabled → Check browser privacy settings
- ❌ QuotaExceededError → Clear browser storage

---

### Test 3: Transaction CRUD Operations ✅

**Objective:** Validate transaction storage, retrieval, and updates

#### 3A: Create Transaction

**Steps:**
1. Click **"Create Transaction"** button
2. Check console log for:
   - ✅ "Transaction created with ID: [number]"
3. Status shows: "Transaction Created" (green)
4. Stats section shows:
   - Pending: 1
   - Synced: 0
   - Failed: 0

**DevTools Verification:**
1. DevTools → Application → IndexedDB → `finance_tracker_db` → `transactions`
2. Verify transaction exists with:
   - `id`: Auto-generated number
   - `sync_status`: "pending"
   - `created_at`: ISO timestamp
   - `retry_count`: 0
   - All transaction fields populated

**Expected Results:**
- ✅ Transaction stored in IndexedDB
- ✅ Auto-generated ID returned
- ✅ Default fields added (sync_status, created_at, retry_count)
- ✅ Stats updated correctly

#### 3B: Read Transactions

**Steps:**
1. Click **"Read Transactions"** button
2. Check console log for:
   - ✅ "Retrieved [N] total transactions"
   - ✅ "Retrieved [N] pending transactions"
   - ✅ Latest transaction JSON displayed
3. Status shows: "[N] Transactions" (green)

**Expected Results:**
- ✅ All transactions retrieved
- ✅ Pending transactions filtered correctly
- ✅ Transactions sorted by created_at (newest first)
- ✅ Transaction data matches what was created

#### 3C: Update Transaction Status

**Steps:**
1. Click **"Update Status"** button
2. Check console log for:
   - ✅ "Transaction [id] marked as synced"
3. Stats section updates:
   - Pending: 0
   - Synced: 1
   - Failed: 0

**DevTools Verification:**
1. Check transaction in IndexedDB
2. Verify fields updated:
   - `sync_status`: "synced"
   - `synced_at`: New timestamp
   - `reference_doctype`: "Sales Invoice"
   - `reference_name`: "TEST-INV-001"
   - `sync_error`: null

**Expected Results:**
- ✅ Transaction status updated to "synced"
- ✅ Reference fields populated
- ✅ synced_at timestamp added
- ✅ Stats reflect changes

**Repeat Test:**
- Click "Create Transaction" 2-3 more times
- Click "Read Transactions" to verify
- Try updating different transactions
- Verify stats accuracy

---

### Test 4: Cache Operations ✅

**Objective:** Validate party and category caching

#### 4A: Cache Parties

**Steps:**
1. Click **"Cache Parties"** button
2. Check console log for:
   - ✅ "Cached 2 parties"
3. Status shows: "Parties Cached" (green)

**DevTools Verification:**
1. DevTools → IndexedDB → `cached_parties`
2. Verify 2 parties exist:
   - Customer: "Test Customer 1"
   - Supplier: "Test Supplier 1"
3. Each party has:
   - `cached_at`: Timestamp
   - `transaction_count`: Number
   - `party_type`: "Customer" or "Supplier"

**Expected Results:**
- ✅ Old cache cleared
- ✅ New parties cached
- ✅ cached_at timestamp added
- ✅ All fields preserved

#### 4B: Cache Categories

**Steps:**
1. Click **"Cache Categories"** button
2. Check console log for:
   - ✅ "Cached 2 categories"
3. Status shows: "Categories Cached" (green)

**DevTools Verification:**
1. DevTools → IndexedDB → `cached_categories`
2. Verify 2 categories exist:
   - Expense: "Food"
   - Income: "Salary"
3. Each category has:
   - `cached_at`: Timestamp
   - `is_active`: 1
   - `category_type`: "Expense" or "Income"

**Expected Results:**
- ✅ Old cache cleared
- ✅ New categories cached
- ✅ cached_at timestamp added
- ✅ All fields preserved

#### 4C: Read Cache

**Steps:**
1. Click **"Read Cache"** button
2. Check console log for:
   - ✅ "Retrieved 1 customers"
   - ✅ "Retrieved 1 suppliers"
   - ✅ "Retrieved 2 categories"
3. Status shows: "Cache Read" (green)

**Expected Results:**
- ✅ Parties retrieved by type correctly
- ✅ All categories retrieved
- ✅ Data matches what was cached

---

### Test 5: Settings Operations ✅

**Objective:** Validate app settings storage

#### 5A: Set Settings

**Steps:**
1. Click **"Set Setting"** button
2. Check console log for:
   - ✅ "Settings saved"
3. Status shows: "Settings Set" (green)

**DevTools Verification:**
1. DevTools → IndexedDB → `app_settings`
2. Verify 2 settings exist:
   - `last_sync`: ISO timestamp
   - `user_theme`: "dark"

**Expected Results:**
- ✅ Multiple settings saved
- ✅ Each setting has key/value pair
- ✅ No errors in console

#### 5B: Get Settings

**Steps:**
1. Click **"Get Setting"** button
2. Check console log for:
   - ✅ "last_sync: [timestamp]"
   - ✅ "user_theme: dark"
3. Status shows: "Settings Retrieved" (green)

**Expected Results:**
- ✅ Settings retrieved correctly
- ✅ Values match what was set
- ✅ Null returned for non-existent keys

---

## 🧪 Advanced Testing

### Offline Mode Testing

**Test Offline Functionality:**
1. Complete all tests above
2. Open DevTools → Network tab
3. Set throttling to **"Offline"**
4. Click "Create Transaction" multiple times
5. Verify transactions still save to IndexedDB
6. Set back to **"Online"**
7. Verify data persists

**Expected Results:**
- ✅ Transactions save when offline
- ✅ No errors in console
- ✅ Data persists after going online

### Browser Compatibility

**Test on Multiple Browsers:**
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (macOS/iOS)
- ✅ Mobile browsers

**Expected Results:**
- ✅ All tests pass on all browsers
- ✅ IndexedDB works consistently
- ✅ PWA installation works (where supported)

### Persistence Testing

**Test Data Persistence:**
1. Complete all tests
2. Close browser completely
3. Reopen browser
4. Navigate to `/pwa-test`
5. Click "Initialize Database"
6. Click "Read Transactions"
7. Click "Read Cache"
8. Click "Get Setting"

**Expected Results:**
- ✅ All data persists across sessions
- ✅ Transactions still in database
- ✅ Cache still populated
- ✅ Settings still saved

### Stress Testing

**High Volume Test:**
1. Create 50+ transactions (click "Create Transaction" rapidly)
2. Click "Read Transactions"
3. Verify all retrieved correctly
4. Check stats accuracy

**Expected Results:**
- ✅ All transactions saved
- ✅ No performance degradation
- ✅ Stats remain accurate
- ✅ No browser memory issues

---

## ✅ Success Criteria

Phase 1 is considered **COMPLETE** when:

1. **PWA Installation:**
   - ✅ App can be installed on desktop
   - ✅ App can be installed on mobile
   - ✅ Launches as standalone app
   - ✅ No browser UI visible

2. **IndexedDB:**
   - ✅ Database initializes successfully
   - ✅ All object stores created
   - ✅ All indexes functional
   - ✅ Works across browser restarts

3. **Transactions:**
   - ✅ Create, read, update operations work
   - ✅ Status tracking accurate
   - ✅ Stats calculations correct
   - ✅ Handles multiple transactions

4. **Cache:**
   - ✅ Parties cached and retrieved by type
   - ✅ Categories cached and retrieved
   - ✅ Cache clears before new data
   - ✅ Timestamps added correctly

5. **Settings:**
   - ✅ Settings saved and retrieved
   - ✅ Multiple settings supported
   - ✅ Null handling for missing keys

6. **Cross-Browser:**
   - ✅ Works on Chrome/Edge
   - ✅ Works on Firefox
   - ✅ Works on Safari (if available)
   - ✅ Works on mobile browsers

7. **Offline:**
   - ✅ Transactions save when offline
   - ✅ Data persists after reconnection

---

## 🐛 Troubleshooting

### Common Issues

**Issue:** "IndexedDB initialization failed"
- **Solution:** Check browser privacy settings, disable private browsing mode

**Issue:** "PWA not installable"
- **Solution:** Verify HTTPS, check manifest.json exists, ensure service worker registered

**Issue:** "Transactions not persisting"
- **Solution:** Check browser storage quota, verify database initialized correctly

**Issue:** "Stats not updating"
- **Solution:** Refresh page, check IndexedDB for correct sync_status values

**Issue:** "Console shows red errors"
- **Solution:** Check browser console for specific error, verify offline_manager.js loaded

---

## 📊 Test Results Template

```markdown
## Phase 1 Test Results - [Date]

**Tester:** [Name]
**Browser:** [Chrome/Firefox/Safari] [Version]
**Platform:** [Desktop/Mobile] [OS]
**Site:** bt.dev

### PWA Installation
- [ ] PWA support check passed
- [ ] Install prompt appeared
- [ ] App installed successfully
- [ ] Standalone launch works
- **Notes:**

### IndexedDB Initialization
- [ ] Database created
- [ ] All object stores present
- [ ] All indexes functional
- **Notes:**

### Transaction CRUD
- [ ] Create transaction works
- [ ] Read transactions works
- [ ] Update status works
- [ ] Stats accurate
- **Notes:**

### Cache Operations
- [ ] Cache parties works
- [ ] Cache categories works
- [ ] Read cache works
- **Notes:**

### Settings
- [ ] Set settings works
- [ ] Get settings works
- **Notes:**

### Offline Testing
- [ ] Transactions save offline
- [ ] Data persists after reconnect
- **Notes:**

### Overall Status
- [ ] ✅ PASS - Phase 1 Complete
- [ ] ⚠️ PARTIAL - Issues found (see notes)
- [ ] ❌ FAIL - Major issues blocking

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🎯 Next Steps After Phase 1

Once all tests pass:

1. ✅ Update `active.yaml` with test results
2. ✅ Document any issues/fixes in notes
3. ✅ Proceed to **Phase 2: Background Sync**
   - Update sync_engine.py
   - Implement photo upload
   - Test offline → online sync flow
4. ✅ Or jump to **Phase 3: Mobile UI**
   - Create /tracker page
   - Build beautiful interface
   - Implement photo compression

---

**🎉 Good luck with testing!**

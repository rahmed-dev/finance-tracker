# PWA Testing Guide - Phase 1

## Test 1: Verify IndexedDB Initialization

### Browser Console Test

1. **Open:** https://bt.dev in Chrome/Firefox
2. **Open Console:** Press `F12` → Console tab
3. **Run Commands:**

```javascript
// Initialize IndexedDB
await offlineManager.init()
// Expected: "[OfflineManager] IndexedDB initialized"

// Check if database exists
console.log(offlineManager.db)
// Expected: IDBDatabase object

// Test save transaction
const testTxn = {
    transaction_type: "Expense",
    category_id: "TEST-001",
    amount: 50.00,
    description: "Test transaction",
    date: new Date().toISOString()
}

const txnId = await offlineManager.saveTransaction(testTxn)
console.log("Saved transaction ID:", txnId)
// Expected: Number (e.g., 1)

// Retrieve all transactions
const allTxns = await offlineManager.getAllTransactions()
console.log("All transactions:", allTxns)
// Expected: Array with your test transaction

// Get pending count
const pendingCount = await offlineManager.getTransactionCountByStatus('pending')
console.log("Pending transactions:", pendingCount)
// Expected: 1 (or more)
```

**✅ PASS if:** All commands execute without errors

---

## Test 2: Verify PWA Manifest

1. **Open:** https://bt.dev/manifest.json
2. **Verify:** JSON appears with your app details
3. **Check:** Icons array has both 192x192 and 512x512

**Expected Output:**
```json
{
  "name": "Finance Tracker",
  "short_name": "FinTrack",
  "theme_color": "#4CAF50",
  "background_color": "#ffffff",
  "display": "standalone",
  "start_url": "/tracker",
  "scope": "/tracker",
  "icons": [
    {
      "src": "/assets/finance_tracker/images/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/assets/finance_tracker/images/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**✅ PASS if:** Valid JSON with correct details

---

## Test 3: Verify Service Worker

### Chrome DevTools

1. **Open:** https://bt.dev
2. **DevTools:** Press `F12` → Application tab
3. **Service Workers:** Click "Service Workers" in left sidebar
4. **Verify:** Service worker registered for bt.dev

**Expected:**
- Status: `activated and running`
- Source: `/sw.js`
- Scope: bt.dev

**✅ PASS if:** Service worker is active

---

## Test 4: Test PWA Installation (Desktop)

### Chrome Desktop

1. **Open:** https://bt.dev in Chrome
2. **Address Bar:** Look for install icon (⊕ or ⬇️)
3. **Click:** Install button
4. **Result:** App installs as desktop app

**Expected:**
- App opens in new window
- No browser UI (address bar hidden)
- Title: "Finance Tracker" or "FinTrack"

**✅ PASS if:** App installs and opens

---

## Test 5: Test PWA Installation (Mobile)

### Android Chrome

1. **Open:** https://bt.dev on Android Chrome
2. **Menu:** Tap three dots (⋮)
3. **Option:** "Add to Home Screen" or "Install app"
4. **Confirm:** Install
5. **Home Screen:** Icon appears
6. **Launch:** Tap icon

**Expected:**
- App opens full-screen
- No browser UI
- Splash screen shows (green background, icon)

**✅ PASS if:** Installs and opens like native app

### iOS Safari

1. **Open:** https://bt.dev in Safari
2. **Share Button:** Tap share icon
3. **Option:** "Add to Home Screen"
4. **Confirm:** Add
5. **Home Screen:** Icon appears
6. **Launch:** Tap icon

**Expected:**
- App opens
- No Safari UI
- Works like web app

**Note:** iOS has limited PWA support (no background sync)

**✅ PASS if:** Installs (with limitations)

---

## Test 6: Verify Offline Mode

1. **Open:** PWA (installed app or bt.dev)
2. **DevTools:** Network tab → Set "Offline"
3. **Console:** Run IndexedDB tests again
4. **Verify:** Can still save transactions locally

```javascript
// While offline
await offlineManager.init()

const offlineTxn = {
    transaction_type: "Expense",
    category_id: "OFFLINE-TEST",
    amount: 25.00,
    description: "Offline test",
    date: new Date().toISOString()
}

await offlineManager.saveTransaction(offlineTxn)
console.log("Saved offline!")
```

**✅ PASS if:** Transactions save while offline

---

## Test 7: Check Asset Loading

1. **DevTools:** Network tab
2. **Reload:** Page
3. **Filter:** JS and CSS files
4. **Verify:** Files load:
   - `/assets/pwa_frappe/js/pwa.js`
   - `/assets/finance_tracker/js/offline_manager.js`
   - `/assets/finance_tracker/js/sync_manager.js`
   - `/assets/finance_tracker/css/pwa_mobile.css`

**✅ PASS if:** All files load (status 200)

---

## Test 8: Sync Manager Initialization

```javascript
// Check sync manager exists
console.log(window.syncManager)
// Expected: SyncManager object

// Check offline manager linked
console.log(syncManager.offlineManager === offlineManager)
// Expected: true

// Test background sync registration
await syncManager.registerSync()
// Expected: "[SyncManager] Background sync registered"
//       or "[SyncManager] Background Sync not supported"
```

**✅ PASS if:** Sync manager initialized

---

## Common Issues & Fixes

### Issue: "offlineManager is not defined"

**Cause:** Scripts not loaded
**Fix:**
```bash
bench build --app finance_tracker
bench --site bt.dev clear-cache
# Reload browser
```

### Issue: IndexedDB error

**Cause:** Browser restrictions
**Fix:**
- Check browser supports IndexedDB
- Use incognito/private mode to test
- Check HTTPS (required for PWA)

### Issue: Service worker not registering

**Cause:** HTTPS required
**Fix:**
- Ensure https://bt.dev (not http://)
- Check SSL certificate valid

### Issue: Icons not showing

**Cause:** Incorrect paths
**Fix:**
```bash
# Verify files exist
ls -la /home/riz/bench-15/apps/finance_tracker/finance_tracker/public/images/

# Check manifest.json icon paths
curl https://bt.dev/manifest.json | grep icon
```

---

## Success Criteria - Phase 1 Complete ✅

**Must Pass:**
- ✅ IndexedDB initializes
- ✅ Can save transactions offline
- ✅ Manifest.json loads
- ✅ Service worker registers
- ✅ PWA installs (desktop or mobile)

**Optional (Nice to Have):**
- ✅ Background sync registers (Chrome only)
- ✅ Icons look good
- ✅ Splash screen shows

---

## Next Phase

Once all tests pass:
- **Phase 2:** Background Sync Engine
- **Phase 3:** Mobile UI
- **Phase 4:** Testing & Deployment

---

**Estimated Testing Time:** 15-20 minutes
**Tools Needed:** Chrome/Firefox, Android device (optional)

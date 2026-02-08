# Web App Manifest Configuration Guide

## Step-by-Step Setup in Frappe Desk

### 1. Open Web App Manifest

```
1. Open browser: https://bt.dev
2. Login to Frappe Desk
3. Search bar: Type "Web App Manifest"
4. Click: Web App Manifest (Single DocType)
```

---

### 2. Fill Basic Information

**App Identity:**
- **App Name:** `Finance Tracker`
- **Short Name:** `FinTrack`
- **Description:** `Offline-first expense and income tracker for personal finance`

**Colors:**
- **Theme Color:** `#171717` (dark gray/black - matches Frappe v15)
- **Background Color:** `#ffffff` (white - splash screen)

**Display:**
- **Display:** Select `standalone` (full-screen app mode)
- **Orientation:** Select `portrait` (mobile vertical)

**URLs:**
- **Start URL:** `/tracker` (PWA home page)
- **Scope:** `/tracker` (PWA scope)

**Language:**
- **Language:** `en` (English)
- **Text Direction:** `ltr` (left-to-right)

---

### 3. Add Icons (Child Table)

Click **Add Row** in "Icons" section:

**Icon 1:**
- **Source:** `/assets/finance_tracker/images/icon-192.png`
- **Sizes:** `192x192`
- **Type:** `image/png`

**Icon 2:**
- **Source:** `/assets/finance_tracker/images/icon-512.png`
- **Sizes:** `512x512`
- **Type:** `image/png`

---

### 4. Optional: Add Screenshots

If you want to show app screenshots in stores:

Click **Add Row** in "Screenshots" section:
- **Source:** `/assets/finance_tracker/images/screenshot1.png`
- **Sizes:** `1280x720`
- **Type:** `image/png`

*(Can skip for now - not required for testing)*

---

### 5. Save Document

Click **Save** button (top-right)

---

### 6. Automatically Configure PWA

**IMPORTANT STEP:**

Click the button: **"Automatically configure PWA"**

This will:
- ✅ Add manifest link to Website Settings
- ✅ Enable PWA features
- ✅ Configure service worker

You should see a success message.

---

### 7. Verify Configuration

**Check Website Settings:**
```
1. Search: "Website Settings"
2. Open: Website Settings
3. Scroll to: "Head HTML"
4. Verify: Contains <link href="/manifest.json" rel="manifest">
```

If the link is there, you're good! ✅

---

### 8. Test Manifest Endpoint

Open in browser: `https://bt.dev/manifest.json`

Should see JSON output like:
```json
{
  "name": "Finance Tracker",
  "short_name": "FinTrack",
  "theme_color": "#4CAF50",
  "icons": [...]
}
```

If you see this, manifest is working! 🎉

---

## Troubleshooting

**Problem:** manifest.json shows error
- **Solution:** Check icon paths are correct
- **Solution:** Rebuild assets: `bench build --app finance_tracker`

**Problem:** Icons not showing
- **Solution:** Clear browser cache
- **Solution:** Verify icon files exist in public/images/

**Problem:** Can't find Web App Manifest
- **Solution:** Check pwa_frappe is installed: `bench list-apps`
- **Solution:** If not listed, install: `bench --site bt.dev install-app pwa_frappe`

---

## Next Steps

After manifest is configured:
1. Test PWA installation on mobile
2. Verify IndexedDB initialization
3. Complete Phase 1! 🎉

---

**Estimated Time:** 5-10 minutes
**Difficulty:** Easy (just form filling)

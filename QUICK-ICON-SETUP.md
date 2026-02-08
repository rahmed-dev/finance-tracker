# Quick PWA Icon Setup

## Method 1: Text-Based Icon (5 minutes) ⭐ FASTEST

1. **Visit:** https://favicon.io/favicon-generator/

2. **Configure:**
   - Text: `$` or `FT`
   - Background: `Rounded`
   - Font Family: `Leckerli One` or any
   - Font Size: `110`
   - Font Color: `#FFFFFF` (white)
   - Background Color: `#171717` (dark gray/black - matches Frappe v15)

3. **Download:**
   - Click "Download"
   - Extract ZIP file
   - You'll get multiple sizes including:
     * android-chrome-192x192.png ✅
     * android-chrome-512x512.png ✅

4. **Copy to Finance Tracker:**
   ```bash
   # From your Downloads folder:
   cp ~/Downloads/favicon_io/android-chrome-192x192.png \
      /home/riz/bench-15/apps/finance_tracker/finance_tracker/public/images/icon-192.png

   cp ~/Downloads/favicon_io/android-chrome-512x512.png \
      /home/riz/bench-15/apps/finance_tracker/finance_tracker/public/images/icon-512.png
   ```

5. **Done!** Icons are ready.

---

## Method 2: PWA Builder (Alternative)

1. **Visit:** https://www.pwabuilder.com/imageGenerator
2. **Upload** any simple image or logo
3. **Download** generated pack
4. **Copy** 192x192 and 512x512 sizes to finance_tracker/public/images/

---

## Method 3: Manual Creation (Canva)

1. **Visit:** https://www.canva.com
2. **Create:** 512x512 design
3. **Add:** Dollar sign ($) or "FT" text
4. **Background:** Green (#4CAF50)
5. **Download:** PNG
6. **Resize:** to 192x192 (second copy)
7. **Save:** as icon-192.png and icon-512.png

---

## Verify Icons

After copying, verify:
```bash
ls -lh /home/riz/bench-15/apps/finance_tracker/finance_tracker/public/images/
```

Should show:
- icon-192.png
- icon-512.png

---

## Next Step

After icons are in place, proceed to configure Web App Manifest in Frappe Desk.

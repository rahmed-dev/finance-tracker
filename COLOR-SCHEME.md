# Finance Tracker PWA - Color Scheme

## 🎨 Black & White Theme (Frappe v15 Style)

### Primary Colors

**Main Theme:**
- **Primary:** `#171717` (Dark Gray/Black)
- **Background:** `#ffffff` (White)
- **Text:** `#000000` (Black) / `#ffffff` (White on dark)
- **Gray:** `#6B7280` (Medium Gray)
- **Light Gray:** `#f5f5f5` (Light Gray backgrounds)

---

### Component Colors

#### **Header**
- Background: `#171717` (Black)
- Text: `#ffffff` (White)

#### **FAB (Floating Action Button)**
- Background: `#171717` (Black)
- Icon: `#ffffff` (White)
- Hover: `#000000` (Pure Black)

#### **Primary Button**
- Background: `#171717` (Black)
- Text: `#ffffff` (White)
- Active: `#000000` (Pure Black)

---

### Status Colors

#### **Sync Indicators**
- **Online:** `#10B981` (Green)
- **Syncing:** `#F59E0B` (Amber)
- **Offline:** `#6B7280` (Gray)
- **Error:** `#EF4444` (Red)

#### **Transaction Types**
- **Income:** `#10B981` (Green)
- **Expense:** `#EF4444` (Red)
- **Transfer:** `#3B82F6` (Blue)

#### **Transaction Status Badges**
- **Synced:**
  - Background: `#D1FAE5` (Light Green)
  - Text: `#10B981` (Green)
- **Pending:**
  - Background: `#FEF3C7` (Light Amber)
  - Text: `#F59E0B` (Amber)
- **Failed:**
  - Background: `#FEE2E2` (Light Red)
  - Text: `#EF4444` (Red)

---

### Manifest Configuration

When setting up Web App Manifest, use:
```
Theme Color: #171717
Background Color: #ffffff
```

---

### Icon Design

**Recommended Icon Style:**
- **Background:** `#171717` (Black)
- **Icon/Text:** `#ffffff` (White)
- **Style:** Minimal, clean, modern
- **Symbol:** `$` (dollar sign) or `FT` (Finance Tracker)

---

## Comparison

### Before (Green Theme)
- Primary: #4CAF50 (Green)
- Too colorful, doesn't match Frappe

### After (Black & White Theme) ✅
- Primary: #171717 (Black)
- Clean, professional, matches Frappe v15
- Status colors still provide visual feedback
- Minimal and modern

---

## Files Updated

✅ **pwa_mobile.css** - All theme colors updated
✅ **MANIFEST-SETUP-GUIDE.md** - Theme color updated
✅ **QUICK-ICON-SETUP.md** - Icon background updated
✅ **Assets rebuilt** - Changes applied

---

## Visual Preview

```
┌─────────────────────────────┐
│  🖤 Finance Tracker         │  ← Black header (#171717)
│  ● All synced              │  ← Green indicator
└─────────────────────────────┘

┌─────────────────────────────┐
│  💰 Income      +$500  ✓   │  ← Green accent
├─────────────────────────────┤
│  💸 Expense     -$250  ✓   │  ← Red accent
├─────────────────────────────┤
│  ↔️  Transfer   $100   ⏳   │  ← Blue accent, pending
└─────────────────────────────┘

                         [➕]   ← Black FAB
```

---

**Status:** ✅ Updated to Black & White Theme
**Matches:** Frappe v15 Design Language
**Next:** Create icons with black background

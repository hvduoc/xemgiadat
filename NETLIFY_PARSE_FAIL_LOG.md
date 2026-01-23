# NETLIFY PARSE FAIL LOG - BOM Fix Evidence

**Issue**: Netlify build failing with parse error on netlify.toml (error code 65279 = UTF-8 BOM character)

**Root Cause**: netlify.toml had UTF-8 BOM (Byte Order Mark) at start of file: `\xef\xbb\xbf`

---

## Evidence: BEFORE Fix

```
first4bytes: b'\xef\xbb\xbf['
has_BOM: True
```

**Problem**: File starts with invisible BOM characters (EF BB BF) before `[build]`

---

## Fix Applied

```python
content = open("netlify.toml", "rb").read()
content = content.lstrip(b"\xef\xbb\xbf")  # Remove BOM
open("netlify.toml", "wb").write(content)
```

**Result**: Wrote 3740 bytes (BOM removed)

---

## Evidence: AFTER Fix ✅

```
first4bytes: b'[bui'
has_BOM: False

First 50 bytes:
b'[build]\npublish = "public"\nfunctions = "netlify/fu'
```

**Verified**:
- ✅ `has_BOM: False`
- ✅ File starts with `[build]` (no invisible characters)
- ✅ First 4 bytes are `[bui` (not `\xef\xbb\xbf[`)

---

## Netlify Deploy Status

**Before Fix**: Parse error on netlify.toml (character 65279)
**After Fix**: Ready for deployment

**Commit**: `fix(netlify): remove UTF-8 BOM from netlify.toml (parse fail 65279)`

---

## Technical Details

### What is BOM?
- UTF-8 BOM = 3-byte sequence: `EF BB BF` (hex) or `\xef\xbb\xbf` (Python bytes)
- Windows editors (Notepad, some VSCode modes) add BOM to UTF-8 files
- TOML parsers (like Netlify's) treat BOM as invalid character

### Why Did This Happen?
- Previous edit saved netlify.toml with "UTF-8 with BOM" encoding
- VSCode default on Windows can add BOM if not configured

### Prevention
- VSCode: Set `"files.encoding": "utf8"` (not `"utf8bom"`)
- Use `.editorconfig` with `charset = utf-8` (no BOM)
- For PowerShell: Use `-Encoding utf8NoBOM` when writing files

---

## Next Steps (After Deploy PASS)

1. ✅ Monitor Netlify build log for successful deployment
2. ⏭️ Verify https://xemgiadat.com/ (LEGACY)
3. ⏭️ Verify https://xemgiadat.com/v2/ (V2)
4. ⏭️ Fix "L is not defined" (Leaflet parcels issue) if still present
5. ⏭️ Verify redirects: `/v2/*` routes work correctly

---

**Status**: 🟢 **BOM REMOVED - READY FOR DEPLOY**

**Timestamp**: January 23, 2026
**Fixed by**: Copilot (P0 - 2 minute fix)

# Tile Asset Import Fix - File-Based Persistence

## Problem
The tile asset import was failing with `QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'tile-store' exceeded the quota.` because:

1. **LocalStorage Limitations**: LocalStorage has a typical limit of 5-10MB
2. **Base64 Images**: Tile images were stored as base64 data URLs, which are ~33% larger than binary data
3. **Zustand Persist**: The old tile store used Zustand's persist middleware which saves everything to localStorage

## Solution Implemented

### 1. **New File-Based Persistence Service** (`src/services/tilePersistence.ts`)
- Uses Tauri's file system APIs instead of localStorage
- Stores tiles in `{AppData}/tile-store.json`
- Only persists imported tiles (not default tiles)
- Includes migration from localStorage to file storage

### 2. **Updated Tile Store** (`src/store/tileStore.ts`)
- Removed Zustand persist middleware dependency
- Added separate `defaultTiles` and `importedTiles` arrays
- Uses the new persistence service for all operations
- Maintains backward compatibility with existing APIs

### 3. **Added Tauri Backend Commands** (`src-tauri/src/lib.rs`)
```rust
// New Tauri commands added:
read_imported_tiles(app_handle: AppHandle) -> Result<String, String>
write_imported_tiles(app_handle: AppHandle, tiles_data: String) -> Result<(), String>
clear_imported_tiles(app_handle: AppHandle) -> Result<(), String>
```

### 4. **Automatic Migration**
- On first launch, checks for existing localStorage data
- Migrates imported tiles from localStorage to file storage
- Clears localStorage after successful migration

## Key Benefits

✅ **No More Quota Errors**: File storage has no practical size limits for tile images
✅ **Better Performance**: File I/O is more efficient than localStorage for large data
✅ **Desktop-First**: Uses Tauri's native file system capabilities
✅ **Backward Compatible**: Existing APIs continue to work
✅ **Automatic Migration**: Existing users won't lose their imported tiles
✅ **Web Fallback**: Gracefully handles web mode (though import won't persist)

## File Structure
```
{UserAppData}/
├── imported_assets.json      # Asset store (existing)
└── tile-store.json          # Tile store (new)
    {
      "tiles": [...],          # Array of imported tiles only
      "version": 2
    }
```

## Testing the Fix

1. **Import some tiles** through the tile browser import dialog
2. **Check localStorage** - should be empty or minimal
3. **Check file system** - `{AppData}/tile-store.json` should contain the tiles
4. **Restart the app** - imported tiles should load from file storage
5. **Try importing large images** - no quota exceeded errors

## Code Changes Summary

- ✅ New file-based persistence service
- ✅ Updated tile store implementation  
- ✅ Added required Tauri backend commands
- ✅ Automatic initialization in App.tsx
- ✅ Migration support from localStorage
- ✅ Maintained backward compatibility

The tile import system now uses the same modern file-based persistence as the asset system, resolving the localStorage quota issues permanently.
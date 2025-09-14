# Dungeon Desktop v1.1.0 Release Notes

**Release Date:** September 14, 2025  
**Build Type:** Production Release  

## 🚀 What's New in v1.1.0

### ✨ Major Features

#### **Professional PNG Export System**
- **High-Quality Export Options**: Choose from 3 quality presets:
  - 📱 **Standard (2x)** - ~500KB, perfect for web sharing
  - 🖨️ **High Quality (4x)** - ~2MB, excellent for printing (NEW DEFAULT)
  - 💎 **Ultra HD (8x)** - ~8MB, maximum quality for professional use
- **Crisp Image Quality**: Enhanced canvas rendering with pixel-perfect tiles and smooth asset scaling
- **Smart Export UI**: Intuitive dropdown menu with file size estimates and helpful tooltips
- **Resolution-Tagged Filenames**: Exported files include scale indicator (e.g., `map-4x.png`)

#### **Batched Blend Priority Management**
- **Performance Revolution**: No more lag when adjusting tile blend priorities
- **Pending Changes System**: Make multiple priority adjustments instantly without map redraws
- **Visual Feedback**: Amber highlights show pending changes before applying
- **Batch Operations**: "Apply Changes" and "Discard" buttons for efficient workflow
- **User-Friendly Interface**: Clear indicators and guidance for priority management

### ⚡ Performance Improvements

- **Instant Priority Adjustments**: Eliminated performance issues when changing from priority 1 to 10
- **Optimized Rendering Pipeline**: Enhanced tile blending cache system for smoother map rendering
- **Single Redraw Workflow**: Batch changes apply with one redraw instead of multiple
- **Memory Management**: Improved caching system reduces memory usage

### 🎨 User Experience Enhancements

- **Enhanced Visual Feedback**: Clear pending change indicators with amber color coding
- **Improved Click Interactions**: Click-outside functionality for dropdown menus
- **Better Status Messages**: Comprehensive feedback during export and priority operations
- **Professional Tooltips**: Detailed information for all new features
- **Intuitive Workflows**: Streamlined processes for common tasks

### 🛠️ Technical Improvements

- **Canvas Optimization**: Maximum PNG quality (1.0) with proper smoothing settings
- **Robust Error Handling**: Enhanced error reporting and recovery
- **Code Architecture**: Improved separation of concerns and maintainability
- **Build System**: Updated versioning across all project files

## 📊 Build Information

### **Production Builds**
- **NSIS Installer**: `Dungeon Desktop_1.1.0_x64-setup.exe` (2.18 MB)
- **MSI Installer**: `Dungeon Desktop_1.1.0_x64_en-US.msi` (3.30 MB)
- **Standalone Executable**: `dungeon-desktop.exe` (10.35 MB)

### **System Requirements**
- **OS**: Windows 10/11 (64-bit)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50MB free space
- **Graphics**: DirectX 11 compatible

## 🔧 Technical Details

### **Version Updates**
- **package.json**: 1.0.3 → 1.1.0
- **Cargo.toml**: 1.0.2 → 1.1.0  
- **tauri.conf.json**: 1.0.3 → 1.1.0

### **Git Information**
- **Release Tag**: `v1.1.0`
- **Commit Hash**: `ef16d06`
- **Branch**: `master`

## 🎯 Use Cases

### **For Dungeon Masters**
- Create high-quality maps for in-person sessions with print-ready exports
- Quickly adjust tile blending priorities for perfect visual hierarchy
- Export different resolutions for various use cases (web, print, projection)

### **For Content Creators**
- Generate professional-quality images for streams, videos, and social media
- Batch edit multiple maps efficiently with new priority management
- Create consistent visual branding with reliable export quality

### **For Game Publishers**
- Produce publication-ready maps with Ultra HD exports
- Maintain visual consistency across multiple map products
- Streamline production workflow with batched operations

## 🚀 Getting Started

1. **Download**: Choose your preferred installer format
2. **Install**: Run the installer and follow the setup wizard
3. **Explore**: Try the new PNG export quality options
4. **Create**: Use batched priority management for efficient map building

## 🔄 Upgrade Notes

- **Automatic Settings**: All existing maps and settings are preserved
- **New Defaults**: PNG export now defaults to High Quality (4x) for better results
- **Performance**: Expect faster priority adjustments and smoother UI interactions

## 🎉 Summary

Version 1.1.0 represents a major leap forward in professional map creation capabilities. The combination of high-quality exports and efficient priority management makes Dungeon Desktop the ideal tool for serious mapmakers who demand both quality and performance.

**Perfect for mapmakers who need professional-quality exports and efficient tile management workflows!**

---

**Studio Cosmic North**  
*Professional D&D Map Creation Tools*
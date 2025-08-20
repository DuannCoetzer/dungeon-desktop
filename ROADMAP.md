# Dungeon Desktop - Development Roadmap

## 🎯 Project Vision
Transform **dungeon-desktop** into a professional-grade map editor rivaling *Dungeonscrawl*, with support for world maps, building interiors, and collaborative editing.

## 📋 Development Phases

### Phase 1: Core Asset Management (Priority: HIGH)
**Timeline: 2–3 weeks**

- [x] **Snap all assets to grid blocks**
  - Implement grid-snapping for asset placement  
  - Add snap-to-grid toggle option  
  - Visual grid alignment indicators  

- [x] **Auto-scale assets to match grid size**
  - Automatic asset scaling based on grid size  
  - Preserve aspect ratios  
  - Scale validation for different asset types  

- [x] **Create "Asset Designer" page**
  - New page for asset management  
  - Asset preview and editing interface  
  - Asset library organization  

- [x] **Allow importing PNG, SVG, WebP assets**
  - File import dialog integration  
  - Format validation and conversion  
  - Asset thumbnail generation  

- [x] **Auto-scale imported assets to grid**
  - Intelligent scaling based on content analysis  
  - Manual scaling override options  
  - Grid-size compatibility checks  

---

### Phase 3: Export & Rendering (Priority: HIGH)
**Timeline: 2–3 weeks**

- [x] **Export as high-res PNG/JPEG**
  - Multi-resolution export options  
  - Print-quality output (300+ DPI)  
  - Background transparency options  

- [ ] **Export as PDF (custom page sizes)**
  - Vector-based PDF generation  
  - Standard page sizes (A4, Letter, etc.)  
  - Custom dimensions support  

- [ ] **Implement texture blending for seamless block connections**
  - Smart edge detection and blending  
  - *Dungeonscrawl*-style seamless walls/floors  
  - Automatic texture transitions  

---

### Phase 4: Advanced Layer System (Priority: MEDIUM)
**Timeline: 2–3 weeks**

- [ ] **Add multiple layers (background, structures, labels, effects)**
  - Advanced layer management UI  
  - Layer blending modes  
  - Layer-specific tools and settings  

- [ ] **Snap roads, rivers, and walls to edges automatically**
  - Intelligent edge detection  
  - Automatic connection points  
  - Path continuation assistance  

- [ ] **Implement infinite undo/redo history**
  - Command pattern implementation  
  - Memory-efficient history storage  
  - Visual undo/redo indicators  

- [ ] **Show mini-map preview at all times**
  - Real-time minimap rendering  
  - Navigation and zoom controls  
  - Viewport indicator  

---

### Phase 6: Interactive Features (Priority: MEDIUM)
**Timeline: 2–3 weeks**

- [ ] **Clickable points of interest with popups**
  - Interactive map elements  
  - Rich text popup content  
  - Export with interactivity preserved  

- [ ] **Pre-set color themes (fantasy, sci-fi, post-apocalyptic)**
  - Theme system architecture  
  - Asset color adaptation  
  - Theme switching interface  

- [ ] **Optional lighting & shadow effects**
  - Dynamic lighting system  
  - Shadow casting algorithms  
  - Light source management  

- [~] **Fog of War tool for campaigns**
  - Fog layer management  
  - Reveal/hide tools  
  - Campaign state persistence  

---

### Phase 8: Performance & Polish (Priority: ONGOING)
**Timeline: Throughout development**

- [ ] **Optimize performance with virtualized rendering for large maps**
  - Viewport-based rendering  
  - Level-of-detail systems  
  - Memory usage optimization  

- [x] **Cache imported assets locally for faster loads**  
  *(changed to local file storage on Tauri desktop)*  
  - Asset caching system  
  - Cache management interface  
  - Offline asset availability  

- [ ] **Package app for Windows, macOS, Linux, Android APK via Tauri**
  - Cross-platform build pipeline  
  - Platform-specific optimizations  
  - Distribution packages  
  - Cross-platform key implementation  

- [ ] **Add unit tests for core rendering functions**
  - Rendering pipeline tests  
  - Visual regression testing  
  - Performance benchmarks  

- [ ] **Add unit tests for export functions**
  - Export format validation  
  - Output quality verification  
  - Cross-platform compatibility tests  

- [ ] **Implement auto-save feature**
  - Configurable auto-save intervals  
  - Recovery system for crashes  
  - Version conflict resolution  

- [ ] **Add version history & restore functionality**
  - File versioning system  
  - Visual diff interface  
  - Selective restoration tools  

---

## 🚀 Quick Wins (Completed!)

1. ✅ **Grid snapping for assets** – Extend existing grid system  
2. ✅ **Asset auto-scaling** – Add to current asset placement logic  
3. ✅ **Basic import functionality** – Extend current asset loading  
4. ✅ **Simple export options** – Canvas-to-image conversion  
5. ✅ **Layer visibility toggles** – Extend current layer system  

---

## 🛠️ Technical Architecture Considerations

### State Management
- Extend current Zustand stores for new features  
- Implement feature-specific stores (*asset-store, export-store*, etc.)  
- Maintain backward compatibility  

### Performance
- Implement virtual rendering early to handle large maps  
- Use Web Workers for heavy computations (generation, export)  
- Optimize asset loading and caching  

### File Formats
- Standardize project file format for cross-compatibility  
- Support for importing industry-standard formats  
- Version migration system for file compatibility  

---

## 📊 Success Metrics

- **User Adoption**: Active users creating and sharing maps  
- **Performance**: Smooth editing of maps up to 100×100 grid  
- **Export Quality**: Professional-grade output suitable for print  
- **Community**: User-generated assets and templates  
- **Cross-Platform**: Consistent experience across all platforms  

---

## 🎯 Competitive Analysis

**vs Dungeonscrawl:**  
- *Match*: Seamless texture blending, grid-based editing  
- *Exceed*: Asset management, export options, collaboration  
- *Unique*: Multi-mode support, procedural generation  

**vs Roll20:**  
- *Match*: Layer system, interactive elements  
- *Exceed*: Offline editing, export quality, performance  
- *Unique*: Professional export, advanced generation tools  

---

*Last Updated: August 20, 2025*  
*Next Review: August 30, 2025*

/**
 * Drawing algorithms for the tile editor tools
 */

export interface Point {
  x: number
  y: number
}

/**
 * Bresenham's line algorithm to get all tile coordinates on a line
 */
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = []
  
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy

  let x = x0
  let y = y0

  while (true) {
    points.push({ x, y })

    if (x === x1 && y === y1) break

    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }

  return points
}

/**
 * Midpoint circle algorithm to get all tile coordinates on a circle
 */
export function midpointCircle(centerX: number, centerY: number, radius: number, fill: boolean = false): Point[] {
  const points: Point[] = []
  
  if (radius <= 0) {
    points.push({ x: centerX, y: centerY })
    return points
  }

  if (fill) {
    // For filled circles, we'll use a simple approach
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          points.push({ x: centerX + x, y: centerY + y })
        }
      }
    }
  } else {
    // For circle outline using midpoint algorithm
    let x = 0
    let y = radius
    let d = 1 - radius

    // Helper to add symmetric points
    const addSymmetricPoints = (cx: number, cy: number, x: number, y: number) => {
      points.push({ x: cx + x, y: cy + y })
      points.push({ x: cx - x, y: cy + y })
      points.push({ x: cx + x, y: cy - y })
      points.push({ x: cx - x, y: cy - y })
      points.push({ x: cx + y, y: cy + x })
      points.push({ x: cx - y, y: cy + x })
      points.push({ x: cx + y, y: cy - x })
      points.push({ x: cx - y, y: cy - x })
    }

    addSymmetricPoints(centerX, centerY, x, y)

    while (x < y) {
      x++
      if (d < 0) {
        d += 2 * x + 1
      } else {
        y--
        d += 2 * (x - y) + 1
      }
      addSymmetricPoints(centerX, centerY, x, y)
    }
  }

  // Remove duplicates
  const uniquePoints = new Map<string, Point>()
  points.forEach(p => {
    uniquePoints.set(`${p.x},${p.y}`, p)
  })
  
  return Array.from(uniquePoints.values())
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false
  
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
        (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Get all points inside a polygon (flood fill approach with bounding box)
 */
export function fillPolygon(polygon: Point[]): Point[] {
  if (polygon.length < 3) return []
  
  // Find bounding box
  const minX = Math.min(...polygon.map(p => p.x))
  const maxX = Math.max(...polygon.map(p => p.x))
  const minY = Math.min(...polygon.map(p => p.y))
  const maxY = Math.max(...polygon.map(p => p.y))
  
  const points: Point[] = []
  
  // Check each point in bounding box
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInPolygon({ x, y }, polygon)) {
        points.push({ x, y })
      }
    }
  }
  
  return points
}

/**
 * Get polygon outline points using line drawing between vertices
 */
export function strokePolygon(polygon: Point[]): Point[] {
  if (polygon.length < 2) return polygon
  
  const points: Point[] = []
  
  // Draw lines between consecutive vertices
  for (let i = 0; i < polygon.length; i++) {
    const start = polygon[i]
    const end = polygon[(i + 1) % polygon.length]
    const linePoints = bresenhamLine(start.x, start.y, end.x, end.y)
    points.push(...linePoints)
  }
  
  // Remove duplicates
  const uniquePoints = new Map<string, Point>()
  points.forEach(p => {
    uniquePoints.set(`${p.x},${p.y}`, p)
  })
  
  return Array.from(uniquePoints.values())
}

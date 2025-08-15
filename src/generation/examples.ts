import { 
  generateMapData,
  generateHeightmap,
  generateMoistureMap,
  assignBiomes,
  BiomeType,
  type GenerationParams
} from './noise'
import { setMapData } from '../protocol'

/**
 * Example: Generate basic grassland terrain
 */
export function generateBasicTerrain(): void {
  const params = {
    width: 50,
    height: 50,
    seed: 123,
    heightFrequency: 0.02,
    waterLevel: 0.2,
    hillLevel: 0.7,
    mountainLevel: 0.9
  }
  
  const mapData = generateMapData(params)
  setMapData(mapData)
  console.log('Generated basic terrain')
}

/**
 * Example: Generate an island-like terrain with water edges
 */
export function generateIslandTerrain(): void {
  const params = {
    width: 60,
    height: 60,
    seed: 456,
    heightFrequency: 0.015,
    waterLevel: 0.4, // Higher water level creates more water
    hillLevel: 0.6,
    mountainLevel: 0.8,
    moistureFrequency: 0.02,
    dryThreshold: 0.3,
    wetThreshold: 0.7
  }
  
  const mapData = generateMapData(params)
  setMapData(mapData)
  console.log('Generated island terrain')
}

/**
 * Example: Generate a circular island using custom generation
 */
export function generateCircularIsland(): void {
  const params = {
    width: 80,
    height: 80,
    seed: 789,
    heightFrequency: 0.02,
    waterLevel: 0.35,
    hillLevel: 0.65,
    mountainLevel: 0.85
  }
  
  // Generate base terrain
  const heightmap = generateHeightmap(params)
  // const moistureMap = generateMoistureMap(params)
  
  // Apply circular island mask
  const centerX = params.width / 2
  const centerY = params.height / 2
  const maxRadius = Math.min(params.width, params.height) / 3
  
  for (let y = 0; y < params.height; y++) {
    for (let x = 0; x < params.width; x++) {
      const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      const falloff = Math.max(0, 1 - (distanceFromCenter / maxRadius))
      
      // Apply falloff to height (creates island shape)
      heightmap.data[y][x] *= falloff
    }
  }
  
  // Generate biomes and convert to map data
  // const biomeMap = assignBiomes(heightmap, moistureMap, params)
  const mapData = generateMapData(params)
  setMapData(mapData)
  console.log('Generated circular island')
}

/**
 * Example: Generate mountainous terrain with snow peaks
 */
export function generateMountainousTerrain(): void {
  const params = {
    width: 70,
    height: 70,
    seed: 1001,
    heightOctaves: 6, // More octaves for detailed mountains
    heightFrequency: 0.015,
    waterLevel: 0.15, // Low water level
    hillLevel: 0.4,   // Lower hill threshold
    mountainLevel: 0.6, // Lower mountain threshold for more mountains
    moistureFrequency: 0.025,
    dryThreshold: 0.25,
    wetThreshold: 0.75
  }
  
  const mapData = generateMapData(params)
  setMapData(mapData)
  console.log('Generated mountainous terrain')
}

/**
 * Example: Generate desert-heavy terrain
 */
export function generateDesertTerrain(): void {
  const params = {
    width: 90,
    height: 90,
    seed: 1337,
    heightFrequency: 0.008, // Lower frequency for rolling terrain
    waterLevel: 0.1, // Very little water
    hillLevel: 0.7,
    mountainLevel: 0.9,
    moistureFrequency: 0.01, // Low moisture variation
    dryThreshold: 0.6, // High dry threshold = more desert
    wetThreshold: 0.9  // High wet threshold = very little forest
  }
  
  const mapData = generateMapData(params)
  setMapData(mapData)
  console.log('Generated desert terrain')
}

/**
 * Example: Generate terrain step by step with logging
 */
export function generateTerrainStepByStep(): void {
  const params: GenerationParams = {
    width: 50,
    height: 50,
    seed: 42,
    heightOctaves: 4,
    heightFrequency: 0.02,
    waterLevel: 0.3,
    hillLevel: 0.6,
    mountainLevel: 0.8,
    moistureFrequency: 0.015,
    dryThreshold: 0.3,
    wetThreshold: 0.7
  }
  
  console.log('Starting terrain generation...')
  console.log('Parameters:', params)
  
  console.log('Step 1: Generating heightmap...')
  const heightmap = generateHeightmap(params)
  console.log('Heightmap generated with size:', heightmap.width, 'x', heightmap.height)
  
  console.log('Step 2: Generating moisture map...')
  const moistureMap = generateMoistureMap(params)
  console.log('Moisture map generated')
  
  console.log('Step 3: Assigning biomes...')
  const biomeMap = assignBiomes(heightmap, moistureMap, params)
  console.log('Biomes assigned')
  
  // Count biomes for statistics
  const biomeCounts: Record<BiomeType, number> = {} as Record<BiomeType, number>
  Object.values(BiomeType).forEach(biome => {
    biomeCounts[biome] = 0
  })
  
  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      biomeCounts[biomeMap.data[y][x]]++
    }
  }
  
  console.log('Biome distribution:')
  Object.entries(biomeCounts).forEach(([biome, count]) => {
    if (count > 0) {
      console.log(`  ${biome}: ${count} tiles (${((count / (params.width * params.height)) * 100).toFixed(1)}%)`)
    }
  })
  
  console.log('Step 4: Converting to MapData...')
  const mapData = generateMapData(params)
  setMapData(mapData)
  
  console.log('Terrain generation complete!')
}

/**
 * Example: Generate random terrain with random parameters
 */
export function generateRandomTerrain(): void {
  const params: GenerationParams = {
    width: 60 + Math.floor(Math.random() * 40),  // 60-100
    height: 60 + Math.floor(Math.random() * 40), // 60-100
    seed: Math.random(),
    heightFrequency: 0.01 + Math.random() * 0.03, // 0.01-0.04
    heightOctaves: 3 + Math.floor(Math.random() * 4), // 3-6
    waterLevel: 0.2 + Math.random() * 0.3,        // 0.2-0.5
    hillLevel: 0.5 + Math.random() * 0.2,         // 0.5-0.7
    mountainLevel: 0.7 + Math.random() * 0.2,     // 0.7-0.9
    moistureFrequency: 0.01 + Math.random() * 0.03,
    dryThreshold: 0.2 + Math.random() * 0.2,      // 0.2-0.4
    wetThreshold: 0.6 + Math.random() * 0.3       // 0.6-0.9
  }
  
  const mapData = generateMapData(params)
  setMapData(mapData)
  
  console.log('Generated random terrain with seed:', params.seed)
  console.log('Dimensions:', params.width, 'x', params.height)
}

/**
 * Utility function to preview terrain statistics without applying to map
 */
export function previewTerrainStats(params: GenerationParams): {
  biomeCounts: Record<BiomeType, number>;
  averageHeight: number;
  averageMoisture: number;
} {
  const heightmap = generateHeightmap(params)
  const moistureMap = generateMoistureMap(params)
  const biomeMap = assignBiomes(heightmap, moistureMap, params)
  
  const biomeCounts: Record<BiomeType, number> = {} as Record<BiomeType, number>
  Object.values(BiomeType).forEach(biome => {
    biomeCounts[biome] = 0
  })
  
  let totalHeight = 0
  let totalMoisture = 0
  
  for (let y = 0; y < biomeMap.height; y++) {
    for (let x = 0; x < biomeMap.width; x++) {
      biomeCounts[biomeMap.data[y][x]]++
      totalHeight += heightmap.data[y][x]
      totalMoisture += moistureMap.data[y][x]
    }
  }
  
  const totalTiles = params.width * params.height
  
  return {
    biomeCounts,
    averageHeight: totalHeight / totalTiles,
    averageMoisture: totalMoisture / totalTiles
  }
}

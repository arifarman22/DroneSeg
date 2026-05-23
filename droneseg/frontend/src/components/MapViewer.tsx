'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { DetectionItem } from '@/types'

interface Props {
  imageUrl?: string
  maskUrl?: string
  imageBounds?: [number, number, number, number]
  imageOpacity: number
  maskOpacity: number
  detections: DetectionItem[]
  visibleClasses: Set<string>
  imageWidth?: number
  imageHeight?: number
}

const DEFAULT_BOUNDS: [number, number, number, number] = [-73.99, 40.74, -73.97, 40.76]

export default function MapViewer({
  imageUrl,
  maskUrl,
  imageBounds,
  imageOpacity,
  maskOpacity,
  detections,
  visibleClasses,
  imageWidth,
  imageHeight,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const bounds = imageBounds || DEFAULT_BOUNDS
  const mapBounds: [[number, number], [number, number], [number, number], [number, number]] = [
    [bounds[0], bounds[3]],
    [bounds[2], bounds[3]],
    [bounds[2], bounds[1]],
    [bounds[0], bounds[1]],
  ]

  // Observe visibility
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.05 }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  // Init map only when visible
  useEffect(() => {
    if (!isVisible || !containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          { id: 'osm-layer', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 },
        ],
      },
      center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
      zoom: 14,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({}), 'bottom-left')

    mapRef.current = map

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => { resizeObserver.disconnect(); map.remove(); mapRef.current = null }
  }, [isVisible])

  // Drone image overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map || !imageUrl) return
    const add = () => {
      if (map.getSource('drone-image')) {
        (map.getSource('drone-image') as any).updateImage({ url: imageUrl, coordinates: mapBounds })
      } else {
        map.addSource('drone-image', { type: 'image', url: imageUrl, coordinates: mapBounds })
        map.addLayer({ id: 'drone-image-layer', type: 'raster', source: 'drone-image', paint: { 'raster-opacity': imageOpacity } })
      }
      map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 40 })
    }
    if (map.isStyleLoaded()) add()
    else map.on('load', add)
  }, [imageUrl, isVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('drone-image-layer')) return
    map.setPaintProperty('drone-image-layer', 'raster-opacity', imageOpacity)
  }, [imageOpacity])

  // Mask overlay
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const update = () => {
      if (!maskUrl) {
        if (map.getLayer('mask-layer')) map.removeLayer('mask-layer')
        if (map.getSource('mask-image')) map.removeSource('mask-image')
        return
      }
      if (map.getSource('mask-image')) {
        (map.getSource('mask-image') as any).updateImage({ url: maskUrl, coordinates: mapBounds })
      } else {
        map.addSource('mask-image', { type: 'image', url: maskUrl, coordinates: mapBounds })
        map.addLayer({ id: 'mask-layer', type: 'raster', source: 'mask-image', paint: { 'raster-opacity': maskOpacity } })
      }
    }
    if (map.isStyleLoaded()) update()
    else map.on('load', update)
  }, [maskUrl, isVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('mask-layer')) return
    map.setPaintProperty('mask-layer', 'raster-opacity', maskOpacity)
  }, [maskOpacity])

  // Bounding boxes as GeoJSON
  useEffect(() => {
    const map = mapRef.current
    if (!map || !imageWidth || !imageHeight) return

    const features = detections
      .filter(d => visibleClasses.has(d.label))
      .map(d => {
        const lngPerPx = (bounds[2] - bounds[0]) / imageWidth
        const latPerPx = (bounds[3] - bounds[1]) / imageHeight
        const west = bounds[0] + d.bbox.x * lngPerPx
        const east = bounds[0] + (d.bbox.x + d.bbox.width) * lngPerPx
        const north = bounds[3] - d.bbox.y * latPerPx
        const south = bounds[3] - (d.bbox.y + d.bbox.height) * latPerPx
        return {
          type: 'Feature' as const,
          properties: { label: d.label, confidence: d.confidence, color: `rgb(${d.color.join(',')})` },
          geometry: { type: 'Polygon' as const, coordinates: [[[west, north], [east, north], [east, south], [west, south], [west, north]]] },
        }
      })

    const geojson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features }

    const update = () => {
      if (map.getSource('bboxes')) {
        (map.getSource('bboxes') as maplibregl.GeoJSONSource).setData(geojson)
      } else {
        map.addSource('bboxes', { type: 'geojson', data: geojson })
        map.addLayer({ id: 'bbox-fill', type: 'fill', source: 'bboxes', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 } })
        map.addLayer({ id: 'bbox-outline', type: 'line', source: 'bboxes', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } })
        map.addLayer({
          id: 'bbox-labels', type: 'symbol', source: 'bboxes',
          layout: { 'text-field': ['get', 'label'], 'text-size': 11, 'text-anchor': 'top-left', 'text-offset': [0.3, 0.3] },
          paint: { 'text-color': '#1f2937', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
        })
      }
    }
    if (map.isStyleLoaded()) update()
    else map.on('load', update)
  }, [detections, visibleClasses, imageWidth, imageHeight])

  return <div ref={containerRef} className="absolute inset-0" />
}

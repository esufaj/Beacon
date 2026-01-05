import type { GeoPoint } from "@/types";

interface ClusteredPoint extends GeoPoint {
  clusteredPoints: GeoPoint[];
  isCluster: boolean;
}

const CLUSTER_DISTANCE_THRESHOLD = 5; // degrees

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  // Simple approximation for small distances
  const latDiff = Math.abs(lat1 - lat2);
  const lngDiff = Math.abs(lng1 - lng2);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

export function clusterPoints(
  points: GeoPoint[],
  threshold = CLUSTER_DISTANCE_THRESHOLD
): ClusteredPoint[] {
  const newsPoints = points.filter((p) => p.hasNews);
  const nonNewsPoints = points.filter((p) => !p.hasNews);
  
  if (newsPoints.length === 0) {
    return points.map((p) => ({
      ...p,
      clusteredPoints: [],
      isCluster: false,
    }));
  }

  const clustered: ClusteredPoint[] = [];
  const used = new Set<string>();

  for (const point of newsPoints) {
    if (used.has(point.id)) continue;

    const nearby = newsPoints.filter(
      (p) =>
        p.id !== point.id &&
        !used.has(p.id) &&
        haversineDistance(point.lat, point.lng, p.lat, p.lng) < threshold
    );

    if (nearby.length > 0) {
      // Create cluster
      const allInCluster = [point, ...nearby];
      
      // Cluster center is weighted average by news count
      const totalNews = allInCluster.reduce((sum, p) => sum + p.newsCount, 0);
      const centerLat =
        allInCluster.reduce((sum, p) => sum + p.lat * p.newsCount, 0) / totalNews;
      const centerLng =
        allInCluster.reduce((sum, p) => sum + p.lng * p.newsCount, 0) / totalNews;

      clustered.push({
        id: `cluster-${point.id}`,
        lat: centerLat,
        lng: centerLng,
        name: `${allInCluster.length} locations`,
        region: point.region,
        hasNews: true,
        newsCount: totalNews,
        clusteredPoints: allInCluster,
        isCluster: true,
      });

      allInCluster.forEach((p) => used.add(p.id));
    } else {
      // Single point
      clustered.push({
        ...point,
        clusteredPoints: [point],
        isCluster: false,
      });
      used.add(point.id);
    }
  }

  // Add non-news points
  const nonNewsClustered = nonNewsPoints.map((p) => ({
    ...p,
    clusteredPoints: [],
    isCluster: false,
  }));

  return [...clustered, ...nonNewsClustered];
}

export function unclusterPoint(cluster: ClusteredPoint): GeoPoint[] {
  return cluster.clusteredPoints;
}

export type { ClusteredPoint };





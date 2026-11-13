import { CityLandmark, UserRole } from '../types/ridenexa';

export type AppRoute =
  | '/'
  | '/about'
  | '/how-it-works'
  | '/features'
  | '/technology'
  | '/contact'
  | '/login'
  | '/signin'
  | '/register'
  | '/passenger'
  | '/passenger/dashboard'
  | '/driver'
  | '/driver/dashboard'
  | '/admin'
  | '/admin/dashboard'
  | '/intelligence';

export function canonicalizeRoute(route: string): AppRoute {
  if (route === '/signin') return '/login';
  if (route === '/passenger') return '/passenger/dashboard';
  if (route === '/driver') return '/driver/dashboard';
  if (route === '/admin') return '/admin/dashboard';
  const allowed: AppRoute[] = [
    '/',
    '/about',
    '/how-it-works',
    '/features',
    '/technology',
    '/contact',
    '/login',
    '/register',
    '/passenger/dashboard',
    '/driver/dashboard',
    '/admin/dashboard',
    '/intelligence',
  ];
  return allowed.includes(route as AppRoute) ? (route as AppRoute) : '/';
}

export function getDefaultDashboardForRole(role: UserRole): AppRoute {
  if (role === 'DRIVER') return '/driver/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/passenger/dashboard';
}

export const PRESET_LANDMARKS: CityLandmark[] = [
  {
    id: 'zone-mg-road',
    name: 'MG Road Transit Hub',
    area: 'Central Business District',
    coordinates: { lat: 12.9756, lng: 77.6066 },
    baseDemand: 38,
    zoneType: 'TRANSIT_HUB',
  },
  {
    id: 'zone-indiranagar',
    name: 'Indiranagar 100ft Metro',
    area: 'East Urban Corridor',
    coordinates: { lat: 12.9784, lng: 77.6408 },
    baseDemand: 34,
    zoneType: 'COMMERCIAL',
  },
  {
    id: 'zone-koramangala',
    name: 'Koramangala 4th Block',
    area: 'South-East Innovation Hub',
    coordinates: { lat: 12.9352, lng: 77.6245 },
    baseDemand: 41,
    zoneType: 'COMMERCIAL',
  },
  {
    id: 'zone-whitefield',
    name: 'Whitefield Tech Corridor',
    area: 'East IT Belt',
    coordinates: { lat: 12.9698, lng: 77.7499 },
    baseDemand: 45,
    zoneType: 'TECH_PARK',
  },
  {
    id: 'zone-jayanagar',
    name: 'Jayanagar 4th Block Square',
    area: 'South Residential Core',
    coordinates: { lat: 12.925, lng: 77.5938 },
    baseDemand: 24,
    zoneType: 'RESIDENTIAL',
  },
  {
    id: 'zone-hebbal',
    name: 'Hebbal Outer Ring Interchange',
    area: 'North Airport Gateway',
    coordinates: { lat: 13.0358, lng: 77.597 },
    baseDemand: 31,
    zoneType: 'AIRPORT',
  },
  {
    id: 'zone-yeshwantpur',
    name: 'Yeshwantpur Rail Terminal',
    area: 'North-West Transit',
    coordinates: { lat: 13.0285, lng: 77.54 },
    baseDemand: 29,
    zoneType: 'TRANSIT_HUB',
  },
  {
    id: 'zone-ecity',
    name: 'Electronic City Phase 1',
    area: 'South Tech Campus',
    coordinates: { lat: 12.8452, lng: 77.6602 },
    baseDemand: 36,
    zoneType: 'TECH_PARK',
  },
];

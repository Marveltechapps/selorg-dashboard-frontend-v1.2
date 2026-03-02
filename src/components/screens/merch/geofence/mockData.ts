import { Zone, Store } from './types';

export const MOCK_ZONES: Zone[] = [
  {
    id: 'z1',
    name: 'Downtown Core',
    type: 'Serviceable',
    color: '#14b8a6', // Teal
    isVisible: true,
    status: 'Active',
    description: 'Main business district high density',
    areaSqKm: 12.5,
    storesCovered: 4,
    points: [
      { x: 30, y: 30 },
      { x: 60, y: 30 },
      { x: 65, y: 60 },
      { x: 35, y: 65 },
    ]
  },
  {
    id: 'z2',
    name: 'West End',
    type: 'Serviceable',
    color: '#f43f5e', // Red/Pink
    isVisible: true,
    status: 'Active',
    description: 'Residential area west of downtown',
    areaSqKm: 8.2,
    storesCovered: 2,
    points: [
      { x: 10, y: 20 },
      { x: 28, y: 20 },
      { x: 28, y: 50 },
      { x: 10, y: 40 },
    ]
  },
  {
    id: 'z3',
    name: 'Exclusion Zone A',
    type: 'Exclusion',
    color: '#a855f7', // Purple
    isVisible: true,
    status: 'Active',
    description: 'Industrial park - no delivery',
    areaSqKm: 5.0,
    storesCovered: 0,
    points: [
      { x: 70, y: 20 },
      { x: 90, y: 20 },
      { x: 90, y: 40 },
      { x: 70, y: 40 },
    ]
  }
];

export const MOCK_STORES: Store[] = [
  { id: 's1', name: 'Downtown Hub 1', address: '123 Main St', x: 45, y: 45, zones: ['z1'], serviceStatus: 'Full' },
  { id: 's2', name: 'Downtown Hub 2', address: '456 Market St', x: 55, y: 35, zones: ['z1'], serviceStatus: 'Full' },
  { id: 's3', name: 'West End Store', address: '789 Sunset Blvd', x: 20, y: 30, zones: ['z2'], serviceStatus: 'Full' },
  { id: 's4', name: 'North Depot', address: '321 North Ave', x: 50, y: 10, zones: [], serviceStatus: 'None' },
  { id: 's5', name: 'East Side Hub', address: '654 East Dr', x: 80, y: 60, zones: [], serviceStatus: 'None' },
];

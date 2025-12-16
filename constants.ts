
import { MapColors, SimulationConfig } from './types';

export const DEFAULT_COLORS: MapColors = {
  background: '#0f172a', // Slate 900 (Ocean)
  visited: '#3b82f6',    // Blue 500
  unvisited: '#1e293b',  // Slate 800 (Land)
  stroke: '#475569',     // Slate 600
  trail: '#ffffff'       // White
};

export const DEFAULT_CONFIG: SimulationConfig = {
  zoomInMultiplier: 2.5,
  zoomOutScale: 1.0, 
  animationSpeed: 2500,
  waitDuration: 2000,
  centerIconScale: 1.0,
  mapMode: 'world'
};

export const INITIAL_DATE = {
  year: 2024,
  month: 1,
  day: 1
};

export const TOPOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
export const US_GEOJSON_URL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';

// Used for "Force back to USA"
export const HOME_COUNTRY = "United States of America";
export const HOME_COORDINATES: [number, number] = [-98.5795, 39.8283]; // Approximate Center of USA

// Map Country Names (from TopoJSON) to ISO 2-letter codes for FlagCDN
export const COUNTRY_ISO_CODES: Record<string, string> = {
  "United States of America": "us",
  "Canada": "ca",
  "Mexico": "mx",
  "Brazil": "br",
  "Argentina": "ar",
  "Chile": "cl",
  "Peru": "pe",
  "Colombia": "co",
  "Venezuela": "ve",
  "United Kingdom": "gb",
  "France": "fr",
  "Germany": "de",
  "Italy": "it",
  "Spain": "es",
  "Portugal": "pt",
  "Netherlands": "nl",
  "Belgium": "be",
  "Switzerland": "ch",
  "Austria": "at",
  "Sweden": "se",
  "Norway": "no",
  "Finland": "fi",
  "Denmark": "dk",
  "Ireland": "ie",
  "Russia": "ru",
  "Ukraine": "ua",
  "Poland": "pl",
  "Romania": "ro",
  "Czechia": "cz",
  "Czech Republic": "cz",
  "Slovakia": "sk",
  "Slovenia": "si",
  "Croatia": "hr",
  "Serbia": "rs",
  "Bosnia and Herzegovina": "ba",
  "Montenegro": "me",
  "Macedonia": "mk",
  "North Macedonia": "mk",
  "Greece": "gr",
  "Turkey": "tr",
  "China": "cn",
  "Japan": "jp",
  "South Korea": "kr",
  "North Korea": "kp",
  "India": "in",
  "Pakistan": "pk",
  "Bangladesh": "bd",
  "Indonesia": "id",
  "Vietnam": "vn",
  "Thailand": "th",
  "Philippines": "ph",
  "Malaysia": "my",
  "Singapore": "sg",
  "Australia": "au",
  "New Zealand": "nz",
  "Egypt": "eg",
  "South Africa": "za",
  "Nigeria": "ng",
  "Kenya": "ke",
  "Morocco": "ma",
  "Saudi Arabia": "sa",
  "United Arab Emirates": "ae",
  "Israel": "il",
  "Iran": "ir",
  "Iraq": "iq",
  // USA States (Adding common ones for fallbacks if needed, though flags might not exist for all on flagcdn easily)
  "Alabama": "us-al", "Alaska": "us-ak", "Arizona": "us-az", "Arkansas": "us-ar", "California": "us-ca",
  "Colorado": "us-co", "Connecticut": "us-ct", "Delaware": "us-de", "Florida": "us-fl", "Georgia": "us-ga",
  "Hawaii": "us-hi", "Idaho": "us-id", "Illinois": "us-il", "Indiana": "us-in", "Iowa": "us-ia",
  "Kansas": "us-ks", "Kentucky": "us-ky", "Louisiana": "us-la", "Maine": "us-me", "Maryland": "us-md",
  "Massachusetts": "us-ma", "Michigan": "us-mi", "Minnesota": "us-mn", "Mississippi": "us-ms", "Missouri": "us-mo",
  "Montana": "us-mt", "Nebraska": "us-ne", "Nevada": "us-nv", "New Hampshire": "us-nh", "New Jersey": "us-nj",
  "New Mexico": "us-nm", "New York": "us-ny", "North Carolina": "us-nc", "North Dakota": "us-nd", "Ohio": "us-oh",
  "Oklahoma": "us-ok", "Oregon": "us-or", "Pennsylvania": "us-pa", "Rhode Island": "us-ri", "South Carolina": "us-sc",
  "South Dakota": "us-sd", "Tennessee": "us-tn", "Texas": "us-tx", "Utah": "us-ut", "Vermont": "us-vt",
  "Virginia": "us-va", "Washington": "us-wa", "West Virginia": "us-wv", "Wisconsin": "us-wi", "Wyoming": "us-wy"
};

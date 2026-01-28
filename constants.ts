
import { MapColors, SimulationConfig } from './types';

export const DEFAULT_COLORS: MapColors = {
  background: '#0f172a', // Slate 900 (Ocean)
  visited: '#3b82f6',    // Blue 500
  unvisited: '#1e293b',  // Slate 800 (Land)
  stroke: '#475569',     // Slate 600
  trail: '#ffffff',      // White
  flash: '#ffffff'       // Default flash color
};

export const DEFAULT_CONFIG: SimulationConfig = {
  zoomInMultiplier: 2.5,
  zoomOutScale: 1.0, 
  animationSpeed: 2500,
  waitDuration: 2000,
  centerIconScale: 1.0,
  targetMarkerScale: 1.0,
  flashDuration: 1200,   // Default 1.2s flash
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

// List of Major Cities and States with [Longitude, Latitude] for precise targeting
export const MAJOR_CITIES: { name: string; country: string; coords: [number, number] }[] = [
  { name: "Tokyo", country: "Japan", coords: [139.6503, 35.6762] },
  { name: "New York", country: "USA", coords: [-74.0060, 40.7128] },
  { name: "London", country: "United Kingdom", coords: [-0.1276, 51.5074] },
  { name: "Paris", country: "France", coords: [2.3522, 48.8566] },
  { name: "Shanghai", country: "China", coords: [121.4737, 31.2304] },
  { name: "Singapore", country: "Singapore", coords: [103.8198, 1.3521] },
  { name: "Dubai", country: "United Arab Emirates", coords: [55.2708, 25.2048] },
  { name: "Sydney", country: "Australia", coords: [151.2093, -33.8688] },
  { name: "Sao Paulo", country: "Brazil", coords: [-46.6333, -23.5505] },
  { name: "Mumbai", country: "India", coords: [72.8777, 19.0760] },
  { name: "Moscow", country: "Russia", coords: [37.6173, 55.7558] },
  { name: "Los Angeles", country: "USA", coords: [-118.2437, 34.0522] },
  { name: "Toronto", country: "Canada", coords: [-79.3832, 43.6532] },
  { name: "Hong Kong", country: "Hong Kong", coords: [114.1694, 22.3193] },
  { name: "Seoul", country: "South Korea", coords: [126.9780, 37.5665] },
  { name: "Istanbul", country: "Turkey", coords: [28.9784, 41.0082] },
  { name: "Mexico City", country: "Mexico", coords: [-99.1332, 19.4326] },
  { name: "Cairo", country: "Egypt", coords: [31.2357, 30.0444] },
  { name: "Bangkok", country: "Thailand", coords: [100.5018, 13.7563] },
  { name: "Berlin", country: "Germany", coords: [13.4050, 52.5200] },
  { name: "Madrid", country: "Spain", coords: [-3.7038, 40.4168] },
  { name: "Jakarta", country: "Indonesia", coords: [106.8456, -6.2088] },
  { name: "Lagos", country: "Nigeria", coords: [3.3792, 6.5244] },
  { name: "Buenos Aires", country: "Argentina", coords: [-58.3816, -34.6037] },
  { name: "Johannesburg", country: "South Africa", coords: [28.0473, -26.2041] },
  { name: "Rome", country: "Italy", coords: [12.4964, 41.9028] },
  { name: "San Francisco", country: "USA", coords: [-122.4194, 37.7749] },
  { name: "Chicago", country: "USA", coords: [-87.6298, 41.8781] },
  { name: "Miami", country: "USA", coords: [-80.1918, 25.7617] },
  { name: "Vancouver", country: "Canada", coords: [-123.1207, 49.2827] },
  { name: "Lima", country: "Peru", coords: [-77.0428, -12.0464] },
  { name: "Bogota", country: "Colombia", coords: [-74.0721, 4.7110] },
  { name: "Santiago", country: "Chile", coords: [-70.6693, -33.4489] },
  { name: "Riyadh", country: "Saudi Arabia", coords: [46.6753, 24.7136] },
  { name: "Tel Aviv", country: "Israel", coords: [34.7818, 32.0853] },
  { name: "Kuala Lumpur", country: "Malaysia", coords: [101.6869, 3.1390] },
  { name: "Manila", country: "Philippines", coords: [120.9842, 14.5995] },
  { name: "Ho Chi Minh City", country: "Vietnam", coords: [106.6297, 10.8231] },
  { name: "Beijing", country: "China", coords: [116.4074, 39.9042] },
  { name: "Taipei", country: "Taiwan", coords: [121.5654, 25.0330] },
  { name: "Melbourne", country: "Australia", coords: [144.9631, -37.8136] },
  { name: "Auckland", country: "New Zealand", coords: [174.7633, -36.8485] },
  { name: "Amsterdam", country: "Netherlands", coords: [4.9041, 52.3676] },
  { name: "Brussels", country: "Belgium", coords: [4.3517, 50.8503] },
  { name: "Zurich", country: "Switzerland", coords: [8.5417, 47.3769] },
  { name: "Stockholm", country: "Sweden", coords: [18.0686, 59.3293] },
  { name: "Vienna", country: "Austria", coords: [16.3738, 48.2082] },
  { name: "Dublin", country: "Ireland", coords: [-6.2603, 53.3498] },
  { name: "Warsaw", country: "Poland", coords: [21.0122, 52.2297] },
  { name: "Athens", country: "Greece", coords: [23.7275, 37.9838] },
  { name: "Lisbon", country: "Portugal", coords: [-9.1393, 38.7223] },
  { name: "Atlanta", country: "USA", coords: [-84.3879, 33.7490] },
  { name: "Seattle", country: "USA", coords: [-122.3321, 47.6062] },
  { name: "Washington D.C.", country: "USA", coords: [-77.0369, 38.9072] },
  { name: "Belgrade", country: "Serbia", coords: [20.4489, 44.7866] },
  { name: "Bratislava", country: "Slovakia", coords: [17.1077, 48.1486] },
  { name: "Phnom Penh", country: "Cambodia", coords: [104.9174, 11.5564] },
  { name: "Helsinki", country: "Finland", coords: [24.9384, 60.1699] },

  // --- Virginia & Key US States ---
  { name: "Virginia", country: "USA", coords: [-78.6569, 37.4316] },
  { name: "California", country: "USA", coords: [-119.4179, 36.7783] },
  { name: "Texas", country: "USA", coords: [-99.9018, 31.9686] },
  { name: "Florida", country: "USA", coords: [-81.5158, 27.6648] },
  { name: "Richmond", country: "USA", coords: [-77.4360, 37.5407] },

  // --- New Zealand Additions ---
  { name: "Wellington", country: "New Zealand", coords: [174.7762, -41.2865] },
  { name: "Christchurch", country: "New Zealand", coords: [172.6362, -43.5321] },
  { name: "Hamilton", country: "New Zealand", coords: [175.2793, -37.7870] },
  { name: "Tauranga", country: "New Zealand", coords: [176.1651, -37.6878] },
  { name: "Dunedin", country: "New Zealand", coords: [170.5036, -45.8742] },

  // --- Australia Additions ---
  { name: "Brisbane", country: "Australia", coords: [153.0251, -27.4698] },
  { name: "Perth", country: "Australia", coords: [115.8605, -31.9505] },
  { name: "Adelaide", country: "Australia", coords: [138.6007, -34.9285] },
  { name: "Canberra", country: "Australia", coords: [149.1300, -35.2809] },
  { name: "Hobart", country: "Australia", coords: [147.3272, -42.8821] },
  { name: "Darwin", country: "Australia", coords: [130.8444, -12.4634] }
];

export const COUNTRY_ISO_CODES: Record<string, string> = {
  // --- North America ---
  "United States of America": "us", "United States": "us", "USA": "us",
  "Canada": "ca",
  "Mexico": "mx",
  
  // --- South America ---
  "Brazil": "br",
  "Argentina": "ar",
  "Chile": "cl",
  "Peru": "pe",
  "Colombia": "co",
  "Venezuela": "ve", "Venezuela, Bolivarian Republic of": "ve",
  "Ecuador": "ec",
  "Bolivia": "bo", "Bolivia, Plurinational State of": "bo",
  "Paraguay": "py",
  "Uruguay": "uy",
  "Guyana": "gy",
  "Suriname": "sr",
  "French Guiana": "gf",

  // --- Europe ---
  "United Kingdom": "gb", "Great Britain": "gb", "UK": "gb",
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
  "Russia": "ru", "Russian Federation": "ru",
  "Ukraine": "ua",
  "Poland": "pl",
  "Romania": "ro",
  "Czechia": "cz", "Czech Republic": "cz",
  "Slovakia": "sk",
  "Slovenia": "si",
  "Croatia": "hr",
  "Serbia": "rs",
  "Bosnia and Herzegovina": "ba",
  "Montenegro": "me",
  "Macedonia": "mk", "North Macedonia": "mk",
  "Greece": "gr",
  "Albania": "al",
  "Bulgaria": "bg",
  "Hungary": "hu",
  "Belarus": "by",
  "Moldova": "md",
  "Lithuania": "lt",
  "Latvia": "lv",
  "Estonia": "ee",
  "Iceland": "is",

  // --- Middle East & West Asia ---
  "Turkey": "tr",
  "Israel": "il",
  "Saudi Arabia": "sa",
  "United Arab Emirates": "ae", "UAE": "ae",
  "Iran": "ir", "Iran, Islamic Republic of": "ir",
  "Iraq": "iq",
  "Qatar": "qa",
  "Kuwait": "kw",
  "Bahrain": "bh",
  "Oman": "om",
  "Yemen": "ye",
  "Jordan": "jo",
  "Lebanon": "lb",
  "Syria": "sy", "Syrian Arab Republic": "sy",
  "Cyprus": "cy",
  "Palestine": "ps", "State of Palestine": "ps",
  "Georgia": "ge", 
  "Georgia (Country)": "ge",

  // --- Asia ---
  "China": "cn",
  "Hong Kong": "hk",
  "Japan": "jp",
  "South Korea": "kr", "Korea, Republic of": "kr", "Korea": "kr",
  "India": "in",
  "Pakistan": "pk",
  "Bangladesh": "bd",
  "Indonesia": "id",
  "Vietnam": "vn",
  "Thailand": "th",
  "Philippines": "ph",
  "Malaysia": "my",
  "Singapore": "sg",
  "Taiwan": "tw",
  
  // --- Oceania ---
  "Australia": "au",
  "New Zealand": "nz",

  // --- Africa ---
  "Egypt": "eg",
  "South Africa": "za",
  "Nigeria": "ng",
  "Kenya": "ke",
  "Morocco": "ma",
  
  // --- USA States ---
  "Alabama": "us-al", "Alaska": "us-ak", "Arizona": "us-az", "Arkansas": "us-ar", "California": "us-ca",
  "Colorado": "us-co", "Connecticut": "us-ct", "Delaware": "us-de", "Florida": "us-fl", 
  "Hawaii": "us-hi", "Idaho": "us-id", "Illinois": "us-il", "Indiana": "us-in", "Iowa": "us-ia",
  "Kansas": "us-ks", "Kentucky": "us-ky", "Louisiana": "us-la", "Maine": "us-me", "Maryland": "us-md",
  "Massachusetts": "us-ma", "Michigan": "us-mi", "Minnesota": "us-mn", "Mississippi": "us-ms", "Missouri": "us-mo",
  "Montana": "us-mt", "Nebraska": "us-ne", "Nevada": "us-nv", "New Hampshire": "us-nh", "New Jersey": "us-nj",
  "New Mexico": "us-nm", "New York": "us-ny", "North Carolina": "us-nc", "North Dakota": "us-nd", "Ohio": "us-oh",
  "Oklahoma": "us-ok", "Oregon": "us-or", "Pennsylvania": "us-pa", "Rhode Island": "us-ri", "South Carolina": "us-sc",
  "South Dakota": "us-sd", "Tennessee": "us-tn", "Texas": "us-tx", "Utah": "us-ut", "Vermont": "us-vt",
  "Virginia": "us-va", "Washington": "us-wa", "West Virginia": "us-wv", "Wisconsin": "us-wi", "Wyoming": "us-wy",
  "Georgia (USA)": "us-ga",
  "Georgia USA": "us-ga",
  "Virginia (USA)": "us-va",
  "Virginia USA": "us-va"
};

export interface WorldCity {
  name: string;
  nameNormalized: string;
  lat: number;
  lng: number;
  country: string;
  countryCode: string;
  population: number;
  region: string;
  isCapital?: boolean;
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

export const WORLD_CITIES: WorldCity[] = [
  // ============================================
  // NORTH AMERICA
  // ============================================
  // United States - Major Cities
  { name: "New York City", nameNormalized: "new york city", lat: 40.7128, lng: -74.0060, country: "United States", countryCode: "US", population: 8336817, region: "north-america" },
  { name: "Los Angeles", nameNormalized: "los angeles", lat: 34.0522, lng: -118.2437, country: "United States", countryCode: "US", population: 3979576, region: "north-america" },
  { name: "Chicago", nameNormalized: "chicago", lat: 41.8781, lng: -87.6298, country: "United States", countryCode: "US", population: 2693976, region: "north-america" },
  { name: "Houston", nameNormalized: "houston", lat: 29.7604, lng: -95.3698, country: "United States", countryCode: "US", population: 2320268, region: "north-america" },
  { name: "Phoenix", nameNormalized: "phoenix", lat: 33.4484, lng: -112.0740, country: "United States", countryCode: "US", population: 1680992, region: "north-america" },
  { name: "Philadelphia", nameNormalized: "philadelphia", lat: 39.9526, lng: -75.1652, country: "United States", countryCode: "US", population: 1584064, region: "north-america" },
  { name: "San Antonio", nameNormalized: "san antonio", lat: 29.4241, lng: -98.4936, country: "United States", countryCode: "US", population: 1547253, region: "north-america" },
  { name: "San Diego", nameNormalized: "san diego", lat: 32.7157, lng: -117.1611, country: "United States", countryCode: "US", population: 1423851, region: "north-america" },
  { name: "Dallas", nameNormalized: "dallas", lat: 32.7767, lng: -96.7970, country: "United States", countryCode: "US", population: 1343573, region: "north-america" },
  { name: "San Jose", nameNormalized: "san jose", lat: 37.3382, lng: -121.8863, country: "United States", countryCode: "US", population: 1021795, region: "north-america" },
  { name: "Austin", nameNormalized: "austin", lat: 30.2672, lng: -97.7431, country: "United States", countryCode: "US", population: 978908, region: "north-america" },
  { name: "San Francisco", nameNormalized: "san francisco", lat: 37.7749, lng: -122.4194, country: "United States", countryCode: "US", population: 873965, region: "north-america" },
  { name: "Seattle", nameNormalized: "seattle", lat: 47.6062, lng: -122.3321, country: "United States", countryCode: "US", population: 737015, region: "north-america" },
  { name: "Denver", nameNormalized: "denver", lat: 39.7392, lng: -104.9903, country: "United States", countryCode: "US", population: 727211, region: "north-america" },
  { name: "Washington", nameNormalized: "washington", lat: 38.9072, lng: -77.0369, country: "United States", countryCode: "US", population: 705749, region: "north-america", isCapital: true },
  { name: "Boston", nameNormalized: "boston", lat: 42.3601, lng: -71.0589, country: "United States", countryCode: "US", population: 692600, region: "north-america" },
  { name: "Las Vegas", nameNormalized: "las vegas", lat: 36.1699, lng: -115.1398, country: "United States", countryCode: "US", population: 651319, region: "north-america" },
  { name: "Portland", nameNormalized: "portland", lat: 45.5152, lng: -122.6784, country: "United States", countryCode: "US", population: 654741, region: "north-america" },
  { name: "Detroit", nameNormalized: "detroit", lat: 42.3314, lng: -83.0458, country: "United States", countryCode: "US", population: 639111, region: "north-america" },
  { name: "Miami", nameNormalized: "miami", lat: 25.7617, lng: -80.1918, country: "United States", countryCode: "US", population: 467963, region: "north-america" },
  { name: "Atlanta", nameNormalized: "atlanta", lat: 33.7490, lng: -84.3880, country: "United States", countryCode: "US", population: 498715, region: "north-america" },
  { name: "Minneapolis", nameNormalized: "minneapolis", lat: 44.9778, lng: -93.2650, country: "United States", countryCode: "US", population: 429954, region: "north-america" },
  { name: "New Orleans", nameNormalized: "new orleans", lat: 29.9511, lng: -90.0715, country: "United States", countryCode: "US", population: 383997, region: "north-america" },
  { name: "Cleveland", nameNormalized: "cleveland", lat: 41.4993, lng: -81.6944, country: "United States", countryCode: "US", population: 372624, region: "north-america" },
  { name: "Honolulu", nameNormalized: "honolulu", lat: 21.3069, lng: -157.8583, country: "United States", countryCode: "US", population: 350964, region: "north-america" },
  { name: "Anchorage", nameNormalized: "anchorage", lat: 61.2181, lng: -149.9003, country: "United States", countryCode: "US", population: 291247, region: "north-america" },
  
  // Canada
  { name: "Toronto", nameNormalized: "toronto", lat: 43.6532, lng: -79.3832, country: "Canada", countryCode: "CA", population: 2731571, region: "north-america" },
  { name: "Montreal", nameNormalized: "montreal", lat: 45.5017, lng: -73.5673, country: "Canada", countryCode: "CA", population: 1704694, region: "north-america" },
  { name: "Vancouver", nameNormalized: "vancouver", lat: 49.2827, lng: -123.1207, country: "Canada", countryCode: "CA", population: 631486, region: "north-america" },
  { name: "Calgary", nameNormalized: "calgary", lat: 51.0447, lng: -114.0719, country: "Canada", countryCode: "CA", population: 1239220, region: "north-america" },
  { name: "Edmonton", nameNormalized: "edmonton", lat: 53.5461, lng: -113.4938, country: "Canada", countryCode: "CA", population: 932546, region: "north-america" },
  { name: "Ottawa", nameNormalized: "ottawa", lat: 45.4215, lng: -75.6972, country: "Canada", countryCode: "CA", population: 934243, region: "north-america", isCapital: true },
  { name: "Winnipeg", nameNormalized: "winnipeg", lat: 49.8951, lng: -97.1384, country: "Canada", countryCode: "CA", population: 749534, region: "north-america" },
  { name: "Quebec City", nameNormalized: "quebec city", lat: 46.8139, lng: -71.2080, country: "Canada", countryCode: "CA", population: 531902, region: "north-america" },
  { name: "Halifax", nameNormalized: "halifax", lat: 44.6488, lng: -63.5752, country: "Canada", countryCode: "CA", population: 403131, region: "north-america" },
  
  // Mexico
  { name: "Mexico City", nameNormalized: "mexico city", lat: 19.4326, lng: -99.1332, country: "Mexico", countryCode: "MX", population: 8918653, region: "north-america", isCapital: true },
  { name: "Guadalajara", nameNormalized: "guadalajara", lat: 20.6597, lng: -103.3496, country: "Mexico", countryCode: "MX", population: 1495182, region: "north-america" },
  { name: "Monterrey", nameNormalized: "monterrey", lat: 25.6866, lng: -100.3161, country: "Mexico", countryCode: "MX", population: 1135512, region: "north-america" },
  { name: "Tijuana", nameNormalized: "tijuana", lat: 32.5149, lng: -117.0382, country: "Mexico", countryCode: "MX", population: 1300983, region: "north-america" },
  { name: "Cancun", nameNormalized: "cancun", lat: 21.1619, lng: -86.8515, country: "Mexico", countryCode: "MX", population: 628306, region: "north-america" },

  // ============================================
  // SOUTH AMERICA
  // ============================================
  // Brazil
  { name: "São Paulo", nameNormalized: "sao paulo", lat: -23.5505, lng: -46.6333, country: "Brazil", countryCode: "BR", population: 12325232, region: "south-america" },
  { name: "Rio de Janeiro", nameNormalized: "rio de janeiro", lat: -22.9068, lng: -43.1729, country: "Brazil", countryCode: "BR", population: 6747815, region: "south-america" },
  { name: "Brasília", nameNormalized: "brasilia", lat: -15.8267, lng: -47.9218, country: "Brazil", countryCode: "BR", population: 3015268, region: "south-america", isCapital: true },
  { name: "Salvador", nameNormalized: "salvador", lat: -12.9714, lng: -38.5014, country: "Brazil", countryCode: "BR", population: 2886698, region: "south-america" },
  { name: "Fortaleza", nameNormalized: "fortaleza", lat: -3.7172, lng: -38.5433, country: "Brazil", countryCode: "BR", population: 2686612, region: "south-america" },
  { name: "Belo Horizonte", nameNormalized: "belo horizonte", lat: -19.9167, lng: -43.9345, country: "Brazil", countryCode: "BR", population: 2521564, region: "south-america" },
  { name: "Manaus", nameNormalized: "manaus", lat: -3.1190, lng: -60.0217, country: "Brazil", countryCode: "BR", population: 2219580, region: "south-america" },
  { name: "Curitiba", nameNormalized: "curitiba", lat: -25.4290, lng: -49.2671, country: "Brazil", countryCode: "BR", population: 1948626, region: "south-america" },
  { name: "Recife", nameNormalized: "recife", lat: -8.0476, lng: -34.8770, country: "Brazil", countryCode: "BR", population: 1653461, region: "south-america" },
  { name: "Porto Alegre", nameNormalized: "porto alegre", lat: -30.0346, lng: -51.2177, country: "Brazil", countryCode: "BR", population: 1488252, region: "south-america" },
  
  // Argentina
  { name: "Buenos Aires", nameNormalized: "buenos aires", lat: -34.6037, lng: -58.3816, country: "Argentina", countryCode: "AR", population: 3075646, region: "south-america", isCapital: true },
  { name: "Córdoba", nameNormalized: "cordoba", lat: -31.4201, lng: -64.1888, country: "Argentina", countryCode: "AR", population: 1391000, region: "south-america" },
  { name: "Rosario", nameNormalized: "rosario", lat: -32.9587, lng: -60.6930, country: "Argentina", countryCode: "AR", population: 1193605, region: "south-america" },
  { name: "Mendoza", nameNormalized: "mendoza", lat: -32.8908, lng: -68.8272, country: "Argentina", countryCode: "AR", population: 115041, region: "south-america" },
  
  // Colombia
  { name: "Bogotá", nameNormalized: "bogota", lat: 4.7110, lng: -74.0721, country: "Colombia", countryCode: "CO", population: 7181469, region: "south-america", isCapital: true },
  { name: "Medellín", nameNormalized: "medellin", lat: 6.2442, lng: -75.5812, country: "Colombia", countryCode: "CO", population: 2569007, region: "south-america" },
  { name: "Cali", nameNormalized: "cali", lat: 3.4516, lng: -76.5320, country: "Colombia", countryCode: "CO", population: 2227642, region: "south-america" },
  { name: "Barranquilla", nameNormalized: "barranquilla", lat: 10.9685, lng: -74.7813, country: "Colombia", countryCode: "CO", population: 1232766, region: "south-america" },
  { name: "Cartagena", nameNormalized: "cartagena", lat: 10.3910, lng: -75.4794, country: "Colombia", countryCode: "CO", population: 1028736, region: "south-america" },
  
  // Peru
  { name: "Lima", nameNormalized: "lima", lat: -12.0464, lng: -77.0428, country: "Peru", countryCode: "PE", population: 10883574, region: "south-america", isCapital: true },
  { name: "Arequipa", nameNormalized: "arequipa", lat: -16.4090, lng: -71.5375, country: "Peru", countryCode: "PE", population: 1008290, region: "south-america" },
  { name: "Cusco", nameNormalized: "cusco", lat: -13.5319, lng: -71.9675, country: "Peru", countryCode: "PE", population: 428450, region: "south-america" },
  
  // Chile
  { name: "Santiago", nameNormalized: "santiago", lat: -33.4489, lng: -70.6693, country: "Chile", countryCode: "CL", population: 6158080, region: "south-america", isCapital: true },
  { name: "Valparaíso", nameNormalized: "valparaiso", lat: -33.0472, lng: -71.6127, country: "Chile", countryCode: "CL", population: 284630, region: "south-america" },
  
  // Venezuela
  { name: "Caracas", nameNormalized: "caracas", lat: 10.4806, lng: -66.9036, country: "Venezuela", countryCode: "VE", population: 2082000, region: "south-america", isCapital: true },
  { name: "Maracaibo", nameNormalized: "maracaibo", lat: 10.6544, lng: -71.6406, country: "Venezuela", countryCode: "VE", population: 1653211, region: "south-america" },
  
  // Ecuador
  { name: "Quito", nameNormalized: "quito", lat: -0.1807, lng: -78.4678, country: "Ecuador", countryCode: "EC", population: 2781641, region: "south-america", isCapital: true },
  { name: "Guayaquil", nameNormalized: "guayaquil", lat: -2.1894, lng: -79.8891, country: "Ecuador", countryCode: "EC", population: 2698077, region: "south-america" },
  
  // Other South America
  { name: "Montevideo", nameNormalized: "montevideo", lat: -34.9011, lng: -56.1645, country: "Uruguay", countryCode: "UY", population: 1319108, region: "south-america", isCapital: true },
  { name: "Asunción", nameNormalized: "asuncion", lat: -25.2637, lng: -57.5759, country: "Paraguay", countryCode: "PY", population: 525294, region: "south-america", isCapital: true },
  { name: "La Paz", nameNormalized: "la paz", lat: -16.4897, lng: -68.1193, country: "Bolivia", countryCode: "BO", population: 764617, region: "south-america", isCapital: true },

  // ============================================
  // EUROPE
  // ============================================
  // United Kingdom
  { name: "London", nameNormalized: "london", lat: 51.5074, lng: -0.1278, country: "United Kingdom", countryCode: "GB", population: 8982000, region: "europe", isCapital: true },
  { name: "Birmingham", nameNormalized: "birmingham", lat: 52.4862, lng: -1.8904, country: "United Kingdom", countryCode: "GB", population: 1141816, region: "europe" },
  { name: "Manchester", nameNormalized: "manchester", lat: 53.4808, lng: -2.2426, country: "United Kingdom", countryCode: "GB", population: 553230, region: "europe" },
  { name: "Liverpool", nameNormalized: "liverpool", lat: 53.4084, lng: -2.9916, country: "United Kingdom", countryCode: "GB", population: 498042, region: "europe" },
  { name: "Edinburgh", nameNormalized: "edinburgh", lat: 55.9533, lng: -3.1883, country: "United Kingdom", countryCode: "GB", population: 488050, region: "europe" },
  { name: "Glasgow", nameNormalized: "glasgow", lat: 55.8642, lng: -4.2518, country: "United Kingdom", countryCode: "GB", population: 635640, region: "europe" },
  { name: "Belfast", nameNormalized: "belfast", lat: 54.5973, lng: -5.9301, country: "United Kingdom", countryCode: "GB", population: 343542, region: "europe" },
  { name: "Cardiff", nameNormalized: "cardiff", lat: 51.4816, lng: -3.1791, country: "United Kingdom", countryCode: "GB", population: 362756, region: "europe" },
  
  // France
  { name: "Paris", nameNormalized: "paris", lat: 48.8566, lng: 2.3522, country: "France", countryCode: "FR", population: 2161000, region: "europe", isCapital: true },
  { name: "Marseille", nameNormalized: "marseille", lat: 43.2965, lng: 5.3698, country: "France", countryCode: "FR", population: 870731, region: "europe" },
  { name: "Lyon", nameNormalized: "lyon", lat: 45.7640, lng: 4.8357, country: "France", countryCode: "FR", population: 516092, region: "europe" },
  { name: "Toulouse", nameNormalized: "toulouse", lat: 43.6047, lng: 1.4442, country: "France", countryCode: "FR", population: 479553, region: "europe" },
  { name: "Nice", nameNormalized: "nice", lat: 43.7102, lng: 7.2620, country: "France", countryCode: "FR", population: 342669, region: "europe" },
  { name: "Bordeaux", nameNormalized: "bordeaux", lat: 44.8378, lng: -0.5792, country: "France", countryCode: "FR", population: 257068, region: "europe" },
  { name: "Strasbourg", nameNormalized: "strasbourg", lat: 48.5734, lng: 7.7521, country: "France", countryCode: "FR", population: 280966, region: "europe" },
  
  // Germany
  { name: "Berlin", nameNormalized: "berlin", lat: 52.5200, lng: 13.4050, country: "Germany", countryCode: "DE", population: 3644826, region: "europe", isCapital: true },
  { name: "Hamburg", nameNormalized: "hamburg", lat: 53.5511, lng: 9.9937, country: "Germany", countryCode: "DE", population: 1899160, region: "europe" },
  { name: "Munich", nameNormalized: "munich", lat: 48.1351, lng: 11.5820, country: "Germany", countryCode: "DE", population: 1471508, region: "europe" },
  { name: "Cologne", nameNormalized: "cologne", lat: 50.9375, lng: 6.9603, country: "Germany", countryCode: "DE", population: 1085664, region: "europe" },
  { name: "Frankfurt", nameNormalized: "frankfurt", lat: 50.1109, lng: 8.6821, country: "Germany", countryCode: "DE", population: 753056, region: "europe" },
  { name: "Stuttgart", nameNormalized: "stuttgart", lat: 48.7758, lng: 9.1829, country: "Germany", countryCode: "DE", population: 634830, region: "europe" },
  { name: "Düsseldorf", nameNormalized: "dusseldorf", lat: 51.2277, lng: 6.7735, country: "Germany", countryCode: "DE", population: 619294, region: "europe" },
  { name: "Leipzig", nameNormalized: "leipzig", lat: 51.3397, lng: 12.3731, country: "Germany", countryCode: "DE", population: 587857, region: "europe" },
  { name: "Dresden", nameNormalized: "dresden", lat: 51.0504, lng: 13.7373, country: "Germany", countryCode: "DE", population: 556780, region: "europe" },
  
  // Italy
  { name: "Rome", nameNormalized: "rome", lat: 41.9028, lng: 12.4964, country: "Italy", countryCode: "IT", population: 2873000, region: "europe", isCapital: true },
  { name: "Milan", nameNormalized: "milan", lat: 45.4642, lng: 9.1900, country: "Italy", countryCode: "IT", population: 1396059, region: "europe" },
  { name: "Naples", nameNormalized: "naples", lat: 40.8518, lng: 14.2681, country: "Italy", countryCode: "IT", population: 966144, region: "europe" },
  { name: "Turin", nameNormalized: "turin", lat: 45.0703, lng: 7.6869, country: "Italy", countryCode: "IT", population: 870952, region: "europe" },
  { name: "Florence", nameNormalized: "florence", lat: 43.7696, lng: 11.2558, country: "Italy", countryCode: "IT", population: 383084, region: "europe" },
  { name: "Venice", nameNormalized: "venice", lat: 45.4408, lng: 12.3155, country: "Italy", countryCode: "IT", population: 261905, region: "europe" },
  { name: "Bologna", nameNormalized: "bologna", lat: 44.4949, lng: 11.3426, country: "Italy", countryCode: "IT", population: 392203, region: "europe" },
  
  // Spain
  { name: "Madrid", nameNormalized: "madrid", lat: 40.4168, lng: -3.7038, country: "Spain", countryCode: "ES", population: 3223334, region: "europe", isCapital: true },
  { name: "Barcelona", nameNormalized: "barcelona", lat: 41.3851, lng: 2.1734, country: "Spain", countryCode: "ES", population: 1620343, region: "europe" },
  { name: "Valencia", nameNormalized: "valencia", lat: 39.4699, lng: -0.3763, country: "Spain", countryCode: "ES", population: 791413, region: "europe" },
  { name: "Seville", nameNormalized: "seville", lat: 37.3891, lng: -5.9845, country: "Spain", countryCode: "ES", population: 688592, region: "europe" },
  { name: "Bilbao", nameNormalized: "bilbao", lat: 43.2630, lng: -2.9350, country: "Spain", countryCode: "ES", population: 346843, region: "europe" },
  { name: "Malaga", nameNormalized: "malaga", lat: 36.7213, lng: -4.4214, country: "Spain", countryCode: "ES", population: 578460, region: "europe" },
  
  // Netherlands
  { name: "Amsterdam", nameNormalized: "amsterdam", lat: 52.3676, lng: 4.9041, country: "Netherlands", countryCode: "NL", population: 872680, region: "europe", isCapital: true },
  { name: "Rotterdam", nameNormalized: "rotterdam", lat: 51.9244, lng: 4.4777, country: "Netherlands", countryCode: "NL", population: 651446, region: "europe" },
  { name: "The Hague", nameNormalized: "the hague", lat: 52.0705, lng: 4.3007, country: "Netherlands", countryCode: "NL", population: 545163, region: "europe" },
  { name: "Utrecht", nameNormalized: "utrecht", lat: 52.0907, lng: 5.1214, country: "Netherlands", countryCode: "NL", population: 357179, region: "europe" },
  
  // Belgium
  { name: "Brussels", nameNormalized: "brussels", lat: 50.8503, lng: 4.3517, country: "Belgium", countryCode: "BE", population: 1209000, region: "europe", isCapital: true },
  { name: "Antwerp", nameNormalized: "antwerp", lat: 51.2194, lng: 4.4025, country: "Belgium", countryCode: "BE", population: 523248, region: "europe" },
  { name: "Ghent", nameNormalized: "ghent", lat: 51.0543, lng: 3.7174, country: "Belgium", countryCode: "BE", population: 262219, region: "europe" },
  
  // Switzerland
  { name: "Zurich", nameNormalized: "zurich", lat: 47.3769, lng: 8.5417, country: "Switzerland", countryCode: "CH", population: 415367, region: "europe" },
  { name: "Geneva", nameNormalized: "geneva", lat: 46.2044, lng: 6.1432, country: "Switzerland", countryCode: "CH", population: 201818, region: "europe" },
  { name: "Bern", nameNormalized: "bern", lat: 46.9480, lng: 7.4474, country: "Switzerland", countryCode: "CH", population: 133883, region: "europe", isCapital: true },
  { name: "Basel", nameNormalized: "basel", lat: 47.5596, lng: 7.5886, country: "Switzerland", countryCode: "CH", population: 177654, region: "europe" },
  
  // Austria
  { name: "Vienna", nameNormalized: "vienna", lat: 48.2082, lng: 16.3738, country: "Austria", countryCode: "AT", population: 1911191, region: "europe", isCapital: true },
  { name: "Salzburg", nameNormalized: "salzburg", lat: 47.8095, lng: 13.0550, country: "Austria", countryCode: "AT", population: 155021, region: "europe" },
  { name: "Innsbruck", nameNormalized: "innsbruck", lat: 47.2692, lng: 11.4041, country: "Austria", countryCode: "AT", population: 132493, region: "europe" },
  
  // Poland
  { name: "Warsaw", nameNormalized: "warsaw", lat: 52.2297, lng: 21.0122, country: "Poland", countryCode: "PL", population: 1793579, region: "europe", isCapital: true },
  { name: "Krakow", nameNormalized: "krakow", lat: 50.0647, lng: 19.9450, country: "Poland", countryCode: "PL", population: 779115, region: "europe" },
  { name: "Gdansk", nameNormalized: "gdansk", lat: 54.3520, lng: 18.6466, country: "Poland", countryCode: "PL", population: 470907, region: "europe" },
  { name: "Wroclaw", nameNormalized: "wroclaw", lat: 51.1079, lng: 17.0385, country: "Poland", countryCode: "PL", population: 641607, region: "europe" },
  { name: "Poznan", nameNormalized: "poznan", lat: 52.4064, lng: 16.9252, country: "Poland", countryCode: "PL", population: 538633, region: "europe" },
  
  // Czech Republic
  { name: "Prague", nameNormalized: "prague", lat: 50.0755, lng: 14.4378, country: "Czech Republic", countryCode: "CZ", population: 1335084, region: "europe", isCapital: true },
  { name: "Brno", nameNormalized: "brno", lat: 49.1951, lng: 16.6068, country: "Czech Republic", countryCode: "CZ", population: 381346, region: "europe" },
  
  // Portugal
  { name: "Lisbon", nameNormalized: "lisbon", lat: 38.7223, lng: -9.1393, country: "Portugal", countryCode: "PT", population: 504718, region: "europe", isCapital: true },
  { name: "Porto", nameNormalized: "porto", lat: 41.1579, lng: -8.6291, country: "Portugal", countryCode: "PT", population: 214349, region: "europe" },
  
  // Greece
  { name: "Athens", nameNormalized: "athens", lat: 37.9838, lng: 23.7275, country: "Greece", countryCode: "GR", population: 664046, region: "europe", isCapital: true },
  { name: "Thessaloniki", nameNormalized: "thessaloniki", lat: 40.6401, lng: 22.9444, country: "Greece", countryCode: "GR", population: 325182, region: "europe" },
  
  // Nordic Countries
  { name: "Stockholm", nameNormalized: "stockholm", lat: 59.3293, lng: 18.0686, country: "Sweden", countryCode: "SE", population: 975551, region: "europe", isCapital: true },
  { name: "Gothenburg", nameNormalized: "gothenburg", lat: 57.7089, lng: 11.9746, country: "Sweden", countryCode: "SE", population: 583056, region: "europe" },
  { name: "Malmo", nameNormalized: "malmo", lat: 55.6050, lng: 13.0038, country: "Sweden", countryCode: "SE", population: 347949, region: "europe" },
  { name: "Copenhagen", nameNormalized: "copenhagen", lat: 55.6761, lng: 12.5683, country: "Denmark", countryCode: "DK", population: 644431, region: "europe", isCapital: true },
  { name: "Oslo", nameNormalized: "oslo", lat: 59.9139, lng: 10.7522, country: "Norway", countryCode: "NO", population: 693494, region: "europe", isCapital: true },
  { name: "Bergen", nameNormalized: "bergen", lat: 60.3913, lng: 5.3221, country: "Norway", countryCode: "NO", population: 283929, region: "europe" },
  { name: "Helsinki", nameNormalized: "helsinki", lat: 60.1699, lng: 24.9384, country: "Finland", countryCode: "FI", population: 658864, region: "europe", isCapital: true },
  { name: "Reykjavik", nameNormalized: "reykjavik", lat: 64.1466, lng: -21.9426, country: "Iceland", countryCode: "IS", population: 131136, region: "europe", isCapital: true },
  
  // Eastern Europe
  { name: "Moscow", nameNormalized: "moscow", lat: 55.7558, lng: 37.6173, country: "Russia", countryCode: "RU", population: 12506468, region: "europe", isCapital: true },
  { name: "Saint Petersburg", nameNormalized: "saint petersburg", lat: 59.9343, lng: 30.3351, country: "Russia", countryCode: "RU", population: 5383890, region: "europe" },
  { name: "Kyiv", nameNormalized: "kyiv", lat: 50.4501, lng: 30.5234, country: "Ukraine", countryCode: "UA", population: 2962180, region: "europe", isCapital: true },
  { name: "Kharkiv", nameNormalized: "kharkiv", lat: 49.9935, lng: 36.2304, country: "Ukraine", countryCode: "UA", population: 1433886, region: "europe" },
  { name: "Odessa", nameNormalized: "odessa", lat: 46.4825, lng: 30.7233, country: "Ukraine", countryCode: "UA", population: 1015826, region: "europe" },
  { name: "Budapest", nameNormalized: "budapest", lat: 47.4979, lng: 19.0402, country: "Hungary", countryCode: "HU", population: 1752286, region: "europe", isCapital: true },
  { name: "Bucharest", nameNormalized: "bucharest", lat: 44.4268, lng: 26.1025, country: "Romania", countryCode: "RO", population: 1883425, region: "europe", isCapital: true },
  { name: "Sofia", nameNormalized: "sofia", lat: 42.6977, lng: 23.3219, country: "Bulgaria", countryCode: "BG", population: 1307439, region: "europe", isCapital: true },
  { name: "Belgrade", nameNormalized: "belgrade", lat: 44.7866, lng: 20.4489, country: "Serbia", countryCode: "RS", population: 1166763, region: "europe", isCapital: true },
  { name: "Zagreb", nameNormalized: "zagreb", lat: 45.8150, lng: 15.9819, country: "Croatia", countryCode: "HR", population: 688163, region: "europe", isCapital: true },
  { name: "Bratislava", nameNormalized: "bratislava", lat: 48.1486, lng: 17.1077, country: "Slovakia", countryCode: "SK", population: 437725, region: "europe", isCapital: true },
  { name: "Ljubljana", nameNormalized: "ljubljana", lat: 46.0569, lng: 14.5058, country: "Slovenia", countryCode: "SI", population: 295504, region: "europe", isCapital: true },
  { name: "Sarajevo", nameNormalized: "sarajevo", lat: 43.8563, lng: 18.4131, country: "Bosnia and Herzegovina", countryCode: "BA", population: 275524, region: "europe", isCapital: true },
  { name: "Tirana", nameNormalized: "tirana", lat: 41.3275, lng: 19.8187, country: "Albania", countryCode: "AL", population: 418495, region: "europe", isCapital: true },
  { name: "Skopje", nameNormalized: "skopje", lat: 41.9981, lng: 21.4254, country: "North Macedonia", countryCode: "MK", population: 544086, region: "europe", isCapital: true },
  { name: "Minsk", nameNormalized: "minsk", lat: 53.9006, lng: 27.5590, country: "Belarus", countryCode: "BY", population: 2009786, region: "europe", isCapital: true },
  { name: "Vilnius", nameNormalized: "vilnius", lat: 54.6872, lng: 25.2797, country: "Lithuania", countryCode: "LT", population: 580020, region: "europe", isCapital: true },
  { name: "Riga", nameNormalized: "riga", lat: 56.9496, lng: 24.1052, country: "Latvia", countryCode: "LV", population: 614618, region: "europe", isCapital: true },
  { name: "Tallinn", nameNormalized: "tallinn", lat: 59.4370, lng: 24.7536, country: "Estonia", countryCode: "EE", population: 437619, region: "europe", isCapital: true },
  
  // Ireland
  { name: "Dublin", nameNormalized: "dublin", lat: 53.3498, lng: -6.2603, country: "Ireland", countryCode: "IE", population: 544107, region: "europe", isCapital: true },
  { name: "Cork", nameNormalized: "cork", lat: 51.8969, lng: -8.4863, country: "Ireland", countryCode: "IE", population: 210000, region: "europe" },

  // ============================================
  // ASIA
  // ============================================
  // China
  { name: "Beijing", nameNormalized: "beijing", lat: 39.9042, lng: 116.4074, country: "China", countryCode: "CN", population: 21542000, region: "asia", isCapital: true },
  { name: "Shanghai", nameNormalized: "shanghai", lat: 31.2304, lng: 121.4737, country: "China", countryCode: "CN", population: 27058000, region: "asia" },
  { name: "Guangzhou", nameNormalized: "guangzhou", lat: 23.1291, lng: 113.2644, country: "China", countryCode: "CN", population: 14904000, region: "asia" },
  { name: "Shenzhen", nameNormalized: "shenzhen", lat: 22.5431, lng: 114.0579, country: "China", countryCode: "CN", population: 12528300, region: "asia" },
  { name: "Chengdu", nameNormalized: "chengdu", lat: 30.5728, lng: 104.0668, country: "China", countryCode: "CN", population: 10152632, region: "asia" },
  { name: "Hong Kong", nameNormalized: "hong kong", lat: 22.3193, lng: 114.1694, country: "China", countryCode: "HK", population: 7500700, region: "asia" },
  { name: "Wuhan", nameNormalized: "wuhan", lat: 30.5928, lng: 114.3055, country: "China", countryCode: "CN", population: 11081000, region: "asia" },
  { name: "Chongqing", nameNormalized: "chongqing", lat: 29.4316, lng: 106.9123, country: "China", countryCode: "CN", population: 15872000, region: "asia" },
  { name: "Xi'an", nameNormalized: "xian", lat: 34.3416, lng: 108.9398, country: "China", countryCode: "CN", population: 8705600, region: "asia" },
  { name: "Hangzhou", nameNormalized: "hangzhou", lat: 30.2741, lng: 120.1551, country: "China", countryCode: "CN", population: 10360000, region: "asia" },
  { name: "Nanjing", nameNormalized: "nanjing", lat: 32.0603, lng: 118.7969, country: "China", countryCode: "CN", population: 8505500, region: "asia" },
  { name: "Tianjin", nameNormalized: "tianjin", lat: 39.1422, lng: 117.1767, country: "China", countryCode: "CN", population: 13866000, region: "asia" },
  
  // Japan
  { name: "Tokyo", nameNormalized: "tokyo", lat: 35.6762, lng: 139.6503, country: "Japan", countryCode: "JP", population: 13960000, region: "asia", isCapital: true },
  { name: "Osaka", nameNormalized: "osaka", lat: 34.6937, lng: 135.5023, country: "Japan", countryCode: "JP", population: 2750995, region: "asia" },
  { name: "Yokohama", nameNormalized: "yokohama", lat: 35.4437, lng: 139.6380, country: "Japan", countryCode: "JP", population: 3749929, region: "asia" },
  { name: "Nagoya", nameNormalized: "nagoya", lat: 35.1815, lng: 136.9066, country: "Japan", countryCode: "JP", population: 2320361, region: "asia" },
  { name: "Sapporo", nameNormalized: "sapporo", lat: 43.0618, lng: 141.3545, country: "Japan", countryCode: "JP", population: 1970000, region: "asia" },
  { name: "Kyoto", nameNormalized: "kyoto", lat: 35.0116, lng: 135.7681, country: "Japan", countryCode: "JP", population: 1475183, region: "asia" },
  { name: "Fukuoka", nameNormalized: "fukuoka", lat: 33.5904, lng: 130.4017, country: "Japan", countryCode: "JP", population: 1581527, region: "asia" },
  { name: "Hiroshima", nameNormalized: "hiroshima", lat: 34.3853, lng: 132.4553, country: "Japan", countryCode: "JP", population: 1196274, region: "asia" },
  
  // South Korea
  { name: "Seoul", nameNormalized: "seoul", lat: 37.5665, lng: 126.9780, country: "South Korea", countryCode: "KR", population: 9733509, region: "asia", isCapital: true },
  { name: "Busan", nameNormalized: "busan", lat: 35.1796, lng: 129.0756, country: "South Korea", countryCode: "KR", population: 3448737, region: "asia" },
  { name: "Incheon", nameNormalized: "incheon", lat: 37.4563, lng: 126.7052, country: "South Korea", countryCode: "KR", population: 2957026, region: "asia" },
  { name: "Daegu", nameNormalized: "daegu", lat: 35.8714, lng: 128.6014, country: "South Korea", countryCode: "KR", population: 2438031, region: "asia" },
  
  // North Korea
  { name: "Pyongyang", nameNormalized: "pyongyang", lat: 39.0392, lng: 125.7625, country: "North Korea", countryCode: "KP", population: 3255288, region: "asia", isCapital: true },
  
  // Taiwan
  { name: "Taipei", nameNormalized: "taipei", lat: 25.0330, lng: 121.5654, country: "Taiwan", countryCode: "TW", population: 2602418, region: "asia", isCapital: true },
  { name: "Kaohsiung", nameNormalized: "kaohsiung", lat: 22.6273, lng: 120.3014, country: "Taiwan", countryCode: "TW", population: 2777873, region: "asia" },
  
  // India
  { name: "New Delhi", nameNormalized: "new delhi", lat: 28.6139, lng: 77.2090, country: "India", countryCode: "IN", population: 16787941, region: "asia", isCapital: true },
  { name: "Mumbai", nameNormalized: "mumbai", lat: 19.0760, lng: 72.8777, country: "India", countryCode: "IN", population: 20411274, region: "asia" },
  { name: "Bangalore", nameNormalized: "bangalore", lat: 12.9716, lng: 77.5946, country: "India", countryCode: "IN", population: 12765000, region: "asia" },
  { name: "Kolkata", nameNormalized: "kolkata", lat: 22.5726, lng: 88.3639, country: "India", countryCode: "IN", population: 14850066, region: "asia" },
  { name: "Chennai", nameNormalized: "chennai", lat: 13.0827, lng: 80.2707, country: "India", countryCode: "IN", population: 10971108, region: "asia" },
  { name: "Hyderabad", nameNormalized: "hyderabad", lat: 17.3850, lng: 78.4867, country: "India", countryCode: "IN", population: 10268653, region: "asia" },
  { name: "Ahmedabad", nameNormalized: "ahmedabad", lat: 23.0225, lng: 72.5714, country: "India", countryCode: "IN", population: 8059441, region: "asia" },
  { name: "Pune", nameNormalized: "pune", lat: 18.5204, lng: 73.8567, country: "India", countryCode: "IN", population: 6629347, region: "asia" },
  { name: "Jaipur", nameNormalized: "jaipur", lat: 26.9124, lng: 75.7873, country: "India", countryCode: "IN", population: 3073350, region: "asia" },
  
  // Pakistan
  { name: "Karachi", nameNormalized: "karachi", lat: 24.8607, lng: 67.0011, country: "Pakistan", countryCode: "PK", population: 14910352, region: "asia" },
  { name: "Lahore", nameNormalized: "lahore", lat: 31.5497, lng: 74.3436, country: "Pakistan", countryCode: "PK", population: 11126285, region: "asia" },
  { name: "Islamabad", nameNormalized: "islamabad", lat: 33.6844, lng: 73.0479, country: "Pakistan", countryCode: "PK", population: 1014825, region: "asia", isCapital: true },
  
  // Bangladesh
  { name: "Dhaka", nameNormalized: "dhaka", lat: 23.8103, lng: 90.4125, country: "Bangladesh", countryCode: "BD", population: 21741090, region: "asia", isCapital: true },
  { name: "Chittagong", nameNormalized: "chittagong", lat: 22.3569, lng: 91.7832, country: "Bangladesh", countryCode: "BD", population: 4009423, region: "asia" },
  
  // Southeast Asia
  { name: "Bangkok", nameNormalized: "bangkok", lat: 13.7563, lng: 100.5018, country: "Thailand", countryCode: "TH", population: 10539000, region: "asia", isCapital: true },
  { name: "Ho Chi Minh City", nameNormalized: "ho chi minh city", lat: 10.8231, lng: 106.6297, country: "Vietnam", countryCode: "VN", population: 8993082, region: "asia" },
  { name: "Hanoi", nameNormalized: "hanoi", lat: 21.0278, lng: 105.8342, country: "Vietnam", countryCode: "VN", population: 8053663, region: "asia", isCapital: true },
  { name: "Singapore", nameNormalized: "singapore", lat: 1.3521, lng: 103.8198, country: "Singapore", countryCode: "SG", population: 5685807, region: "asia", isCapital: true },
  { name: "Kuala Lumpur", nameNormalized: "kuala lumpur", lat: 3.1390, lng: 101.6869, country: "Malaysia", countryCode: "MY", population: 1982112, region: "asia", isCapital: true },
  { name: "Jakarta", nameNormalized: "jakarta", lat: -6.2088, lng: 106.8456, country: "Indonesia", countryCode: "ID", population: 10562088, region: "asia", isCapital: true },
  { name: "Manila", nameNormalized: "manila", lat: 14.5995, lng: 120.9842, country: "Philippines", countryCode: "PH", population: 1846513, region: "asia", isCapital: true },
  { name: "Phnom Penh", nameNormalized: "phnom penh", lat: 11.5564, lng: 104.9282, country: "Cambodia", countryCode: "KH", population: 2129371, region: "asia", isCapital: true },
  { name: "Yangon", nameNormalized: "yangon", lat: 16.8661, lng: 96.1951, country: "Myanmar", countryCode: "MM", population: 5160512, region: "asia" },
  { name: "Vientiane", nameNormalized: "vientiane", lat: 17.9757, lng: 102.6331, country: "Laos", countryCode: "LA", population: 948477, region: "asia", isCapital: true },
  
  // Middle East
  { name: "Dubai", nameNormalized: "dubai", lat: 25.2048, lng: 55.2708, country: "United Arab Emirates", countryCode: "AE", population: 3331420, region: "middle-east" },
  { name: "Abu Dhabi", nameNormalized: "abu dhabi", lat: 24.4539, lng: 54.3773, country: "United Arab Emirates", countryCode: "AE", population: 1483000, region: "middle-east", isCapital: true },
  { name: "Riyadh", nameNormalized: "riyadh", lat: 24.7136, lng: 46.6753, country: "Saudi Arabia", countryCode: "SA", population: 7676654, region: "middle-east", isCapital: true },
  { name: "Jeddah", nameNormalized: "jeddah", lat: 21.2854, lng: 39.2376, country: "Saudi Arabia", countryCode: "SA", population: 4076000, region: "middle-east" },
  { name: "Mecca", nameNormalized: "mecca", lat: 21.3891, lng: 39.8579, country: "Saudi Arabia", countryCode: "SA", population: 2042000, region: "middle-east" },
  { name: "Tel Aviv", nameNormalized: "tel aviv", lat: 32.0853, lng: 34.7818, country: "Israel", countryCode: "IL", population: 460613, region: "middle-east" },
  { name: "Jerusalem", nameNormalized: "jerusalem", lat: 31.7683, lng: 35.2137, country: "Israel", countryCode: "IL", population: 936425, region: "middle-east", isCapital: true },
  { name: "Tehran", nameNormalized: "tehran", lat: 35.6892, lng: 51.3890, country: "Iran", countryCode: "IR", population: 8846782, region: "middle-east", isCapital: true },
  { name: "Baghdad", nameNormalized: "baghdad", lat: 33.3152, lng: 44.3661, country: "Iraq", countryCode: "IQ", population: 7216040, region: "middle-east", isCapital: true },
  { name: "Beirut", nameNormalized: "beirut", lat: 33.8938, lng: 35.5018, country: "Lebanon", countryCode: "LB", population: 2226000, region: "middle-east", isCapital: true },
  { name: "Amman", nameNormalized: "amman", lat: 31.9454, lng: 35.9284, country: "Jordan", countryCode: "JO", population: 4007526, region: "middle-east", isCapital: true },
  { name: "Damascus", nameNormalized: "damascus", lat: 33.5138, lng: 36.2765, country: "Syria", countryCode: "SY", population: 2503000, region: "middle-east", isCapital: true },
  { name: "Kuwait City", nameNormalized: "kuwait city", lat: 29.3759, lng: 47.9774, country: "Kuwait", countryCode: "KW", population: 2989000, region: "middle-east", isCapital: true },
  { name: "Doha", nameNormalized: "doha", lat: 25.2854, lng: 51.5310, country: "Qatar", countryCode: "QA", population: 2382000, region: "middle-east", isCapital: true },
  { name: "Muscat", nameNormalized: "muscat", lat: 23.5880, lng: 58.3829, country: "Oman", countryCode: "OM", population: 1421409, region: "middle-east", isCapital: true },
  { name: "Manama", nameNormalized: "manama", lat: 26.2285, lng: 50.5860, country: "Bahrain", countryCode: "BH", population: 411000, region: "middle-east", isCapital: true },
  
  // Central Asia
  { name: "Kabul", nameNormalized: "kabul", lat: 34.5553, lng: 69.2075, country: "Afghanistan", countryCode: "AF", population: 4601789, region: "asia", isCapital: true },
  { name: "Tashkent", nameNormalized: "tashkent", lat: 41.2995, lng: 69.2401, country: "Uzbekistan", countryCode: "UZ", population: 2571668, region: "asia", isCapital: true },
  { name: "Almaty", nameNormalized: "almaty", lat: 43.2220, lng: 76.8512, country: "Kazakhstan", countryCode: "KZ", population: 1916822, region: "asia" },
  { name: "Astana", nameNormalized: "astana", lat: 51.1694, lng: 71.4491, country: "Kazakhstan", countryCode: "KZ", population: 1184469, region: "asia", isCapital: true },
  
  // ============================================
  // AFRICA
  // ============================================
  // North Africa
  { name: "Cairo", nameNormalized: "cairo", lat: 30.0444, lng: 31.2357, country: "Egypt", countryCode: "EG", population: 20076000, region: "africa", isCapital: true },
  { name: "Alexandria", nameNormalized: "alexandria", lat: 31.2001, lng: 29.9187, country: "Egypt", countryCode: "EG", population: 5200000, region: "africa" },
  { name: "Casablanca", nameNormalized: "casablanca", lat: 33.5731, lng: -7.5898, country: "Morocco", countryCode: "MA", population: 3359818, region: "africa" },
  { name: "Rabat", nameNormalized: "rabat", lat: 34.0209, lng: -6.8416, country: "Morocco", countryCode: "MA", population: 577827, region: "africa", isCapital: true },
  { name: "Marrakech", nameNormalized: "marrakech", lat: 31.6295, lng: -7.9811, country: "Morocco", countryCode: "MA", population: 928850, region: "africa" },
  { name: "Algiers", nameNormalized: "algiers", lat: 36.7538, lng: 3.0588, country: "Algeria", countryCode: "DZ", population: 3415811, region: "africa", isCapital: true },
  { name: "Tunis", nameNormalized: "tunis", lat: 36.8065, lng: 10.1815, country: "Tunisia", countryCode: "TN", population: 1056247, region: "africa", isCapital: true },
  { name: "Tripoli", nameNormalized: "tripoli", lat: 32.8867, lng: 13.1914, country: "Libya", countryCode: "LY", population: 1158000, region: "africa", isCapital: true },
  { name: "Khartoum", nameNormalized: "khartoum", lat: 15.5007, lng: 32.5599, country: "Sudan", countryCode: "SD", population: 5274321, region: "africa", isCapital: true },
  
  // West Africa
  { name: "Lagos", nameNormalized: "lagos", lat: 6.5244, lng: 3.3792, country: "Nigeria", countryCode: "NG", population: 14368000, region: "africa" },
  { name: "Abuja", nameNormalized: "abuja", lat: 9.0765, lng: 7.3986, country: "Nigeria", countryCode: "NG", population: 3464123, region: "africa", isCapital: true },
  { name: "Accra", nameNormalized: "accra", lat: 5.6037, lng: -0.1870, country: "Ghana", countryCode: "GH", population: 2514000, region: "africa", isCapital: true },
  { name: "Dakar", nameNormalized: "dakar", lat: 14.7167, lng: -17.4677, country: "Senegal", countryCode: "SN", population: 1146053, region: "africa", isCapital: true },
  { name: "Abidjan", nameNormalized: "abidjan", lat: 5.3600, lng: -4.0083, country: "Ivory Coast", countryCode: "CI", population: 4707000, region: "africa" },
  
  // East Africa
  { name: "Nairobi", nameNormalized: "nairobi", lat: -1.2921, lng: 36.8219, country: "Kenya", countryCode: "KE", population: 4397073, region: "africa", isCapital: true },
  { name: "Mombasa", nameNormalized: "mombasa", lat: -4.0435, lng: 39.6682, country: "Kenya", countryCode: "KE", population: 1208333, region: "africa" },
  { name: "Dar es Salaam", nameNormalized: "dar es salaam", lat: -6.7924, lng: 39.2083, country: "Tanzania", countryCode: "TZ", population: 6698000, region: "africa" },
  { name: "Addis Ababa", nameNormalized: "addis ababa", lat: 9.0320, lng: 38.7469, country: "Ethiopia", countryCode: "ET", population: 3352000, region: "africa", isCapital: true },
  { name: "Kampala", nameNormalized: "kampala", lat: 0.3476, lng: 32.5825, country: "Uganda", countryCode: "UG", population: 1650800, region: "africa", isCapital: true },
  { name: "Kigali", nameNormalized: "kigali", lat: -1.9403, lng: 29.8739, country: "Rwanda", countryCode: "RW", population: 1132686, region: "africa", isCapital: true },
  
  // Southern Africa
  { name: "Johannesburg", nameNormalized: "johannesburg", lat: -26.2041, lng: 28.0473, country: "South Africa", countryCode: "ZA", population: 5635127, region: "africa" },
  { name: "Cape Town", nameNormalized: "cape town", lat: -33.9249, lng: 18.4241, country: "South Africa", countryCode: "ZA", population: 4618000, region: "africa" },
  { name: "Pretoria", nameNormalized: "pretoria", lat: -25.7461, lng: 28.1881, country: "South Africa", countryCode: "ZA", population: 2921488, region: "africa", isCapital: true },
  { name: "Durban", nameNormalized: "durban", lat: -29.8587, lng: 31.0218, country: "South Africa", countryCode: "ZA", population: 3720953, region: "africa" },
  { name: "Harare", nameNormalized: "harare", lat: -17.8252, lng: 31.0335, country: "Zimbabwe", countryCode: "ZW", population: 1606000, region: "africa", isCapital: true },
  { name: "Lusaka", nameNormalized: "lusaka", lat: -15.3875, lng: 28.3228, country: "Zambia", countryCode: "ZM", population: 2906000, region: "africa", isCapital: true },
  { name: "Maputo", nameNormalized: "maputo", lat: -25.9692, lng: 32.5732, country: "Mozambique", countryCode: "MZ", population: 1766823, region: "africa", isCapital: true },
  { name: "Luanda", nameNormalized: "luanda", lat: -8.8390, lng: 13.2894, country: "Angola", countryCode: "AO", population: 8952496, region: "africa", isCapital: true },
  { name: "Kinshasa", nameNormalized: "kinshasa", lat: -4.4419, lng: 15.2663, country: "Democratic Republic of the Congo", countryCode: "CD", population: 14342000, region: "africa", isCapital: true },

  // ============================================
  // OCEANIA
  // ============================================
  // Australia
  { name: "Sydney", nameNormalized: "sydney", lat: -33.8688, lng: 151.2093, country: "Australia", countryCode: "AU", population: 5312163, region: "oceania" },
  { name: "Melbourne", nameNormalized: "melbourne", lat: -37.8136, lng: 144.9631, country: "Australia", countryCode: "AU", population: 5078193, region: "oceania" },
  { name: "Brisbane", nameNormalized: "brisbane", lat: -27.4698, lng: 153.0251, country: "Australia", countryCode: "AU", population: 2560700, region: "oceania" },
  { name: "Perth", nameNormalized: "perth", lat: -31.9505, lng: 115.8605, country: "Australia", countryCode: "AU", population: 2085973, region: "oceania" },
  { name: "Adelaide", nameNormalized: "adelaide", lat: -34.9285, lng: 138.6007, country: "Australia", countryCode: "AU", population: 1345777, region: "oceania" },
  { name: "Canberra", nameNormalized: "canberra", lat: -35.2809, lng: 149.1300, country: "Australia", countryCode: "AU", population: 453558, region: "oceania", isCapital: true },
  { name: "Gold Coast", nameNormalized: "gold coast", lat: -28.0167, lng: 153.4000, country: "Australia", countryCode: "AU", population: 679127, region: "oceania" },
  { name: "Darwin", nameNormalized: "darwin", lat: -12.4634, lng: 130.8456, country: "Australia", countryCode: "AU", population: 147255, region: "oceania" },
  
  // New Zealand
  { name: "Auckland", nameNormalized: "auckland", lat: -36.8485, lng: 174.7633, country: "New Zealand", countryCode: "NZ", population: 1657000, region: "oceania" },
  { name: "Wellington", nameNormalized: "wellington", lat: -41.2865, lng: 174.7762, country: "New Zealand", countryCode: "NZ", population: 215400, region: "oceania", isCapital: true },
  { name: "Christchurch", nameNormalized: "christchurch", lat: -43.5321, lng: 172.6362, country: "New Zealand", countryCode: "NZ", population: 381500, region: "oceania" },
  
  // Pacific Islands
  { name: "Suva", nameNormalized: "suva", lat: -18.1416, lng: 178.4419, country: "Fiji", countryCode: "FJ", population: 93970, region: "oceania", isCapital: true },
  { name: "Port Moresby", nameNormalized: "port moresby", lat: -9.4438, lng: 147.1803, country: "Papua New Guinea", countryCode: "PG", population: 364125, region: "oceania", isCapital: true },
];

// Build lookup maps for fast access
const cityByNameMap = new Map<string, WorldCity[]>();
const cityByCountryMap = new Map<string, WorldCity[]>();

WORLD_CITIES.forEach((city) => {
  // Index by normalized name
  const existing = cityByNameMap.get(city.nameNormalized) || [];
  existing.push(city);
  cityByNameMap.set(city.nameNormalized, existing);
  
  // Also index common variations
  const nameParts = city.nameNormalized.split(" ");
  if (nameParts.length > 1) {
    // Index first word only (e.g., "new" for "new york city")
    const firstWord = nameParts[0];
    if (firstWord.length > 3) {
      const existingFirst = cityByNameMap.get(firstWord) || [];
      if (!existingFirst.includes(city)) {
        existingFirst.push(city);
        cityByNameMap.set(firstWord, existingFirst);
      }
    }
  }
  
  // Index by country
  const countryKey = city.country.toLowerCase();
  const byCountry = cityByCountryMap.get(countryKey) || [];
  byCountry.push(city);
  cityByCountryMap.set(countryKey, byCountry);
});

export function findCityByName(name: string, country?: string): WorldCity | null {
  const normalized = normalize(name);
  const candidates = cityByNameMap.get(normalized);
  
  if (!candidates || candidates.length === 0) {
    // Try partial match
    for (const [key, cities] of cityByNameMap.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        if (country) {
          const match = cities.find(
            (c) => c.country.toLowerCase().includes(country.toLowerCase()) ||
                   c.countryCode.toLowerCase() === country.toLowerCase()
          );
          if (match) return match;
        }
        return cities[0];
      }
    }
    return null;
  }
  
  if (candidates.length === 1) {
    return candidates[0];
  }
  
  // Multiple cities with same name - try to match by country
  if (country) {
    const normalizedCountry = country.toLowerCase();
    const match = candidates.find(
      (c) => c.country.toLowerCase().includes(normalizedCountry) ||
             c.countryCode.toLowerCase() === normalizedCountry
    );
    if (match) return match;
  }
  
  // Return the one with highest population
  return candidates.sort((a, b) => b.population - a.population)[0];
}

export function findCitiesByCountry(country: string): WorldCity[] {
  const normalized = country.toLowerCase();
  return cityByCountryMap.get(normalized) || [];
}

export function findNearestCity(lat: number, lng: number): WorldCity | null {
  let nearest: WorldCity | null = null;
  let minDistance = Infinity;
  
  for (const city of WORLD_CITIES) {
    const distance = Math.sqrt(
      Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }
  
  return nearest;
}

export function getCapitalByCountry(country: string): WorldCity | null {
  const cities = findCitiesByCountry(country);
  return cities.find((c) => c.isCapital) || cities[0] || null;
}

export function getCitiesWithNews(): WorldCity[] {
  return WORLD_CITIES.filter((c) => c.population > 500000);
}

export { normalize };





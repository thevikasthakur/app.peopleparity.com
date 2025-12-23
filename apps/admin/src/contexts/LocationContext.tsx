import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LocationStatus = 'loading' | 'success' | 'not_supported' | 'permission_denied' | 'error';

interface LocationContextType {
  isInIndia: boolean;
  isLoading: boolean;
  status: LocationStatus;
  errorMessage: string | null;
  countryCode: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// India's approximate bounding box
const INDIA_BOUNDS = {
  north: 35.5,  // Northern tip (Kashmir)
  south: 6.5,   // Southern tip (Kanyakumari)
  east: 97.5,   // Eastern tip (Arunachal Pradesh)
  west: 68.0    // Western tip (Gujarat)
};

function isCoordinateInIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.south &&
    lat <= INDIA_BOUNDS.north &&
    lng >= INDIA_BOUNDS.west &&
    lng <= INDIA_BOUNDS.east
  );
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [isInIndia, setIsInIndia] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);

  useEffect(() => {
    const detectLocation = () => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        setStatus('not_supported');
        setIsLoading(false);
        return;
      }

      // Always request fresh location to ensure permission is still granted
      // This ensures the app cannot be used if permission is revoked
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const inIndia = isCoordinateInIndia(latitude, longitude);
          const detectedCountryCode = inIndia ? 'IN' : 'OTHER';

          setCountryCode(detectedCountryCode);
          setIsInIndia(inIndia);
          setStatus('success');
          setIsLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error.message, error.code);

          if (error.code === error.PERMISSION_DENIED) {
            setStatus('permission_denied');
          } else {
            setStatus('error');
            setErrorMessage(error.message || 'Failed to detect your location');
          }

          setIsLoading(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 0 // Always get fresh location, don't use cached
        }
      );
    };

    detectLocation();
  }, []);

  const value = {
    isInIndia,
    isLoading,
    status,
    errorMessage,
    countryCode
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}

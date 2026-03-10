import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

export interface Scheme {
    id: string;
    title: string;
    description: string;
    eligibility: string;
    benefits: string;
    applyLink: string;
}

const CACHE_KEY = '@agroseva_schemes_cache';

// Mocked Online Database (Real API goes here)
const REMOTE_SCHEMES: Scheme[] = [
    {
        id: 's1',
        title: 'PM-Kisan Samman Nidhi',
        description: 'Financial support of ₹6,000 per year in three equal installments to all landholding farmer families.',
        eligibility: 'All landholding farmers families, having cultivable landholding in their names.',
        benefits: '₹2,000 every 4 months directly to bank account via Direct Benefit Transfer.',
        applyLink: 'https://pmkisan.gov.in/',
    },
    {
        id: 's2',
        title: 'Kisan Credit Card (KCC)',
        description: 'Provides adequate and timely credit support from the banking system via a single window.',
        eligibility: 'All farmers, tenant farmers, oral lessees, and sharecroppers.',
        benefits: 'Short term crop loans up to ₹3 lakh at reduced interest rate of 4% per annum.',
        applyLink: 'https://sbi.co.in/web/agri-rural/agriculture-banking/crop-loan/kisan-credit-card',
    },
    {
        id: 's3',
        title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        description: 'A dedicated crop insurance scheme to protect farmers against crop failure due to natural calamities.',
        eligibility: 'Farmers growing notified crops in notified areas.',
        benefits: 'Financial support in the event of failure of any of the notified crop as a result of natural calamities.',
        applyLink: 'https://pmfby.gov.in/',
    },
    {
        id: 's4',
        title: 'Soil Health Card Scheme',
        description: 'Provides information to farmers on nutrient status of their soil along with recommendations on appropriate dosage.',
        eligibility: 'All farmers across India are covered.',
        benefits: 'Customized fertilizer recommendation based on actual soil test, reducing input costs and improving yield.',
        applyLink: 'https://soilhealth.dac.gov.in/',
    },
    {
        id: 's5',
        title: 'Paramparagat Krishi Vikas Yojana (PKVY)',
        description: 'Promotes organic farming through the adoption of organic village by cluster approach and PGS certification.',
        eligibility: 'Farmers who form a group or cluster of 50 or more farmers having 50 acre land.',
        benefits: 'Financial assistance of ₹50,000 per hectare for 3 years for seeds, harvesting, and transport.',
        applyLink: 'https://pgsindia-ncof.gov.in/',
    }
];

export const SchemesService = {
    /**
     * Fetch schemes with offline-first priority fallback.
     * If online: Fetches from remote and updates local cache.
     * If offline: Returns cached data.
     */
    getSchemes: async (): Promise<{ data: Scheme[]; isOffline: boolean }> => {
        try {
            const networkState = await Network.getNetworkStateAsync();

            if (networkState.isConnected && networkState.isInternetReachable !== false) {
                // --- ONLINE: Simulate API fetch ---
                // In real app: const response = await fetch('api/schemes'); const data = await response.json();
                const data = REMOTE_SCHEMES;

                // Cache the fresh data
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));

                return { data, isOffline: false };
            } else {
                // --- OFFLINE: Read from cache ---
                const cachedString = await AsyncStorage.getItem(CACHE_KEY);
                if (cachedString) {
                    const cachedData: Scheme[] = JSON.parse(cachedString);
                    return { data: cachedData, isOffline: true };
                }

                // Offline with NO cache
                return { data: [], isOffline: true };
            }
        } catch (error) {
            console.warn('Error fetching schemes:', error);

            // Fallback to cache on unexpected errors
            const cachedString = await AsyncStorage.getItem(CACHE_KEY);
            if (cachedString) {
                return { data: JSON.parse(cachedString), isOffline: true };
            }
            return { data: [], isOffline: true };
        }
    }
};

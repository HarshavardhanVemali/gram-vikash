import { getAuth } from 'firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.16.45.34:8000';

class MarketService {
    async getAuthToken() {
        const auth = getAuth();
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }
        return null;
    }

    async getMarketPrices({ cropName, state }) {
        if (!cropName || !state) {
            throw new Error('cropName and state are required');
        }

        const token = await this.getAuthToken();
        if (!token) throw new Error("User not authenticated");

        const params = new URLSearchParams({
            crop_name: cropName,
            state: state,
        });

        const response = await fetch(`${BASE_URL}/api/market/prices/?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Market API error: ${response.status} - ${errorData}`);
        }

        return response.json();
    }
}

export const marketService = new MarketService();

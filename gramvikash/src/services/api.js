import { API_KEYS } from '../constants/apiKeys';

const BASE_URL = 'https://api.gramvikash.in'; // Or local testing URL

export const api = {
    getWeather: async (lat, lon) => {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEYS.OPENWEATHERMAP_API_KEY}&units=metric`);
            return await response.json();
        } catch (error) {
            console.error('Weather fetching error:', error);
            throw error;
        }
    },
    // Add more API calls for backend integration
};

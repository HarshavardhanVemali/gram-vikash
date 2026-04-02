/**
 * MSG91 OTP Utility (Backend-Driven)
 * Redirects all OTP calls to your Django backend to avoid Captcha requirements
 * and keep sensitive Auth Keys server-side.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.16.45.34:8000';

/**
 * Request an OTP via the Django backend.
 * @param {string} mobile - 10-digit mobile number
 * @returns {Promise<{success: boolean, reqId?: string, message?: string}>}
 */
export async function sendOtp(mobile) {
    try {
        console.log(`Frontend: Requesting OTP for ${mobile} via ${API_URL}`);
        const response = await fetch(`${API_URL}/api/farmers/auth/request-otp/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: mobile }),
        });

        const data = await response.json();
        console.log('Backend response (sendOtp):', data);

        if (response.ok) {
            return { success: true, reqId: data.reqId };
        } else {
            return { success: false, message: data.error || 'Failed to send OTP.' };
        }
    } catch (error) {
        console.error('Error in sendOtp utility:', error);
        return { success: false, message: 'Network error. Is the backend running?' };
    }
}

/**
 * Verify OTP via the Django backend.
 * This endpoint will also return the JWT tokens on success.
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
export async function verifyOtp(mobile, otp) {
    try {
        console.log(`Frontend: Verifying OTP for ${mobile}`);
        const response = await fetch(`${API_URL}/api/farmers/auth/verify-otp/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: mobile, otp: otp }),
        });

        const data = await response.json();
        console.log('Backend response (verifyOtp):', data);

        if (response.ok) {
            return { success: true, data: data };
        } else {
            return { success: false, message: data.error || 'Invalid OTP.' };
        }
    } catch (error) {
        console.error('Error in verifyOtp utility:', error);
        return { success: false, message: 'Network error. Is the backend running?' };
    }
}

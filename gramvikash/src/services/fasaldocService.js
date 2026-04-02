import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.16.45.34:8000';

class FasaldocService {

    async getAuthToken() {
        const auth = getAuth();
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }
        return null;
    }

    async pickImage(useCamera = false) {
        try {
            if (useCamera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (permission.status !== 'granted') throw new Error('Camera permission not granted');
                return await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            } else {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (permission.status !== 'granted') throw new Error('Gallery permission not granted');
                return await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            }
        } catch (error) {
            console.error('Image picking error:', error);
            throw error;
        }
    }

    async submitDiagnosis(imageUri, cropType = '') {
        if (!imageUri) throw new Error('No image URI provided');

        const token = await this.getAuthToken();
        if (!token) throw new Error('User not authenticated');

        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match    = /\.(\w+)$/.exec(filename);
        const type     = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

        formData.append('image', { uri: imageUri, name: filename, type });
        if (cropType) formData.append('crop_type', cropType);

        try {
            const response = await fetch(`${BASE_URL}/api/crops/diagnose/`, {
                method:  'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                body:    formData,
            });
            if (!response.ok) throw new Error(`Failed to submit: ${response.status} - ${await response.text()}`);
            const data = await response.json();
            return data.task_id;
        } catch (error) {
            console.error('Submit Diagnosis Error:', error);
            throw error;
        }
    }

    async pollResult(taskId, maxAttempts = 30) {
        const token = await this.getAuthToken();
        if (!token) throw new Error('User not authenticated');

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${BASE_URL}/api/crops/result/${taskId}/`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'done' || data.status === 'error') return data;
                }
            } catch (error) {
                console.warn(`Polling attempt ${i + 1} failed:`, error);
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        throw new Error('Polling timeout: Analysis taking too long.');
    }

    // ── saveReport ─────────────────────────────────────────────────────────────
    // Called from FasalDocScreen with:
    // { type, language, diseaseName, scientificName, severity,
    //   severityPercentage, treatments, imageUri }
    async saveReport(data) {
        const token = await this.getAuthToken();

        // If not authenticated, cache locally and return gracefully
        if (!token) {
            console.warn('saveReport: not authenticated — caching locally only.');
            await this._cacheReportLocally(data);
            return null;
        }

        try {
            const payload = {
                scan_type:          data.type            || 'CROP',
                language:           data.language        || 'hi',
                disease_name:       data.diseaseName     || 'Unknown',
                scientific_name:    data.scientificName  || '',
                severity:           data.severity        || '',
                severity_pct:       data.severityPercentage ?? 50,
                treatments:         data.treatments      || [],
                // image_uri is local — backend may ignore or handle upload separately
                image_uri:          data.imageUri        || '',
                scanned_at:         new Date().toISOString(),
            };

            const response = await fetch(`${BASE_URL}/api/crops/save-report/`, {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`saveReport API error ${response.status}:`, errText);
                // Still cache locally so data isn't lost
                await this._cacheReportLocally(data);
                return null;
            }

            const responseData = await response.json();
            // Also keep a local copy for offline history
            await this._cacheReportLocally({ ...data, serverScanId: responseData.scan_id });
            return responseData.scan_id;
        } catch (error) {
            console.error('Save Report Error:', error);
            // Graceful fallback — cache locally
            await this._cacheReportLocally(data);
            return null;
        }
    }

    // ── Local cache (AsyncStorage) ─────────────────────────────────────────────
    async _cacheReportLocally(data) {
        try {
            const scans  = await this.getCachedScans();
            const newEntry = {
                id:                 data.serverScanId || Date.now().toString(),
                date:               new Date().toISOString(),
                type:               data.type            || 'CROP',
                language:           data.language        || 'hi',
                localImageUri:      data.imageUri        || '',
                diseaseName:        data.diseaseName     || 'Unknown',
                scientificName:     data.scientificName  || '',
                severity:           data.severity        || '',
                severityPercentage: data.severityPercentage ?? 50,
                treatments:         data.treatments      || [],
            };
            scans.unshift(newEntry);
            await AsyncStorage.setItem('fasaldoc_recent_scans', JSON.stringify(scans.slice(0, 10)));
        } catch (e) {
            console.error('Failed to cache scan locally:', e);
        }
    }

    async getCachedScans() {
        try {
            const raw = await AsyncStorage.getItem('fasaldoc_recent_scans');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse cached scans:', e);
            return [];
        }
    }

    async clearCachedScans() {
        try {
            await AsyncStorage.removeItem('fasaldoc_recent_scans');
        } catch (e) {
            console.error('Failed to clear cached scans:', e);
        }
    }

    // ── Legacy method kept for backward compatibility ──────────────────────────
    async saveCachedScan(scanResult, localImageUri) {
        await this._cacheReportLocally({
            type:               'CROP',
            language:           'hi',
            imageUri:           localImageUri,
            diseaseName:        scanResult.disease_name_local,
            scientificName:     '',
            severity:           scanResult.severity,
            severityPercentage: scanResult.confidence_pct,
            treatments:         scanResult.treatment_steps || [],
            serverScanId:       scanResult.id,
        });
    }
}

export const fasaldocService = new FasaldocService();
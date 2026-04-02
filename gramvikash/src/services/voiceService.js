import { Audio } from 'expo-av';
import { getAuth } from 'firebase/auth';

// Ensure you have an appropriate IP or URL for the real device to reach the local server
// Use the environment variable if available, otherwise fallback to local IP
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.16.45.34:8000';

class VoiceService {
    constructor() {
        this.recording = null;
        this.sound = null;
    }

    async getAuthToken() {
        const auth = getAuth();
        if (auth.currentUser) {
            return await auth.currentUser.getIdToken();
        }
        return null;
    }

    async startRecording(onPlaybackStatusUpdate = null) {
        try {
            console.log('Requesting permissions..');
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                throw new Error("Microphone permission not granted");
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            this.recording = recording;

            // set onPlaybackStatusUpdate if metering is requested
            if (onPlaybackStatusUpdate) {
                recording.setOnRecordingStatusUpdate(onPlaybackStatusUpdate);
                // Note: progress update interval needs to be set in options, HIGH_QUALITY defaults to 500ms
                // We might need to recreate options if we want faster updates like 100ms
            }

            return recording;
        } catch (err) {
            console.error('Failed to start recording', err);
            throw err;
        }
    }

    async stopRecording() {
        console.log('Stopping recording..');
        if (!this.recording) return null;

        try {
            await this.recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            const uri = this.recording.getURI();
            this.recording = null;
            console.log('Recording stopped and stored at', uri);
            return uri;
        } catch (error) {
            console.error("Failed to stop recording:", error);
            return null;
        }
    }

    async submitQuery(audioUri, contextStr = '{}') {
        if (!audioUri) throw new Error("No audio URI provided");

        const token = await this.getAuthToken();
        if (!token) throw new Error("User not authenticated");

        const formData = new FormData();

        // Append the file
        const filename = audioUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `audio/${match[1]}` : `audio`;

        formData.append('audio_file', {
            uri: audioUri,
            name: filename,
            type: type
        });

        formData.append('context', contextStr);

        try {
            const response = await fetch(`${BASE_URL}/api/voice/query/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to submit query: ${response.status} - ${errorData}`);
            }

            const data = await response.json();
            return data.task_id; // Return the task ID for polling
        } catch (error) {
            console.error("Submit Query Error:", error);
            throw error;
        }
    }

    async pollResult(taskId, maxAttempts = 20) {
        const token = await this.getAuthToken();
        if (!token) throw new Error("User not authenticated");

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`${BASE_URL}/api/voice/result/${taskId}/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'done' || data.status === 'error') {
                        return data; // Final state
                    }
                }
            } catch (error) {
                console.warn(`Polling attempt ${i + 1} failed:`, error);
            }

            // Wait 1.5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        throw new Error("Polling timeout: AI response took too long.");
    }

    async playAudio(audioUrl) {
        try {
            if (this.sound) {
                await this.sound.unloadAsync();
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );
            this.sound = sound;

            return new Promise((resolve) => {
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.didJustFinish) {
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Error playing audio', error);
        }
    }
}

export const voiceService = new VoiceService();

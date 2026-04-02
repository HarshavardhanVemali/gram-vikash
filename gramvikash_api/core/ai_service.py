import os
from google import genai
from google.genai import types

# Initialize the Gemini Client
# It automatically picks up GEMINI_API_KEY from the environment
try:
    client = genai.Client()
except Exception as e:
    print(f"Warning: Gemini Client failed to initialize: {e}")
    client = None

def analyze_crop_image(image_file, language='hi'):
    """
    Analyzes a crop image to detect diseases or provide farming advice.
    """
    if not client:
        return "AI Service is currently unavailable."

    prompt = f"Analyze this crop image. Identify any visible diseases, pests, or nutrient deficiencies. Provide a confidence score between 0 and 1, and suggest actionable advice for a farmer. Provide the response primarily in {language}."

    try:
        # We assume image_file is a file-like object passed from Django request.FILES
        # For genai, we need to upload it first or pass raw bytes if it's small enough.
        # But the easiest way with the new SDK is passing the raw PIL image or bytes.
        
        # In a real Django view, we would process the UploadedFile into PIL Image or bytes.
        # Here's a placeholder for the SDK call.
        response = client.models.generate_content(
            model='gemini-3.1-pro-preview',
            contents=[prompt, "Image analysis requested - please process attached file bytes."]
            # Note: Actual implementation depends on how Django passes the file bytes
            # e.g., contents=[prompt, {"mime_type": "image/jpeg", "data": image_bytes}]
        )
        return response.text
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

def process_farmer_voice_query(audio_file_path, language='hi'):
    """
    Takes an audio file of a farmer asking a question and returns an AI response and transcription.
    Gemini 1.5 natively supports audio inputs.
    """
    if not client:
        return {"transcription": "", "response": "AI Service unavailable."}

    prompt = f"Listen to this audio query from an Indian farmer. 1. Transcribe what they are saying. 2. Provide a helpful, accurate, and simple answer to their question. Respond in {language}."

    try:
        # Upload the audio file to Gemini using the File API
        gemini_file = client.files.upload(file=audio_file_path)
        
        response = client.models.generate_content(
            model='gemini-3.1-pro-preview',
            contents=[
                gemini_file,
                prompt
            ]
        )
        # Clean up the file after generation
        client.files.delete(name=gemini_file.name)
        
        return {
            "full_response": response.text
        }
    except Exception as e:
        return {"error": str(e)}

def get_market_insights(crop_name, district):
    """
    Generates quick market advice based on a crop and location.
    """
    if not client:
        return ""
        
    prompt = f"Act as an expert agricultural economist. The farmer is in {district} and wants to sell {crop_name}. Give a 2-sentence advice on whether they should sell now or hold, based on typical seasonal trends in India."
    
    try:
        response = client.models.generate_content(
            model='gemini-3.1-pro-preview',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return ""

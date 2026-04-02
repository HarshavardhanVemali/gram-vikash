async function run() {
  const model = "gemini-2.5-flash-preview-tts";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`;
  
  const body = {
    contents: [{"role": "user", "parts": [{"text": "Hello, this is a test!"}]}],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore"
          }
        }
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  if (data.error) {
    console.log("Error:", data.error);
    return;
  }
  
  const parts = data.candidates[0].content.parts;
  console.log("Parts:");
  console.log(JSON.stringify(parts, null, 2).slice(0, 500) + "...");
}
run();

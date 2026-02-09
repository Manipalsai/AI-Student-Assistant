import google.generativeai as genai
import os

# Try to use the key from environment or fallback
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyCTYLIR_3cTfXaPu7k4X6ILhIbt0OZWEyc") 
genai.configure(api_key=GOOGLE_API_KEY)

print(f"Checking models for API Key: {GOOGLE_API_KEY[:10]}...")

try:
    print("-" * 30)
    found_any = False
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"Model: {m.name}")
            found_any = True
    
    if not found_any:
        print("No models found that support generateContent.")
    print("-" * 30)

except Exception as e:
    print(f"Error listing models: {e}")

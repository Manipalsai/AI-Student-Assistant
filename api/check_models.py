import google.generativeai as genai
import os

# Try to use the key from environment or fallback
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyCTYLIR_3cTfXaPu7k4X6ILhIbt0OZWEyc") 
genai.configure(api_key=GOOGLE_API_KEY)

print(f"FULL DEBUG: Models available for key {GOOGLE_API_KEY[:5]}...")

try:
    models = list(genai.list_models())
    print(f"Total models found: {len(models)}")
    for m in models:
        print(f"Name: {m.name} | Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Error listing models: {e}")

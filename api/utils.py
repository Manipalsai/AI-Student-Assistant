import google.generativeai as genai
import os
import json
import typing
import fitz # PyMuPDF
from docx import Document
import markdown
import time
import random

# Initialize Gemini Model
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("WARNING: GOOGLE_API_KEY environment variable is not set. API calls will fail.")

# Configure globally
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("CRITICAL WARNING: GOOGLE_API_KEY not found.")

def get_working_model_name():
    """
    Dynamically finds a working generative model available for the current API key.
    Prioritizes 'flash' models for speed and higher rate limits.
    """
    try:
        # 1. List all available models
        all_models = [m for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        if not all_models:
             print("No models found that support generateContent.")
             return "gemini-pro"

        model_names = [m.name for m in all_models]
        # print(f"Available models: {model_names}")
        
        # 2. Prioritize: Any Flash > Any 1.5 Pro > Any Pro
        
        # Look for the newest flash model (usually last in sorted list, or specific)
        # But simple substring check is safer.
        for name in model_names:
            if "flash" in name.lower(): return name
        
        for name in model_names:
            if "gemini-1.5-pro" in name: return name
            
        for name in model_names:
            if "gemini-pro" in name: return name
            
        # 3. If no specific match, take the first one
        return model_names[0]

    except Exception as e:
        print(f"Error listing models: {e}. Defaulting to 'gemini-pro'.")
        return "gemini-pro"
        
# Cache the model name
CACHED_MODEL_NAME = None

def get_model():
    global CACHED_MODEL_NAME
    if not CACHED_MODEL_NAME:
        CACHED_MODEL_NAME = get_working_model_name()
        print(f"Using Gemini Model: {CACHED_MODEL_NAME}")
    
    return genai.GenerativeModel(CACHED_MODEL_NAME)

def extract_text(file_path: str) -> str:
    """
    Extracts text from PDF, DOCX, TXT, MD files.
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return ""
        
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif ext == ".pdf":
            text = ""
            with fitz.open(file_path) as doc:
                for page in doc:
                    text += page.get_text()
            return text
        elif ext == ".docx":
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        elif ext == ".md":
            with open(file_path, "r", encoding="utf-8") as f:
                return markdown.markdown(f.read())
        else:
            print(f"Unsupported file format: {ext}")
            return ""
    except Exception as e:
        print(f"File extraction error: {e}")
        return ""

def generate_with_retry(model, prompt, is_json=False, retries=3):
    """
    Helper to run generation with retry logic for 429 errors.
    """
    for attempt in range(retries):
        try:
            return model.generate_content(prompt)
        except Exception as e:
            if "429" in str(e):
                if attempt < retries - 1:
                    wait_time = (attempt + 1) * 2 + random.uniform(0, 1) # Simple backoff
                    print(f"Rate limit hit. Retrying in {wait_time:.2f}s...")
                    time.sleep(wait_time)
                    continue
            raise e
    return None

def get_gemini_json(prompt: str) -> typing.Any:
    """
    Helper to get JSON response from Gemini with retry.
    """
    json_prompt = prompt + "\n\nProvide the output strictly as a JSON object. Do not include Markdown blocks (```json ... ```)."
    
    try:
        model = get_model()
        result = generate_with_retry(model, json_prompt, is_json=True)
        text = result.text.strip()
        
        # Clean markdown code fences if present
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini JSON Error: {e}")
        return None

def get_gemini_text(prompt: str) -> str:
    """
    Helper to get plain text response with retry.
    """
    try:
        model = get_model()
        response = generate_with_retry(model, prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API Error: {e}")
        if "429" in str(e):
             return "Error: AI Rate Limit Exceeded. Please try again in a minute."
        return f"Error connecting to AI: {e}"

import google.generativeai as genai
import os
import json
import typing
import time
import random
import pypdf
from docx import Document
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini Model
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if not GOOGLE_API_KEY:
    print("CRITICAL WARNING: GOOGLE_API_KEY not found.")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

def get_working_model_name():
    try:
        models = genai.list_models()
        model_names = [m.name for m in models if 'generateContent' in m.supported_generation_methods]
        
        # 1. Prefer 1.5 Flash (Fast & reliable)
        for name in model_names:
            if "gemini-1.5-flash" in name: return name
            
        # 2. Fallback to Pro
        for name in model_names:
            if "gemini-pro" in name: return name
            
        return model_names[0]
    except Exception:
        return "gemini-1.5-flash" # Hard fallback

CACHED_MODEL_NAME = None

def get_model():
    global CACHED_MODEL_NAME
    if not CACHED_MODEL_NAME:
        CACHED_MODEL_NAME = get_working_model_name()
    return genai.GenerativeModel(CACHED_MODEL_NAME)

def extract_text(file_path: str) -> str:
    if not os.path.exists(file_path): return ""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        elif ext == ".pdf":
            text = ""
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    content = page.extract_text()
                    if content: text += content + "\n"
            return text
        elif ext == ".docx":
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        return ""
    except Exception as e:
        print(f"Extraction error: {e}")
        return ""

def generate_with_retry(model, prompt, retries=3):
    for attempt in range(retries):
        try:
            return model.generate_content(prompt)
        except Exception as e:
            if "429" in str(e) and attempt < retries - 1:
                time.sleep((attempt + 1) * 2)
                continue
            raise e
    return None

def get_gemini_json(context: str, instruction: str) -> typing.Any:
    full_prompt = f"Background Content:\n{context}\n\nTask: {instruction}\n\nReturn ONLY raw JSON. No markdown code blocks."
    try:
        model = get_model()
        result = generate_with_retry(model, full_prompt)
        text = result.text.strip()
        
        # Clean markdown
        if text.startswith("```json"): text = text[7:]
        elif text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"JSON Error: {e}")
        return None

def get_gemini_text(context: str, instruction: str) -> str:
    full_prompt = f"Context:\n{context}\n\nInstructions: {instruction}"
    try:
        model = get_model()
        response = generate_with_retry(model, full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Text Error: {e}")
        return f"Error: {str(e)}"

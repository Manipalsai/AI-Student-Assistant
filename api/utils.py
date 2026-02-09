import warnings
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
import os

print("🚀 BACKEND STARTING: AI Student Assistant API is loading...")
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

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

def get_model():
    """
    Finds the best available model. 
    Prioritizes 1.5-flash for speed and higher free-tier quotas.
    """
    try:
        # Check available models for this specific key
        available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        # Priority order to stay within stable quotas
        priorities = [
            "models/gemini-1.5-flash",
            "models/gemini-1.5-flash-latest",
            "models/gemini-pro"
        ]
        
        for model_path in priorities:
            if model_path in available_models:
                return genai.GenerativeModel(model_path)
        
        # Fallback to whatever is available
        return genai.GenerativeModel(available_models[0])
    except Exception as e:
        print(f"Model selection log: {e}")
        # Final hard-coded fallback
        return genai.GenerativeModel("gemini-1.5-flash")

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

def get_gemini_text(context: str, instruction: str) -> str:
    """Gets plain text from Gemini."""
    try:
        model = get_model()
        full_prompt = f"DOCUMENT CONTEXT:\n{context}\n\nUSER INSTRUCTION:\n{instruction}"
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Text Error: {e}")
        return f"Error: {str(e)}"

def get_gemini_json(context: str, instruction: str) -> typing.Any:
    """Gets JSON from Gemini."""
    try:
        model = get_model()
        full_prompt = f"CONTEXT:\n{context}\n\nTASK: {instruction}\n\nIMPORTANT: Return ONLY valid JSON. No markdown blocks."
        response = model.generate_content(full_prompt)
        text = response.text.strip()
        
        # Clean up Markdown JSON blocks if AI adds them
        if text.startswith("```json"): text = text[7:]
        elif text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        
        return json.loads(text.strip())
    except Exception as e:
        print(f"Gemini JSON Error: {e}")
        return None

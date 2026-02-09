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
    print("CRITICAL WARNING: GOOGLE_API_KEY not found. API requests will fail.")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

def get_working_model():
    """
    Finds the best available model with the highest quota.
    Prioritizes 1.5-flash (1500 RPD) over experimental models.
    """
    try:
        available = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
        
        # Priority: standard 1.5 flash has the best free tier limits (15 RPM, 1500 RPD)
        # We avoid "latest" or experimental models which often have tighter limits.
        priorities = ["models/gemini-1.5-flash", "models/gemini-1.5-flash-latest", "models/gemini-pro"]
        
        for p in priorities:
            if p in available:
                print(f"Selecting model: {p}")
                return genai.GenerativeModel(p)
        
        # If none of our priorities are available, fall back to anything supporting generation
        # but try to avoid newer/experimental ones if possible
        for m in available:
            if "flash" in m and "2.0" not in m and "2.5" not in m:
                return genai.GenerativeModel(m)
                
        return genai.GenerativeModel(available[0])
    except Exception as e:
        print(f"Model resolution error: {e}")
        return genai.GenerativeModel("gemini-1.5-flash")

def get_model():
    return get_working_model()

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

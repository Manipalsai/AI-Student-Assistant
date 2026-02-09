from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import tempfile
from dotenv import load_dotenv

# Load local .env file if it exists
load_dotenv()

# Import utilities
try:
    from .utils import extract_text, get_gemini_text, get_gemini_json
except ImportError:
    from utils import extract_text, get_gemini_text, get_gemini_json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class TextRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    text: str
    query: str
    history: List[dict] = []

@app.get("/api/health")
async def health():
    return {"status": "healthy", "api_key_configured": bool(os.environ.get("GOOGLE_API_KEY"))}

@app.post("/api/extract-text")
async def api_extract_text(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as buffer:
        shutil.copyfileobj(file.file, buffer)
        temp_path = buffer.name
        
    try:
        text = extract_text(temp_path)
        os.remove(temp_path)
        if not text:
            raise HTTPException(status_code=500, detail="Failed to extract text")
        return {"text": text, "filename": file.filename}
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/summarize")
async def summarize(request: TextRequest):
    try:
        prompt = """
        Summarize the following text professionally. 
        Use clear headings, bullet points, and bold key terms.
        Focus on the most important concepts.
        """
        summary = get_gemini_text(request.text, prompt)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mcq")
async def generate_mcqs(request: TextRequest):
    try:
        prompt = """
        Generate 10 multiple choice questions from this text.
        Return ONLY a JSON list of objects with this format:
        [{"question": "...", "options": ["...", "...", "..."], "answer": 0}]
        Where 'answer' is the index of the correct option.
        """
        mcqs = get_gemini_json(request.text, prompt)
        return {"mcqs": mcqs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flashcards")
async def generate_flashcards(request: TextRequest):
    try:
        prompt = """
        Generate 10 flashcards from this text.
        Return ONLY a JSON list of objects:
        [{"front": "...", "back": "..."}]
        """
        flashcards = get_gemini_json(request.text, prompt)
        return {"flashcards": flashcards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        instruction = f"User Query: {request.query}\nAnswer based on the document provided."
        response = get_gemini_text(request.text, instruction)
        return {"answer": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import shutil
import uuid
import tempfile
from dotenv import load_dotenv

# Load local .env file if it exists
load_dotenv()

# Import utilities
from utils import extract_text, get_gemini_text, get_gemini_json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for Requests ---
class TextRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    text: str
    query: str
    history: List[dict] = []  # [{"role": "user", "content": "..."}, {"role": "ai", "content": "..."}]

# --- Endpoints ---

@app.get("/api/")
def read_root():
    return {"message": "AI Study Assistant API is running!"}

@app.post("/api/extract-text")
async def extract_text_endpoint(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded file and returns it. 
    This allows the frontend to hold the state (text) and send it to other endpoints.
    """
    # Use system's temporary directory for cross-platform compatibility
    temp_dir = tempfile.gettempdir()
    file_location = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")
    
    try:
        with open(file_location, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        text = extract_text(file_location)
        if not text:
             # If text is empty, it might be an extraction error that utils.extract_text caught and printed but returned ""
             # Or it might be an empty file.
             return {"text": "", "warning": "No text extracted. The file might be empty or scanned image."}

        return {"text": text}
    
    except Exception as e:
        print(f"Server Error in /api/extract-text: {e}") # Print to server logs
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        if os.path.exists(file_location):
            # Close file handle if any? (shutil.copyfileobj doesn't keep it open)
            try:
                os.remove(file_location)
            except Exception as e:
                print(f"Warning: Failed to delete temp file {file_location}: {e}")

@app.post("/api/summarize")
async def summarize(request: TextRequest):
    """
    Summarizes the provided text.
    """
    try:
        if not request.text:
             raise HTTPException(status_code=400, detail="No text provided to summarize.")

        prompt = f"""
        You are an expert academic tutor. Create a balanced, high-yield study guide from the following text.
        
        GOALS:
        - Identify the most important 50% of the content (the "High-Yield" info).
        - Provide clear, punchy explanations for core concepts.
        - Ensure every section adds value; avoid both extreme brevity and unnecessary filler.
        - Create a logical flow that is easy to follow for review.
        
        FORMATTING:
        - Use H1 (#) for the overall title.
        - Use H2 (##) for main thematic sections.
        - Use H3 (###) for specific sub-topics.
        - Use Bold (**) for technical terms and key vocabulary.
        - Use Bullet points (*) for organized lists.
        
        Input Text:
        {request.text[:100000]} 
        """
        # Limit text to avoid token limits per request
        
        summary = get_gemini_text(prompt)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/mcq")
async def generate_mcqs(request: TextRequest):
    """
    Generates MCQs from text.
    """
    try:
        prompt = f"""
        Create 10 multiple-choice questions (MCQs) based on the text.
        Return JSON format: {{ "mcqs": [ {{ "question": "Question text?", "options": ["Option 1", "Option 2", "Option 3", "Option 4"], "answer": 0 }} ] }}
        Note: The 'answer' field must be the integer index (0-3) of the correct option.
        
        Text:
        {request.text[:50000]}
        """
        result = get_gemini_json(prompt)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate MCQs from AI.")
        return result 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flashcards")
async def generate_flashcards(request: TextRequest):
    """
    Generates Flashcards from text.
    """
    try:
        prompt = f"""
        Create 10 flashcards (Front/Back) based on the text.
        Return JSON format: {{ "flashcards": [ {{ "front": "Term", "back": "Definition" }} ] }}
        
        Text:
        {request.text[:50000]}
        """
        result = get_gemini_json(prompt)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to generate Flashcards from AI.")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_doc(request: ChatRequest):
    """
    Chat with the document text.
    """
    try:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in request.history[-5:]]) # Limit history
        
        prompt = f"""
        Answer the user's question based on the document text below.
        
        Document Text:
        {request.text[:30000]} 
        
        Chat History:
        {history_text}
        
        User Question: {request.query}
        """
        
        answer = get_gemini_text(prompt)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import shutil
import google.generativeai as genai
import PyPDF2
from docx import Document
import markdown
import re
import random
from io import BytesIO
from fpdf import FPDF
from fastapi.responses import JSONResponse, StreamingResponse

# This is the single file extractor
def extract_text(file_path):
    _, ext = os.path.splitext(file_path)
    if ext == ".pdf":
        text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    elif ext == ".docx":
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    elif ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise ValueError("Unsupported file format.")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")
else:
    raise RuntimeError("GOOGLE_API_KEY environment variable is not set.")

@app.get("/api/")
def read_root():
    return {"message": "Welcome to AI Study Assistant API!"}

@app.post("/api/summarize")
async def summarize(file: UploadFile = File(...)):
    file_path = os.path.join("/tmp", file.filename)
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        extracted_text = extract_text(file_path)
        prompt = f"""
        Generate a clean, readable summary of the following text.
        ... your prompt instructions here ...
        Text: {extracted_text}
        """
        response = model.generate_content(prompt)
        summary = response.text.strip()
        
        return JSONResponse(content={"summary": summary})
    except Exception as e:
        print(f"Error during summarization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/api/generate-mcqs")
async def generate_mcqs_api(file: UploadFile = File(...)):
    file_path = os.path.join("/tmp", file.filename)
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        study_content = extract_text(file_path)
        prompt1 = f"""
        Generate 10 multiple choice questions (MCQs) based on the following study material.
        Material: {study_content}
        """
        questions = model.generate_content(prompt1).text.strip()
        return {"mcqs": questions}
    except Exception as e:
        print(f"Error generating MCQs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate MCQs: {e}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

class MCQRequest(BaseModel):
    mcqs: str

@app.post("/api/save-pdf")
async def save_pdf(data: MCQRequest):
    mcqs_text = data.mcqs
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    for line in mcqs_text.split("\n"):
        pdf.multi_cell(0, 10, line)
    buffer = BytesIO()
    pdf.output(buffer)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=mcqs_output.pdf"
    })

# IMPORTANT: The /get-quiz endpoint cannot rely on a non-existent local file.
# It should be removed, as the MCQs should be stored in the frontend state.
# Your frontend already handles this by receiving the MCQs directly.
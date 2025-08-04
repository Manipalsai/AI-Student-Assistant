# =========================================================================
# FINAL app.py - All backend logic consolidated and Vercel-ready
# =========================================================================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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

# Import your local modules now that they are in the same folder
from summarize_text import summarize_text
from generate_mcqs import generate_mcqs
from run_quiz import load_mcqs
from text_extractor import extract_text

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
        
        # We need to make sure the summarize_text function is defined and used correctly
        summary = summarize_text(file_path)
        
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
        
        mcqs_text, _ = generate_mcqs(file_path)
        return {"mcqs": mcqs_text}
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

# The /get-quiz endpoint must be refactored to not rely on a local file
# This is a placeholder and should be removed. The MCQs are already handled by the frontend.
@app.get("/api/get-quiz")
def get_quiz():
    raise HTTPException(status_code=404, detail="This endpoint is not used in this version.")
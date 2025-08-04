from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from io import BytesIO
from fpdf import FPDF
import os

from summarize_text import summarize_text
from generate_mcqs import generate_mcqs  
from run_quiz import load_mcqs

app = FastAPI()

#CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

#SUMMARY API
@app.post("/summarize")
async def summarize(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        summary = summarize_text(file_path)
        return JSONResponse(content={"summary": summary})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

#MCQ GENERATION API
@app.post("/generate-mcqs")
async def generate(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(await file.read())

    try:
        mcqs_text, _ = generate_mcqs(file_path)
        return {"mcqs": mcqs_text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

#SAVE MCQs AS PDF API
class MCQRequest(BaseModel):
    mcqs: str

@app.post("/save-pdf")
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

# QUIZ API
@app.get("/get-quiz")
def get_quiz():
    try:
        mcqs = load_mcqs("mcqs_output.txt")
        return {"mcqs": mcqs}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/")
def read_root():
    return {"message": "Welcome to AI Study Assistant API!"}
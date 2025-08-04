
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from io import BytesIO
from fpdf import FPDF
import os
import shutil # Import shutil for safe file operations


from .summarize_text import summarize_text
from .generate_mcqs import generate_mcqs 
from .run_quiz import load_mcqs

app = FastAPI()

# CORS Setup - Essential for frontend to backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, consider restricting in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Use /tmp for temporary file storage in Vercel serverless environment
TEMP_UPLOAD_DIR = "/tmp/uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True) # Ensure the directory exists



# Root endpoint (optional, for testing if API is live)
@app.get("/api/")
def read_root():
    return {"message": "Welcome to AI Study Assistant API!"}

# SUMMARY API
@app.post("/api/summarize")
async def summarize(file: UploadFile = File(...)):
    # Create a unique temporary file path
    file_path = os.path.join(TEMP_UPLOAD_DIR, file.filename)
    
    # Save the uploaded file to the temporary directory
    try:
        with open(file_path, "wb") as f:
            # Use shutil.copyfileobj for efficient file writing
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        file.file.close() # Ensure the UploadFile stream is closed

    try:
        summary = summarize_text(file_path)
        return JSONResponse(content={"summary": summary})
    except Exception as e:
        # Log the full error for debugging in Vercel logs
        print(f"Error during summarization: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {e}")
    finally:
        # Clean up the temporary file after processing
        if os.path.exists(file_path):
            os.remove(file_path)

# MCQ GENERATION API
@app.post("/api/generate-mcqs")
async def generate_mcqs_api(file: UploadFile = File(...)):
    file_path = os.path.join(TEMP_UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        file.file.close()

    try:
        mcqs_text, _ = generate_mcqs(file_path) # Assuming generate_mcqs returns text and something else
        return {"mcqs": mcqs_text}
    except Exception as e:
        print(f"Error generating MCQs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate MCQs: {e}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# SAVE MCQs AS PDF API
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

@app.get("/api/get-quiz")
def get_quiz():
    try:
        if not os.path.exists("mcqs_output.txt"):
             raise FileNotFoundError("mcqs_output.txt not found. MCQs must be generated first.")
             
        mcqs = load_mcqs("mcqs_output.txt")
        return {"mcqs": mcqs}
    except Exception as e:
        print(f"Quiz load error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load quiz: {e}")
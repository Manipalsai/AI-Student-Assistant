from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import shutil
import tempfile
import uuid
import time
from dotenv import load_dotenv

load_dotenv()

# Import Utilities & RAG Services
try:
    from .utils import extract_pages, extract_text, get_gemini_text, get_gemini_json
    from .services.chunking_service import ChunkingService
    from .services.vector_service import VectorService
    from .services.rag_service import RAGService
    from .services.learning_service import LearningService
    from .services.evaluation_service import EvaluationService
except ImportError:
    from utils import extract_pages, extract_text, get_gemini_text, get_gemini_json
    from services.chunking_service import ChunkingService
    from services.vector_service import VectorService
    from services.rag_service import RAGService
    from services.learning_service import LearningService
    from services.evaluation_service import EvaluationService

app = FastAPI(
    title="AI Student Assistant — RAG Learning Platform API",
    description="Production-grade Grounded RAG Backend for AI Student Assistant",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Service Singletons
chunking_service = ChunkingService(chunk_size=800, chunk_overlap=120)
vector_service = VectorService()
rag_service = RAGService(vector_service=vector_service)
learning_service = LearningService()
evaluation_service = EvaluationService(vector_service=vector_service, rag_service=rag_service)

# In-Memory Document Metadata Registry
documents_registry: Dict[str, Dict[str, Any]] = {}

def get_active_context_text(document_ids: Optional[List[str]] = None, raw_text: Optional[str] = None) -> str:
    """
    Helper function to aggregate uploaded document text context robustly.
    """
    if document_ids and len(document_ids) > 0:
        chunks = [c["text"] for c in vector_service.in_memory_chunks if c["document_id"] in document_ids]
        if chunks:
            return "\n\n".join(chunks[:25])
        doc_texts = [documents_registry[d]["full_text"] for d in document_ids if d in documents_registry]
        if doc_texts:
            return "\n\n".join(doc_texts)

    if raw_text and raw_text.strip():
        return raw_text.strip()

    # Fallback to all indexed chunks in vector service
    if vector_service.in_memory_chunks:
        return "\n\n".join([c["text"] for c in vector_service.in_memory_chunks[:25]])

    # Fallback to all uploaded documents in registry
    if documents_registry:
        return "\n\n".join([d["full_text"] for d in documents_registry.values() if d.get("full_text")])

    return ""

# --- Pydantic API Models ---
class TextRequest(BaseModel):
    text: Optional[str] = ""
    document_ids: Optional[List[str]] = []

class ChatRequest(BaseModel):
    query: str
    text: Optional[str] = ""
    document_ids: Optional[List[str]] = []
    history: List[Dict[str, str]] = Field(default_factory=list)
    explanation_style: Optional[str] = "standard"
    target_language: Optional[str] = "English"

class QuizGenRequest(BaseModel):
    text: Optional[str] = ""
    document_ids: Optional[List[str]] = []
    num_questions: Optional[int] = 10
    difficulty: Optional[str] = "Medium"
    weak_topic: Optional[str] = None

class QuizSubmitRequest(BaseModel):
    document_id: Optional[str] = "general"
    topic: Optional[str] = "General Concept"
    score: float
    total_questions: int
    correct_count: int
    difficulty: Optional[str] = "Medium"

class FlashcardGenRequest(BaseModel):
    text: Optional[str] = ""
    document_ids: Optional[List[str]] = []
    num_cards: Optional[int] = 10
    difficulty: Optional[str] = "Medium"

class StudyPlanRequest(BaseModel):
    subject: str
    exam_date: str
    daily_hours: float = 2.0
    current_level: str = "Intermediate"
    document_ids: Optional[List[str]] = []

# --- Routes ---

@app.get("/")
async def root():
    return {
        "message": "AI Student Assistant RAG Learning Platform API v2.0 is running",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "api_key_configured": bool(os.environ.get("GOOGLE_API_KEY")),
        "documents_count": len(documents_registry),
        "vector_chunks_count": len(vector_service.in_memory_chunks)
    }

# --- Document Ingestion & Management ---

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt", ".md"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, TXT, or MD.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as buffer:
        shutil.copyfileobj(file.file, buffer)
        temp_path = buffer.name

    try:
        pages = extract_pages(temp_path)
        os.remove(temp_path)

        if not pages:
            raise HTTPException(status_code=400, detail="Failed to extract readable text or document is empty.")

        document_id = f"doc_{uuid.uuid4().hex[:10]}"
        filename = file.filename

        chunks = chunking_service.create_chunks_from_pages(
            document_id=document_id,
            document_name=filename,
            pages=pages,
            source_type=ext[1:]
        )

        indexed_count = vector_service.add_chunks(chunks)
        full_text = "\n\n".join([p["text"] for p in pages])

        doc_meta = {
            "id": document_id,
            "filename": filename,
            "file_type": ext[1:].upper(),
            "pages_count": len(pages),
            "chunks_count": indexed_count,
            "upload_timestamp": time.time(),
            "status": "Ready",
            "full_text": full_text
        }

        documents_registry[document_id] = doc_meta

        return {
            "document": doc_meta,
            "message": f"Successfully processed and indexed '{filename}' ({len(pages)} pages, {indexed_count} chunks)."
        }

    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")


@app.get("/api/documents")
async def list_documents():
    return {
        "documents": list(documents_registry.values())
    }


@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    if document_id in documents_registry:
        del documents_registry[document_id]
        vector_service.delete_document(document_id)
        return {"message": f"Document {document_id} removed successfully."}
    raise HTTPException(status_code=404, detail="Document not found.")

# --- Grounded RAG Chat ---

@app.post("/api/rag/query")
@app.post("/api/chat")
async def rag_chat(request: ChatRequest):
    try:
        doc_ids = request.document_ids or []
        if not doc_ids and documents_registry:
            doc_ids = list(documents_registry.keys())

        if not doc_ids and request.text and request.text.strip():
            temp_id = f"temp_{uuid.uuid4().hex[:6]}"
            pages = [{"page_number": 1, "text": request.text}]
            chunks = chunking_service.create_chunks_from_pages(temp_id, "Uploaded Context", pages)
            vector_service.add_chunks(chunks)
            doc_ids = [temp_id]

        res = rag_service.query_rag(
            query=request.query,
            document_ids=doc_ids,
            history=request.history,
            explanation_style=request.explanation_style or "standard",
            target_language=request.target_language or "English"
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Summarization ---

@app.post("/api/summarize")
async def summarize(request: TextRequest):
    try:
        context_text = get_active_context_text(request.document_ids, request.text)
        if not context_text:
            raise HTTPException(status_code=400, detail="Please upload a document to generate a summary.")

        instruction = (
            "Generate a clear, professional Master Study Summary with:\n"
            "## 📌 Executive Overview\n"
            "## 💡 Core Concepts & Definitions\n"
            "## 📐 Important Principles & Formulas\n"
            "## 🎯 Key Exam & Interview Takeaways"
        )
        summary = get_gemini_text(context_text[:35000], instruction)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Adaptive Quizzes & Flashcards ---

@app.post("/api/quiz")
@app.post("/api/mcq")
async def generate_quiz(request: QuizGenRequest):
    try:
        context_text = get_active_context_text(request.document_ids, request.text)
        if not context_text:
            raise HTTPException(status_code=400, detail="Please upload a document first to generate a quiz.")

        mcqs = learning_service.generate_adaptive_quiz(
            context_text=context_text,
            num_questions=request.num_questions or 10,
            difficulty=request.difficulty or "Medium",
            weak_topic=request.weak_topic
        )
        return {"mcqs": mcqs, "quiz": mcqs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/quiz/submit")
async def submit_quiz(request: QuizSubmitRequest):
    try:
        result = learning_service.record_quiz_attempt(
            document_id=request.document_id or "general",
            topic=request.topic or "General Concept",
            score=request.score,
            total_questions=request.total_questions,
            correct_count=request.correct_count,
            difficulty=request.difficulty or "Medium"
        )
        return {"message": "Quiz attempt recorded", "attempt": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/flashcards")
async def generate_flashcards(request: FlashcardGenRequest):
    try:
        context_text = get_active_context_text(request.document_ids, request.text)
        if not context_text:
            raise HTTPException(status_code=400, detail="Please upload a document first to generate flashcards.")

        cards = learning_service.generate_flashcards(
            context_text=context_text,
            num_cards=request.num_cards or 10,
            difficulty=request.difficulty or "Medium"
        )
        return {"flashcards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Analytics & AI Study Plan ---

@app.get("/api/analytics")
async def get_analytics():
    return learning_service.get_analytics()


@app.post("/api/study-plan")
async def generate_study_plan(request: StudyPlanRequest):
    try:
        context_text = get_active_context_text(request.document_ids)
        doc_summary = context_text[:3000] if context_text else f"Study material for {request.subject}"

        plan = learning_service.generate_study_plan(
            subject=request.subject,
            exam_date=request.exam_date,
            daily_hours=request.daily_hours,
            current_level=request.current_level,
            documents_summary=doc_summary
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Quantitative Evaluation ---

@app.post("/api/eval/run")
async def run_evaluation():
    try:
        res = evaluation_service.run_evaluation_benchmark(test_dataset=[])
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Legacy Compatibility Route ---

@app.post("/api/extract-text")
async def legacy_extract_text(file: UploadFile = File(...)):
    res = await upload_document(file)
    return {
        "text": res["document"]["full_text"],
        "filename": res["document"]["filename"],
        "document_id": res["document"]["id"]
    }
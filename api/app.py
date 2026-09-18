from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import os
import json
import shutil
import tempfile
import uuid
import time
from dotenv import load_dotenv

load_dotenv()

# Import Utilities & RAG Services
try:
    from .utils import extract_pages, extract_text, get_gemini_text, get_gemini_json, llm_provider_service
    from .services.chunking_service import ChunkingService
    from .services.vector_service import VectorService
    from .services.rag_service import RAGService
    from .services.learning_service import LearningService
    from .services.evaluation_service import EvaluationService
except ImportError:
    from utils import extract_pages, extract_text, get_gemini_text, get_gemini_json, llm_provider_service
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

# In-Memory Document Metadata Registry with persistent disk sync
documents_registry: Dict[str, Dict[str, Any]] = {}
def _get_docs_cache_path() -> str:
    local_path = os.path.join(os.path.dirname(__file__), "data", "documents_cache.json")
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        test_file = os.path.join(os.path.dirname(local_path), ".perm_test")
        with open(test_file, "w") as f:
            f.write("1")
        os.remove(test_file)
        return local_path
    except Exception:
        return os.path.join(tempfile.gettempdir(), "documents_cache.json")

DOCS_CACHE_FILE = _get_docs_cache_path()

def _save_docs_cache():
    try:
        os.makedirs(os.path.dirname(DOCS_CACHE_FILE), exist_ok=True)
        with open(DOCS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(documents_registry, f)
    except Exception as e:
        print(f"[WARN] Failed to save documents cache: {e}")

def _load_docs_cache():
    global documents_registry
    if os.path.exists(DOCS_CACHE_FILE):
        try:
            with open(DOCS_CACHE_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                if isinstance(loaded, dict):
                    documents_registry.update(loaded)
                    for doc_id, doc in documents_registry.items():
                        if not any(c.get("document_id") == doc_id for c in vector_service.in_memory_chunks):
                            txt = doc.get("full_text", "")
                            if txt:
                                pages = [{"page_number": 1, "text": txt}]
                                chunks = chunking_service.create_chunks_from_pages(
                                    document_id=doc_id,
                                    document_name=doc.get("filename", "document"),
                                    pages=pages,
                                    source_type=doc.get("file_type", "TXT").lower()
                                )
                                vector_service.add_chunks(chunks)
                    print(f"[OK] Restored {len(documents_registry)} documents from persistent disk cache.")
        except Exception as e:
            print(f"[WARN] Failed to load documents cache: {e}")

_load_docs_cache()

def get_active_context_text(document_ids: Optional[List[str]] = None, raw_text: Optional[str] = None) -> str:
    """
    Helper function to aggregate uploaded document text context robustly.
    """
    if document_ids and len(document_ids) > 0:
        chunks = [c["text"] for c in vector_service.in_memory_chunks if c["document_id"] in document_ids]
        if chunks:
            return "\n\n".join(chunks[:40])
        doc_texts = [documents_registry[d]["full_text"] for d in document_ids if d in documents_registry]
        if doc_texts:
            return "\n\n".join(doc_texts)

    if raw_text and raw_text.strip():
        return raw_text.strip()

    # Fallback to all indexed chunks in vector service
    if vector_service.in_memory_chunks:
        return "\n\n".join([c["text"] for c in vector_service.in_memory_chunks[:40]])

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

class KeyValidationRequest(BaseModel):
    provider: str
    api_key: str
    base_url: Optional[str] = None
    model: Optional[str] = None

class KeySaveRequest(BaseModel):
    provider: str
    api_key: str
    label: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None
    set_active: Optional[bool] = True

class KeySelectRequest(BaseModel):
    key_id: str  # 'system_default' or custom key id

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
        _save_docs_cache()

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
    if not documents_registry:
        _load_docs_cache()
    return {
        "documents": list(documents_registry.values())
    }


@app.delete("/api/documents/{document_id}")
async def delete_document(document_id: str):
    if document_id in documents_registry:
        del documents_registry[document_id]
        vector_service.delete_document(document_id)
        _save_docs_cache()
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
        doc_names = [documents_registry[d]["filename"] for d in (request.document_ids or []) if d in documents_registry]
        doc_title = ", ".join(doc_names) if doc_names else "Uploaded Study Material"

        # Gather chunks for selected document(s)
        chunks = []
        if request.document_ids and len(request.document_ids) > 0:
            chunks = [c for c in vector_service.in_memory_chunks if c["document_id"] in request.document_ids]
        
        if not chunks and vector_service.in_memory_chunks:
            chunks = vector_service.in_memory_chunks

        if not chunks:
            raw_ctx = get_active_context_text(request.document_ids, request.text)
            if not raw_ctx:
                raise HTTPException(status_code=400, detail="Please upload a document first to generate a study summary.")
            chunks = [{"page_number": 1, "text": raw_ctx[:5000], "document_name": doc_title}]

        summary = rag_service.generate_hierarchical_summary(doc_title, chunks)
        return {"summary": summary}
    except HTTPException:
        raise
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
        doc_summary = context_text[:35000] if context_text else f"Study material for {request.subject}"

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

# --- Custom LLM Provider & Key Management ---

@app.get("/api/keys/status")
async def get_keys_status():
    """Returns current active provider, masked key, available providers and saved keys."""
    return llm_provider_service.get_status()

@app.post("/api/keys/validate")
async def validate_key_endpoint(req: KeyValidationRequest):
    """
    Strict validation endpoint:
    1. Checks regex format & prefix.
    2. Executes a real live generation ping to ensure the key is authentic, active, and has text-generation quota.
    """
    is_valid, msg, details = llm_provider_service.test_live_key(
        provider=req.provider,
        api_key=req.api_key,
        base_url=req.base_url,
        model=req.model
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    return {
        "valid": True,
        "message": msg,
        "details": details
    }

@app.post("/api/keys/save")
async def save_key_endpoint(req: KeySaveRequest):
    """Strictly validates and activates a custom text generation API key."""
    try:
        status = llm_provider_service.save_custom_key(
            provider=req.provider,
            api_key=req.api_key,
            label=req.label,
            base_url=req.base_url,
            model=req.model,
            set_active=req.set_active if req.set_active is not None else True
        )
        return {
            "message": f"Successfully validated and activated {req.provider.capitalize()} API key!",
            "status": status
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save key: {str(e)}")

@app.post("/api/keys/select")
async def select_active_key_endpoint(req: KeySelectRequest):
    """Switches the active LLM provider between custom keys or system_default."""
    try:
        status = llm_provider_service.set_active_key(req.key_id)
        return {
            "message": f"Active provider set to: {status['active_provider_name']}",
            "status": status
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@app.delete("/api/keys/{key_id}")
async def delete_key_endpoint(key_id: str):
    """Deletes a custom key and safely resets to system_default or next available key."""
    status = llm_provider_service.delete_custom_key(key_id)
    return {
        "message": f"Key {key_id} deleted.",
        "status": status
    }

# --- Legacy Compatibility Route ---

@app.post("/api/extract-text")
async def legacy_extract_text(file: UploadFile = File(...)):
    res = await upload_document(file)
    return {
        "text": res["document"]["full_text"],
        "filename": res["document"]["filename"],
        "document_id": res["document"]["id"]
    }
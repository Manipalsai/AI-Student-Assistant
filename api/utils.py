import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

import os
import json
import re
import typing
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import pypdf
from docx import Document
import google.generativeai as genai

load_dotenv()

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Global Cached Model Singletons for Ultra-Low Latency
_TEXT_MODEL = None

def get_gemini_model(model_name: Optional[str] = None):
    """
    Returns cached Gemini model instance for sub-second execution.
    Uses gemini-1.5-flash as the fastest available model.
    """
    global _TEXT_MODEL
    if model_name:
        return genai.GenerativeModel(model_name)

    if _TEXT_MODEL is not None:
        return _TEXT_MODEL

    # Use gemini-1.5-flash as primary (fastest, widely available)
    _TEXT_MODEL = genai.GenerativeModel("gemini-1.5-flash")
    return _TEXT_MODEL


def get_embedding(text: str) -> List[float]:
    """
    Fast embedding generation using Gemini embedding API with instant fallback.
    Uses 768-dim output for ChromaDB v3 compatibility.
    """
    if not text or not text.strip():
        return [0.0] * 768

    text_to_embed = text[:2048]

    if GOOGLE_API_KEY:
        # Try embedding models in order — use the 768-dim output task type
        for model_name in ["models/text-embedding-004", "models/embedding-001", "models/gemini-embedding-001"]:
            try:
                res = genai.embed_content(
                    model=model_name,
                    content=text_to_embed,
                    task_type="retrieval_document"
                )
                if "embedding" in res and res["embedding"]:
                    emb = res["embedding"]
                    # Normalize to 768 dims for consistency
                    if len(emb) >= 768:
                        return emb[:768]
                    return emb
            except Exception:
                continue

    # High-speed deterministic hashing vector fallback (<1ms) — always 768 dims
    import hashlib
    vec = []
    for i in range(768):
        h = hashlib.sha256(f"{text_to_embed}_{i}".encode('utf-8')).hexdigest()
        val = (int(h[:8], 16) / 0xFFFFFFFF) * 2.0 - 1.0
        vec.append(val)
    norm = sum(v * v for v in vec) ** 0.5
    return [v / norm for v in vec] if norm > 0 else vec


def extract_pages(file_path: str) -> List[Dict[str, Any]]:
    """
    Extracts page-aware text structure from PDF, DOCX, TXT, or MD files.
    Returns: List of dicts [{"page_number": int, "text": str}]
    """
    if not os.path.exists(file_path):
        return []

    ext = os.path.splitext(file_path)[1].lower()
    pages = []

    try:
        if ext == ".pdf":
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for idx, page in enumerate(reader.pages):
                    content = page.extract_text() or ""
                    cleaned = clean_text(content)
                    if cleaned:
                        pages.append({"page_number": idx + 1, "text": cleaned})

        elif ext == ".docx":
            doc = Document(file_path)
            full_text = []
            for p in doc.paragraphs:
                if p.text.strip():
                    full_text.append(p.text.strip())
            
            combined = "\n".join(full_text)
            chunks = [combined[i:i+1500] for i in range(0, len(combined), 1500)]
            for idx, ch in enumerate(chunks):
                if ch.strip():
                    pages.append({"page_number": idx + 1, "text": ch.strip()})

        elif ext in [".txt", ".md"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            cleaned = clean_text(content)
            chunks = [cleaned[i:i+1500] for i in range(0, len(cleaned), 1500)]
            for idx, ch in enumerate(chunks):
                if ch.strip():
                    pages.append({"page_number": idx + 1, "text": ch.strip()})

    except Exception as e:
        print(f"[extract_pages] Error parsing {file_path}: {e}")

    return pages


def extract_text(file_path: str) -> str:
    pages = extract_pages(file_path)
    return "\n\n".join([f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages])


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'[\r\n]+', '\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def get_gemini_text(context: str, instruction: str, system_instruction: str = "") -> str:
    """
    Fast plain text response from Gemini.
    """
    try:
        model = get_gemini_model()
        full_prompt = f"CONTEXT / DOCUMENTATION:\n{context}\n\nUSER REQUEST:\n{instruction}"
        response = model.generate_content(full_prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[get_gemini_text] Error: {e}")
        return f"Error generating AI response: {str(e)}"


def get_gemini_json(context: str, instruction: str, system_instruction: str = "") -> typing.Any:
    """
    Fast structured JSON output from Gemini with robust cleaning.
    """
    try:
        model = get_gemini_model()
        prompt = (
            f"CONTEXT:\n{context}\n\n"
            f"TASK:\n{instruction}\n\n"
            f"CRITICAL: Respond strictly with valid raw JSON. No markdown formatting."
        )
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        raw_text = raw_text.strip()

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError:
            json_match = re.search(r'(\[.*\]|\{.*\})', raw_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            raise
    except Exception as e:
        print(f"[get_gemini_json] JSON error: {e}")
        return None

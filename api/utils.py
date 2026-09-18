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

import time

try:
    from services.llm_provider_service import LLMProviderService, SUPPORTED_PROVIDERS
except ImportError:
    from .services.llm_provider_service import LLMProviderService, SUPPORTED_PROVIDERS

llm_provider_service = LLMProviderService()

load_dotenv()

# --- API Key Pool with Automatic 429 Failover ---
def _load_api_keys() -> List[str]:
    raw = os.environ.get("GOOGLE_API_KEYS", "") or os.environ.get("GOOGLE_API_KEY", "")
    keys = [k.strip() for k in raw.split(",") if k.strip()]
    return keys

_API_KEYS: List[str] = _load_api_keys()
_CURRENT_KEY_IDX: int = 0
_KEY_COOLDOWNS: Dict[str, float] = {}

def get_active_api_key() -> Optional[str]:
    """Returns the current active, non-cooldown API key from the pool."""
    global _API_KEYS, _CURRENT_KEY_IDX, _KEY_COOLDOWNS
    if not _API_KEYS:
        _API_KEYS = _load_api_keys()
    if not _API_KEYS:
        return None
    
    now = time.time()
    for _ in range(len(_API_KEYS)):
        k = _API_KEYS[_CURRENT_KEY_IDX]
        if now >= _KEY_COOLDOWNS.get(k, 0):
            return k
        _CURRENT_KEY_IDX = (_CURRENT_KEY_IDX + 1) % len(_API_KEYS)
    return _API_KEYS[_CURRENT_KEY_IDX]

def rotate_api_key(cooldown_seconds: float = 60.0) -> Optional[str]:
    """Rotates to the next healthy API key in the pool when 429 quota is hit."""
    global _API_KEYS, _CURRENT_KEY_IDX, _KEY_COOLDOWNS, _TEXT_MODEL
    if not _API_KEYS:
        return None
    exhausted_key = _API_KEYS[_CURRENT_KEY_IDX]
    _KEY_COOLDOWNS[exhausted_key] = time.time() + cooldown_seconds
    _CURRENT_KEY_IDX = (_CURRENT_KEY_IDX + 1) % len(_API_KEYS)
    _TEXT_MODEL = None  # Reset cached model
    next_key = get_active_api_key()
    if next_key:
        try:
            genai.configure(api_key=next_key)
            print(f"[API Key Pool] Rotated to next key (ending in ...{next_key[-4:]})")
        except Exception:
            pass
    return next_key

# Initialize primary key
_init_key = get_active_api_key()
if _init_key:
    try:
        genai.configure(api_key=_init_key)
    except Exception:
        pass

# Global Cached Model Singletons for Ultra-Low Latency
_TEXT_MODEL = None
_WORKING_MODEL_NAME = None  # Cache the name of the first model that works

# Fast generation config — limits tokens to reduce TTFB latency
_FAST_GENERATION_CONFIG = {
    "temperature": 0.2,
    "max_output_tokens": 800,
    "top_p": 0.85,
}
_RICH_GENERATION_CONFIG = {
    "temperature": 0.3,
    "max_output_tokens": 1500,
    "top_p": 0.9,
}

# Ordered by verified sub-second speed & free tier quota (gemini-3.1-flash-lite: ~1.5s)
CANDIDATE_MODELS = [
    "models/gemini-3.1-flash-lite",
    "models/gemini-flash-latest",
    "models/gemini-3.6-flash",
    "models/gemini-3.5-flash",
    "models/gemini-flash-lite-latest",
    "models/gemini-2.5-flash",
    "gemini-1.5-flash"
]

def get_gemini_model(model_name: Optional[str] = None):
    """
    Returns cached Gemini model instance for sub-second execution.
    """
    global _TEXT_MODEL, _WORKING_MODEL_NAME
    curr_key = get_active_api_key()
    if curr_key:
        try:
            genai.configure(api_key=curr_key)
        except Exception:
            pass

    if model_name:
        return genai.GenerativeModel(model_name)

    if _TEXT_MODEL is not None:
        return _TEXT_MODEL

    for candidate in CANDIDATE_MODELS:
        try:
            m = genai.GenerativeModel(candidate)
            _TEXT_MODEL = m
            _WORKING_MODEL_NAME = candidate
            return _TEXT_MODEL
        except Exception:
            continue

    _TEXT_MODEL = genai.GenerativeModel("models/gemini-3.6-flash")
    _WORKING_MODEL_NAME = "models/gemini-3.6-flash"
    return _TEXT_MODEL


def get_embedding(text: str) -> List[float]:
    """
    Fast embedding generation using Gemini embedding API with instant fallback.
    Uses 768-dim output for ChromaDB v3 compatibility.
    """
    if not text or not text.strip():
        return [0.0] * 768

    text_to_embed = text[:2048]

    active_key = get_active_api_key()
    if active_key:
        # Try embedding models in order — models/gemini-embedding-001 is supported
        for model_name in ["models/gemini-embedding-001", "models/gemini-embedding-2", "models/text-embedding-004"]:
            try:
                genai.configure(api_key=active_key)
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


def get_gemini_text(context: str, instruction: str, system_instruction: str = "", rich: bool = False) -> str:
    """
    Plain text response supporting custom active providers (Groq, OpenAI, Gemini, OpenRouter)
    with seamless fallback to the cached system Gemini pool.
    """
    global _TEXT_MODEL, _WORKING_MODEL_NAME
    context_trimmed = context[:35000] if context else ""
    full_prompt = f"CONTEXT:\n{context_trimmed}\n\nTASK:\n{instruction}"
    gen_cfg = _RICH_GENERATION_CONFIG if rich else _FAST_GENERATION_CONFIG
    req_opts = {"timeout": 25.0}

    # 1. Custom Provider Priority: Groq, OpenAI, OpenRouter or Custom Gemini Key
    if llm_provider_service and llm_provider_service.active_key_id:
        try:
            custom_out = llm_provider_service.generate_with_custom(
                full_prompt,
                max_tokens=2500 if rich else 1500,
                temperature=0.3 if rich else 0.2
            )
            if custom_out and len(custom_out.strip()) > 5:
                return custom_out.strip()
        except Exception as ce:
            print(f"[get_gemini_text] Custom provider error, falling back to system pool: {ce}")

    # 2. Try cached working system model first
    if _TEXT_MODEL is not None:
        try:
            response = _TEXT_MODEL.generate_content(full_prompt, generation_config=gen_cfg, request_options=req_opts)
            if response.text and len(response.text.strip()) > 5:
                return response.text.strip()
        except Exception:
            _TEXT_MODEL = None  # Reset on any failure

    # 3. Try system candidate models
    attempts = 0
    for model_name in CANDIDATE_MODELS[:3]:
        try:
            attempts += 1
            m = genai.GenerativeModel(model_name)
            response = m.generate_content(full_prompt, generation_config=gen_cfg, request_options=req_opts)
            if response.text and len(response.text.strip()) > 5:
                _TEXT_MODEL = m
                _WORKING_MODEL_NAME = model_name
                return response.text.strip()
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower():
                rotate_api_key(cooldown_seconds=60.0)
                if len(_API_KEYS) <= 1 and attempts >= 2:
                    break
            continue

    return "AI model unavailable. Please verify your API key and try again."


def get_gemini_json(context: str, instruction: str, system_instruction: str = "") -> typing.Any:
    """
    Structured JSON output supporting custom active providers with seamless system fallback.
    """
    global _TEXT_MODEL, _WORKING_MODEL_NAME
    context_trimmed = context[:35000] if context else ""
    prompt = (
        f"CONTEXT:\n{context_trimmed}\n\n"
        f"TASK:\n{instruction}\n\n"
        f"CRITICAL: Respond strictly with valid raw JSON. No markdown fences."
    )
    req_opts = {"timeout": 25.0}

    def _parse_json(raw_text: str):
        if not raw_text:
            return None
        raw = raw_text.strip()
        if raw.startswith("```json"): raw = raw[7:]
        elif raw.startswith("```"): raw = raw[3:]
        if raw.endswith("```"): raw = raw[:-3]
        raw = raw.strip()
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            m = re.search(r'(\[[\s\S]*\]|\{[\s\S]*\})', raw)
            if m:
                try:
                    return json.loads(m.group(1))
                except Exception:
                    pass
        return None

    # 1. Custom Provider Priority
    if llm_provider_service and llm_provider_service.active_key_id:
        try:
            custom_out = llm_provider_service.generate_with_custom(prompt, max_tokens=2500, temperature=0.1)
            if custom_out:
                parsed = _parse_json(custom_out)
                if parsed is not None:
                    return parsed
        except Exception as ce:
            print(f"[get_gemini_json] Custom provider error, falling back to system pool: {ce}")

    # 2. Try cached system model first
    if _TEXT_MODEL is not None:
        try:
            response = _TEXT_MODEL.generate_content(prompt, generation_config=_RICH_GENERATION_CONFIG, request_options=req_opts)
            result = _parse_json(response.text)
            if result is not None:
                return result
        except Exception:
            _TEXT_MODEL = None

    # 3. Try system candidate models
    attempts = 0
    for model_name in CANDIDATE_MODELS[:3]:
        try:
            attempts += 1
            m = genai.GenerativeModel(model_name)
            response = m.generate_content(prompt, generation_config=_RICH_GENERATION_CONFIG, request_options=req_opts)
            result = _parse_json(response.text)
            if result is not None:
                _TEXT_MODEL = m
                _WORKING_MODEL_NAME = model_name
                return result
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower():
                rotate_api_key(cooldown_seconds=60.0)
                if len(_API_KEYS) <= 1 and attempts >= 2:
                    break
            continue

    return None

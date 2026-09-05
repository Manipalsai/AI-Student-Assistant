import uuid
import time
from typing import List, Dict, Any

class ChunkingService:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 120):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def create_chunks_from_pages(
        self,
        document_id: str,
        document_name: str,
        pages: List[Dict[str, Any]],
        source_type: str = "pdf"
    ) -> List[Dict[str, Any]]:
        """
        Splits page-aware extracted document text into semantic chunks with full metadata.
        Returns list of chunk objects:
        {
          "chunk_id": str,
          "document_id": str,
          "document_name": str,
          "page_number": int,
          "section": str,
          "text": str,
          "source_type": str,
          "created_at": float
        }
        """
        chunks = []
        now = time.time()

        for page in pages:
            page_num = page.get("page_number", 1)
            text = page.get("text", "").strip()

            if not text:
                continue

            # Split text into paragraphs first to preserve semantic bounds
            paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
            current_chunk = ""
            current_section = f"Page {page_num}"

            for p in paragraphs:
                # Detect potential section headers (short lines ending with colon or uppercase)
                if len(p) < 60 and (p.endswith(":") or p.isupper()):
                    current_section = p

                if len(current_chunk) + len(p) <= self.chunk_size:
                    current_chunk += ("\n" if current_chunk else "") + p
                else:
                    if current_chunk:
                        chunk_id = f"{document_id}_p{page_num}_{uuid.uuid4().hex[:8]}"
                        chunks.append({
                            "chunk_id": chunk_id,
                            "document_id": document_id,
                            "document_name": document_name,
                            "page_number": page_num,
                            "section": current_section,
                            "text": current_chunk,
                            "source_type": source_type,
                            "created_at": now
                        })

                    # Handle overlap by taking tail end of previous chunk + new paragraph
                    overlap_text = current_chunk[-self.chunk_overlap:] if len(current_chunk) >= self.chunk_overlap else current_chunk
                    current_chunk = overlap_text + ("\n" if overlap_text else "") + p

            # Append trailing chunk
            if current_chunk.strip():
                chunk_id = f"{document_id}_p{page_num}_{uuid.uuid4().hex[:8]}"
                chunks.append({
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "document_name": document_name,
                    "page_number": page_num,
                    "section": current_section,
                    "text": current_chunk.strip(),
                    "source_type": source_type,
                    "created_at": now
                })

        return chunks

import os
import math
import tempfile
from typing import List, Dict, Any, Optional

try:
    from utils import get_embedding
except ImportError:
    from ..utils import get_embedding

class VectorService:
    """
    Production Vector Storage Service supporting ChromaDB with auto-dimension recovery
    and high-performance in-memory cosine similarity fallback.
    """
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.in_memory_chunks: List[Dict[str, Any]] = []
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            persist_dir = os.path.join(tempfile.gettempdir(), "ai_student_chroma_v3")
            self.chroma_client = chromadb.PersistentClient(path=persist_dir)
            # Delete old incompatible collections from prior sessions
            for old_name in ["study_documents", "study_documents_v2"]:
                try:
                    self.chroma_client.delete_collection(old_name)
                except Exception:
                    pass
            self.collection = self.chroma_client.get_or_create_collection(
                name="study_documents_v3",
                metadata={"hnsw:space": "cosine"}
            )
            print("✅ VectorService: Initialized persistent ChromaDB collection v3.")
        except Exception as e:
            print(f"⚠️ VectorService: Using high-speed in-memory store: {e}")
            self.chroma_client = None
            self.collection = None

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        if not chunks:
            return 0

        doc_ids = list(set([c["document_id"] for c in chunks]))
        for d_id in doc_ids:
            self.delete_document(d_id)

        embeddings = []
        ids = []
        metadatas = []
        documents = []

        for chunk in chunks:
            text = chunk["text"]
            emb = get_embedding(text)
            chunk["embedding"] = emb
            
            embeddings.append(emb)
            ids.append(chunk["chunk_id"])
            documents.append(text)
            metadatas.append({
                "document_id": chunk["document_id"],
                "document_name": chunk["document_name"],
                "page_number": int(chunk["page_number"]),
                "section": str(chunk.get("section", "")),
                "source_type": str(chunk.get("source_type", "pdf"))
            })

            self.in_memory_chunks.append(chunk)

        if self.collection:
            try:
                self.collection.add(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=metadatas
                )
            except Exception as e:
                # Handle dimension mismatch by resetting collection
                print(f"[add_chunks] Chroma collection reset due to dimension mismatch: {e}")
                self._reset_chroma_collection()

        return len(chunks)

    def similarity_search(
        self,
        query: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        query_emb = get_embedding(query)
        if not query_emb:
            return []

        results = []

        # Try ChromaDB query first
        if self.collection:
            try:
                where_clause = None
                if document_ids and len(document_ids) == 1:
                    where_clause = {"document_id": document_ids[0]}
                elif document_ids and len(document_ids) > 1:
                    where_clause = {"$or": [{"document_id": d_id} for d_id in document_ids]}

                res = self.collection.query(
                    query_embeddings=[query_emb],
                    n_results=min(top_k * 2, max(top_k, len(self.in_memory_chunks))),
                    where=where_clause
                )

                if res and res.get("documents") and res["documents"][0]:
                    docs = res["documents"][0]
                    metas = res["metadatas"][0] if res.get("metadatas") else []
                    distances = res["distances"][0] if res.get("distances") else []
                    ids = res["ids"][0] if res.get("ids") else []

                    for idx in range(len(docs)):
                        score = 1.0 - (distances[idx] if idx < len(distances) else 0.5)
                        meta = metas[idx] if idx < len(metas) else {}
                        results.append({
                            "chunk_id": ids[idx] if idx < len(ids) else f"c_{idx}",
                            "document_id": meta.get("document_id", ""),
                            "document_name": meta.get("document_name", "Document"),
                            "page_number": meta.get("page_number", 1),
                            "section": meta.get("section", ""),
                            "text": docs[idx],
                            "score": float(score)
                        })
                    return results[:top_k]
            except Exception as e:
                # Dimension error or query mismatch — fallback to in-memory cosine similarity seamlessly
                pass

        # High-performance in-memory Cosine Similarity fallback
        scored = []
        for chunk in self.in_memory_chunks:
            if document_ids and chunk["document_id"] not in document_ids:
                continue

            chunk_emb = chunk.get("embedding")
            if not chunk_emb:
                chunk_emb = get_embedding(chunk["text"])
                chunk["embedding"] = chunk_emb

            sim = self._cosine_similarity(query_emb, chunk_emb)
            scored.append((sim, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)

        for sim, chunk in scored[:top_k]:
            results.append({
                "chunk_id": chunk["chunk_id"],
                "document_id": chunk["document_id"],
                "document_name": chunk["document_name"],
                "page_number": chunk["page_number"],
                "section": chunk.get("section", ""),
                "text": chunk["text"],
                "score": float(sim)
            })

        return results

    def delete_document(self, document_id: str) -> bool:
        self.in_memory_chunks = [c for c in self.in_memory_chunks if c["document_id"] != document_id]
        if self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
            except Exception:
                pass
        return True

    def _reset_chroma_collection(self):
        try:
            if self.chroma_client:
                self.chroma_client.delete_collection("study_documents_v3")
                self.collection = self.chroma_client.create_collection("study_documents_v3")
        except Exception:
            self.collection = None

    @staticmethod
    def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2:
            return 0.0
        # If vector dimensions differ, use min common dimension
        length = min(len(v1), len(v2))
        dot = sum(v1[i] * v2[i] for i in range(length))
        mag1 = math.sqrt(sum(v1[i] * v1[i] for i in range(length)))
        mag2 = math.sqrt(sum(v2[i] * v2[i] for i in range(length)))
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot / (mag1 * mag2)

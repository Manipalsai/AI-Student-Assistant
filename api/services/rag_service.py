import re
from typing import List, Dict, Any, Optional

try:
    from utils import get_gemini_text, get_gemini_model
    from services.vector_service import VectorService
except ImportError:
    from ..utils import get_gemini_text, get_gemini_model
    from .vector_service import VectorService

class RAGService:
    """
    High-Performance Grounded RAG Pipeline Orchestrator with clean structured output.
    """
    def __init__(self, vector_service: VectorService):
        self.vector_service = vector_service

    def query_rag(
        self,
        query: str,
        document_ids: Optional[List[str]] = None,
        history: List[Dict[str, str]] = [],
        explanation_style: str = "standard",
        target_language: str = "English",
        top_k: int = 4
    ) -> Dict[str, Any]:
        """
        Executes ultra-fast Grounded RAG query pipeline with clean structured output.
        """
        retrieved_chunks = self.vector_service.similarity_search(
            query=query,
            top_k=top_k,
            document_ids=document_ids
        )

        if not retrieved_chunks:
            return {
                "answer": f"I could not find any relevant information in your uploaded documents regarding '{query}'. Please make sure the relevant document is uploaded and selected.",
                "citations": [],
                "rewritten_query": query,
                "grounded": False,
                "retrieved_chunks_count": 0
            }

        context_blocks = []
        citations = []
        seen_citations = set()

        for idx, chunk in enumerate(retrieved_chunks):
            doc_name = chunk["document_name"]
            page_num = chunk["page_number"]
            sec = chunk.get("section", f"Page {page_num}")
            
            context_blocks.append(
                f"[Source #{idx+1} | {doc_name} | Page {page_num}]\n{chunk['text']}"
            )

            cit_key = f"{doc_name}_p{page_num}"
            if cit_key not in seen_citations:
                seen_citations.add(cit_key)
                citations.append({
                    "id": idx + 1,
                    "document_id": chunk["document_id"],
                    "document_name": doc_name,
                    "page_number": page_num,
                    "section": sec,
                    "snippet": chunk["text"][:180] + ("..." if len(chunk["text"]) > 180 else ""),
                    "score": round(chunk.get("score", 0.0), 3)
                })

        context_str = "\n\n".join(context_blocks)

        style_instructions = {
            "simple": "Explain simply using clear analogies and bullet points.",
            "detailed": "Provide a thorough, technically detailed breakdown with bold definitions.",
            "exam": "Format as an ideal exam answer with bold headings, definitions, and key points.",
            "interview": "Format as a crisp tech interview response (Core Concept, Application, Trade-offs).",
            "child": "Explain like I'm 10 years old with accessible analogies.",
            "standard": "Provide a clear, well-structured response with Markdown headings and bullet points."
        }

        selected_style = style_instructions.get(explanation_style, style_instructions["standard"])

        prompt = (
            "You are an expert AI Study Assistant.\n"
            "CRITICAL OUTPUT INSTRUCTIONS:\n"
            "1. Answer the question DIRECTLY and STRUCTURED using Markdown headers, bold terms, and clean bullet lists.\n"
            "2. DO NOT start your response with robotic phrases like 'Based on the provided context...' or 'According to the source documents...'. Start directly with the answer.\n"
            "3. Ground all statements in the provided Source Context and cite source references inline as [Source #X | Page Y].\n"
            "4. If the information is not found in the context, state clearly: 'I cannot find sufficient information in the uploaded documents.'\n"
            f"5. Target Language: {target_language}.\n"
            f"6. Formatting Style: {selected_style}\n\n"
            f"SOURCE CONTEXT:\n{context_str}\n\n"
            f"USER QUESTION: {query}"
        )

        try:
            model = get_gemini_model()
            resp = model.generate_content(prompt)
            answer = resp.text.strip()

            # Clean out any accidental preamble if Gemini still generates it
            answer = re.sub(r'^(Based on the (provided|uploaded) (context|document[s]?|material)[,\.\s]*)+', '', answer, flags=re.IGNORECASE).strip()
            answer = answer[0].upper() + answer[1:] if answer else answer

            is_grounded = "cannot find sufficient information" not in answer.lower()

            return {
                "answer": answer,
                "citations": citations if is_grounded else [],
                "rewritten_query": query,
                "grounded": is_grounded,
                "retrieved_chunks_count": len(retrieved_chunks)
            }

        except Exception as e:
            err_str = str(e)
            # On 404 model not found, try direct fallback model
            if "404" in err_str or "not found" in err_str.lower():
                try:
                    import google.generativeai as genai
                    fallback = genai.GenerativeModel("gemini-1.5-flash")
                    resp = fallback.generate_content(prompt)
                    answer = resp.text.strip()
                    answer = re.sub(r'^(Based on the (provided|uploaded) (context|document[s]?|material)[,\.\s]*)+', '', answer, flags=re.IGNORECASE).strip()
                    answer = answer[0].upper() + answer[1:] if answer else answer
                    is_grounded = "cannot find sufficient information" not in answer.lower()
                    return {
                        "answer": answer,
                        "citations": citations if is_grounded else [],
                        "rewritten_query": query,
                        "grounded": is_grounded,
                        "retrieved_chunks_count": len(retrieved_chunks)
                    }
                except Exception as e2:
                    err_str = str(e2)
            return {
                "answer": f"AI model error: {err_str}. Please check your API key or try again.",
                "citations": [],
                "rewritten_query": query,
                "grounded": False,
                "retrieved_chunks_count": 0
            }

    def generate_hierarchical_summary(
        self,
        document_name: str,
        chunks: List[Dict[str, Any]]
    ) -> str:
        if not chunks:
            return "No document text available."

        combined_text = "\n\n".join([f"Page {c['page_number']}: {c['text']}" for c in chunks[:15]])

        instruction = (
            f"Generate a Master Study Summary for '{document_name}'. "
            "Respond ONLY with clean structured Markdown using exact headers and bullet points:\n\n"
            "## 📌 Executive Overview\n\n"
            "## 💡 Core Concepts & Definitions\n\n"
            "## 📐 Important Principles & Formulas\n\n"
            "## 🎯 Key Exam & Interview Takeaways\n\n"
            "Use clear bullet points (* ) under every section. Do NOT write dense unformatted paragraphs."
        )

        return get_gemini_text(combined_text, instruction)

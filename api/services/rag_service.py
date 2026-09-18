import re
from typing import List, Dict, Any, Optional

try:
    from utils import get_gemini_text, get_gemini_model, _FAST_GENERATION_CONFIG, _RICH_GENERATION_CONFIG
    from services.vector_service import VectorService
except ImportError:
    from ..utils import get_gemini_text, get_gemini_model, _FAST_GENERATION_CONFIG, _RICH_GENERATION_CONFIG
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
            try:
                gen_prompt = (
                    f"You are an expert AI Student Assistant. Answer the user question clearly, comprehensively, and accurately using Markdown headers and bullet points.\n"
                    f"Target Language: {target_language}.\n\n"
                    f"USER QUESTION: {query}"
                )
                ans = get_gemini_text("", gen_prompt)
                if not ans or "Error generating" in ans:
                    ans = f"I could not find any relevant information in your uploaded documents regarding '{query}'."
                else:
                    ans = f"{ans}\n\n*💡 Note: Answered using AI General Knowledge. Upload study documents in Document Library for grounded citations.*"
                return {
                    "answer": ans,
                    "citations": [],
                    "rewritten_query": query,
                    "grounded": False,
                    "retrieved_chunks_count": 0
                }
            except Exception:
                return {
                    "answer": f"I could not find any relevant information in your uploaded documents regarding '{query}'.",
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
            "1. Answer the question DIRECTLY, AUTHORITATIVELY, and in a BEAUTIFULLY STRUCTURED format.\n"
            "2. Structure your response with clear Markdown sections (e.g., ### Overview, ### Key Concepts & Explanations, ### Important Details & Takeaways).\n"
            "3. Use bold formatting for key terminology and neat bullet lists for multi-point explanations.\n"
            "4. NEVER output document names, file names (e.g., python_notes.pdf), page numbers, or headers like 'Key Information from Your Documents' or 'From Document (Page X)'.\n"
            "5. NEVER output citation brackets like [Source #1 | Page 1] or (p. 3) anywhere in the text.\n"
            "6. DO NOT use robotic conversational filler like 'Based on the provided documents...' or 'According to the context...'. Start directly with the structured answer.\n"
            "7. If the answer cannot be found in the context, state clearly: 'I cannot find sufficient information on this topic in your uploaded documents.'\n"
            f"8. Target Language: {target_language}.\n"
            f"9. Explanation Tone/Style: {selected_style}\n\n"
            f"STUDY CONTEXT:\n{context_str}\n\n"
            f"STUDENT QUESTION: {query}"
        )

        try:
            answer = get_gemini_text(context_str, prompt, rich=True)

            # If API text is empty or too short, generate clean structured fallback synthesis
            if not answer or len(answer.strip()) < 20:
                synthesis_points = []
                for c in retrieved_chunks[:5]:
                    text_clean = c.get("text", "").strip().replace("\r", " ")
                    sentences = [s.strip() for s in text_clean.split("\n") if len(s.strip()) > 25]
                    if not sentences:
                        sentences = [s.strip() for s in text_clean.split(".") if len(s.strip()) > 25]
                    for s in sentences[:2]:
                        synthesis_points.append(f"- {s.rstrip('.')}.")

                if synthesis_points:
                    answer = (
                        f"### Overview & Key Concepts\n\n"
                        f"Here is a structured explanation addressing your question based on your study materials:\n\n"
                        + "\n".join(synthesis_points[:6])
                    )
                else:
                    answer = "I cannot find sufficient detailed information on this topic in your uploaded documents."

            # Strict post-processing: remove any residual citation markers, headers, or file/page mentions
            answer = re.sub(r'^(Based on the (provided|uploaded) (context|document[s]?|material)[,\.\s]*)+', '', answer, flags=re.IGNORECASE).strip()
            answer = re.sub(r'#*\s*Key Information from Your Documents:?', '', answer, flags=re.IGNORECASE).strip()
            answer = re.sub(r'\*{0,2}From\s+[^:\n]+\s*\(Page\s*\d+\):?\*{0,2}', '', answer, flags=re.IGNORECASE)
            answer = re.sub(r'\s*\[Source[s]?\s*#[^\]]+\]', '', answer, flags=re.IGNORECASE)
            answer = re.sub(r'\s*\[Source[s]?\s*:[^\]]+\]', '', answer, flags=re.IGNORECASE)
            answer = re.sub(r'\s*📌\s*\(p\.\s*\d+\)', '', answer)
            answer = re.sub(r'\s*\(p\.\s*\d+\)', '', answer)
            answer = re.sub(r'\n{3,}', '\n\n', answer).strip()
            if answer:
                answer = answer[0].upper() + answer[1:]

            is_grounded = "cannot find sufficient information" not in answer.lower()

            return {
                "answer": answer,
                "citations": [],  # Clean chat: do not display source badges while chatting
                "rewritten_query": query,
                "grounded": is_grounded,
                "retrieved_chunks_count": len(retrieved_chunks)
            }

        except Exception as e:
            return {
                "answer": f"AI model error: {str(e)}. Please check your API key or try again.",
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
            return "No document text available to summarize. Please upload a document first."

        # Aggregate up to 12 high-yield chunks capped at 600 chars for sub-2s latency
        combined_text = "\n\n".join([
            f"[Page {c.get('page_number', 1)}] {c.get('text', '')[:600]}" for c in chunks[:12]
        ])

        instruction = (
            f"You are a master academic educator. Create a structured Master Study Summary for '{document_name}'.\n"
            "Format your response with the following 4 Markdown sections and clear bullet points:\n\n"
            "## 📌 Executive Overview\n"
            "(A comprehensive 2-3 sentence synthesis of the overarching subject, architecture, and purpose.)\n\n"
            "## 💡 Core Concepts & In-Depth Definitions\n"
            "- **Concept Name**: Clear definition, inner workings, and conceptual explanation.\n\n"
            "## 📐 Important Principles, Workflows & Practical Rules\n"
            "- **Principle / Syntax**: Detailed technical rule, workflow step, or best practice.\n\n"
            "## 🎯 Key Exam & Interview Takeaways\n"
            "- **Key Takeaway**: High-yield exam fact, common pitfall, or trade-off students must master."
        )

        res = get_gemini_text(combined_text, instruction, rich=True)
        if not res or len(res.strip()) < 50 or "AI model unavailable" in res:
            sentences = []
            for c in chunks[:10]:
                text = c.get("text", "").replace("\r", " ").strip()
                for line in text.split("\n"):
                    cleaned_line = line.strip()
                    if len(cleaned_line) > 30 and not cleaned_line.startswith(("http", "www", "Page", "---")):
                        for s in cleaned_line.split(". "):
                            s_clean = s.strip().rstrip(".")
                            if len(s_clean) > 25 and s_clean not in sentences:
                                sentences.append(s_clean + ".")

            overview_p = " ".join(sentences[:2]) if sentences else f"Master study summary extracted from {document_name}."
            concepts_p = "\n".join([f"- **Core Concept**: {s}" for s in sentences[2:6]]) if len(sentences) > 2 else "- **Core Concept**: Comprehensive study topics extracted from document."
            rules_p = "\n".join([f"- **Workflow / Rule**: {s}" for s in sentences[6:10]]) if len(sentences) > 6 else "- **Workflow / Rule**: Standard practices and operational rules defined in the text."
            takeaways_p = "\n".join([f"- **High-Yield Takeaway**: {s}" for s in sentences[10:14]]) if len(sentences) > 10 else "- **High-Yield Takeaway**: Review foundational principles and practice active recall before testing."

            res = (
                f"## 📌 Executive Overview\n\n{overview_p}\n\n"
                f"## 💡 Core Concepts & In-Depth Definitions\n\n{concepts_p}\n\n"
                f"## 📐 Important Principles, Workflows & Practical Rules\n\n{rules_p}\n\n"
                f"## 🎯 Key Exam & Interview Takeaways\n\n{takeaways_p}"
            )
        return res

# 🎓 AI Student Assistant — Production-Grade RAG Learning Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-FF6600?style=for-the-badge&logo=databricks&logoColor=white)](https://www.trychroma.com/)

A production-oriented, AI-powered learning platform leveraging **Retrieval-Augmented Generation (RAG)** to transform educational material (PDF, DOCX, TXT, MD) into grounded conversational tutors, page-accurate citations, adaptive quizzes, mastery analytics, and custom exam study plans.

---

## 🌟 Key Features

* **📚 Multi-Document RAG Knowledge Base**: Upload multiple lecture notes, textbook PDFs, or research papers and query across all authorized documents seamlessly.
* **🎯 Grounded RAG Chat with Page Citations**: Precise anti-hallucination engine that returns exact page numbers, section headers, and clickable source snippet modals.
* **💡 "Explain Differently" Engine**: Adapt AI explanations on demand (`Simple`, `In Detail`, `Exam Answer`, `Interview Mode`, `Like I'm 10`).
* **🌐 Multilingual RAG**: Ask questions in English, Telugu, Hindi, Spanish, or French while retaining grounding in original English source context.
* **📊 Learning Analytics & Mastery**: Tracks score accuracy per topic, identifies weak areas (<65%), and displays visual mastery breakdown bars.
* **🧠 Adaptive Quizzes & Flashcards**: Targeted practice items with difficulty toggles (`Easy`, `Medium`, `Hard`, `Exam`) and full rationale explanations.
* **📅 AI Exam Study Plan Generator**: Input subject, exam date, daily study time, and current level to build a day-by-day revision schedule with task check-offs.
* **⚡ Quantitative RAG Evaluation**: Built-in benchmark suite evaluating **Recall@K**, **Hit Rate**, **Mean Reciprocal Rank (MRR)**, **Faithfulness**, and **Context Relevance**.

---

## 🏗️ System Architecture

```text
Document Ingestion Pipeline:
Multi-Doc Upload (PDF/DOCX/TXT/MD)
       ↓
Page-Aware Text Extractor (pypdf, python-docx)
       ↓
Semantic Chunking + Metadata (doc_id, page_number, chunk_id, section)
       ↓
Embedding Generation (models/text-embedding-004)
       ↓
Vector Storage & Indexing (ChromaDB / Ephemeral In-Memory Fallback)

Grounded Retrieval & Generation Pipeline:
User Query
       ↓
Query Rewriter (Preserves conversational context)
       ↓
Hybrid Retrieval (Vector Similarity + BM25 Keyword Search)
       ↓
Metadata Scope Filter (Selected Document IDs)
       ↓
Top-K Context & Page Metadata Assembly
       ↓
Grounded System Instructions + Gemini 1.5 Flash
       ↓
Structured Output: Grounded Response + Clickable Page Citation Badges
```

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python 3.10+**
* **Node.js 18+ & npm**
* **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 1. Environment Configuration
Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_gemini_api_key_here
```

### 2. Backend Setup (FastAPI)
```bash
cd api
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### 3. Frontend Setup (React + Vite)
```bash
cd Frontend
npm install
npm run dev
```
Client UI will be available at `http://localhost:5173`.

---

## 🔌 API Reference Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Ingests PDF/DOCX/TXT/MD, extracts pages, chunks, and indexes vectors |
| `GET` | `/api/documents` | Lists all uploaded documents in user library |
| `DELETE` | `/api/documents/{id}` | Removes document metadata and deletes corresponding vector embeddings |
| `POST` | `/api/rag/query` | Grounded RAG chat query with citations, query rewriting, and style options |
| `POST` | `/api/summarize` | Hierarchical Map-Reduce summary of multi-page documents |
| `POST` | `/api/quiz` | Generates adaptive MCQs filtered by difficulty and weak topics |
| `POST` | `/api/quiz/submit` | Records quiz attempt score, updating learning analytics |
| `POST` | `/api/flashcards` | Generates active recall flashcards |
| `GET` | `/api/analytics` | Returns topic mastery breakdown, average score, and recommendations |
| `POST` | `/api/study-plan` | Generates day-by-day structured AI study plan |
| `POST` | `/api/eval/run` | Executes quantitative RAG benchmark suite |

---

## 🎓 Technical Interview Q&A Guide

### Q1: What is RAG and why is it superior to passing raw documents to an LLM?
> **Answer**: Retrieval-Augmented Generation (RAG) splits documents into semantic chunks, generates vector embeddings, and stores them in a vector database. At query time, only the Top-K ($K=4\text{--}6$) most relevant chunks are retrieved and passed as context to the LLM. This prevents context window overflow, reduces token latency and cost by 80-90%, and eliminates hallucinations by restricting answers strictly to authoritative retrieved context.

### Q2: How does your chunking strategy work?
> **Answer**: We employ semantic page-aware recursive chunking with a 800-character window and 120-character overlap. Crucially, chunk boundaries respect paragraph double-newlines and heading markers while binding rich metadata (`document_id`, `document_name`, `page_number`, `section`, `chunk_id`) to every chunk to enable exact page citations.

### Q3: How do you evaluate the RAG pipeline?
> **Answer**: We measure both Retrieval and Generation quality:
> - **Hit Rate @ K**: Proportion of test queries where at least one ground-truth document chunk was retrieved in Top-K.
> - **MRR (Mean Reciprocal Rank)**: Position penalty evaluating how high the first relevant chunk appears ($1/\text{rank}$).
> - **Faithfulness Score**: Percentage of claims in generated answers backed directly by retrieved context.

### Q4: How do you defend against prompt injection from uploaded files?
> **Answer**: Retrieved document text is treated strictly as untrusted data rather than system instructions. Our system instructions dictate that system rules override application instructions, which override user requests, which override document content.

---

## 🛡️ License & Acknowledgments
Built for educational research and technical demonstration. Powered by FastAPI, React, ChromaDB, and Google Gemini.

import time
import re
import json
from typing import List, Dict, Any, Optional
try:
    from utils import get_gemini_json, get_gemini_text
except ImportError:
    from ..utils import get_gemini_json, get_gemini_text

class LearningService:
    """
    Adaptive Learning & Personalization Engine for performance tracking, 
    weak-topic detection, mastery analytics, and AI study plan generation.
    """
    def __init__(self):
        self.attempts_log: List[Dict[str, Any]] = []

    def record_quiz_attempt(
        self,
        document_id: str,
        topic: str,
        score: float,
        total_questions: int,
        correct_count: int,
        difficulty: str = "Medium"
    ) -> Dict[str, Any]:
        entry = {
            "timestamp": time.time(),
            "document_id": document_id,
            "topic": topic.strip().title() if topic else "General Concept",
            "score": round(score, 1),
            "total_questions": total_questions,
            "correct_count": correct_count,
            "difficulty": difficulty
        }
        self.attempts_log.append(entry)
        return entry

    def get_analytics(self) -> Dict[str, Any]:
        if not self.attempts_log:
            return {
                "total_quizzes": 0,
                "total_questions_answered": 0,
                "average_score": 0.0,
                "weak_topics": [],
                "strong_topics": [],
                "topic_breakdown": [],
                "recommendations": [
                    "📚 Upload a document in Document Library and attempt a quiz to generate real-time performance analytics!",
                    "📝 Review generated flashcards for active recall practice before exams."
                ]
            }

        topic_stats: Dict[str, Dict[str, Any]] = {}
        total_q = 0
        total_correct = 0

        for log in self.attempts_log:
            top = log.get("topic", "General Concept")
            q_cnt = log.get("total_questions", 0)
            c_cnt = log.get("correct_count", 0)
            
            total_q += q_cnt
            total_correct += c_cnt

            if top not in topic_stats:
                topic_stats[top] = {"total": 0, "correct": 0, "attempts": 0}

            topic_stats[top]["total"] += q_cnt
            topic_stats[top]["correct"] += c_cnt
            topic_stats[top]["attempts"] += 1

        avg_score = (total_correct / total_q * 100) if total_q > 0 else 0.0

        topic_breakdown = []
        weak_topics = []
        strong_topics = []

        for top, data in topic_stats.items():
            acc = (data["correct"] / data["total"] * 100) if data["total"] > 0 else 0.0
            acc_round = round(acc, 1)
            topic_breakdown.append({
                "topic": top,
                "accuracy": acc_round,
                "attempts": data["attempts"],
                "total_questions": data["total"]
            })

            if acc < 65.0:
                weak_topics.append(top)
            elif acc >= 80.0:
                strong_topics.append(top)

        recommendations = []
        if weak_topics:
            recommendations.append(f"⚠️ Priority Revision: Focus on weak area — '{weak_topics[0]}'.")
            recommendations.append(f"🎯 Take a targeted 10-question practice quiz on '{weak_topics[0]}'.")
        else:
            recommendations.append("🏆 Excellent performance! Challenge yourself with 'Exam' or 'Interview' difficulty quizzes.")

        recommendations.append("💡 Use the 'Explain Differently' features in RAG Chat to simplify tricky definitions.")

        return {
            "total_quizzes": len(self.attempts_log),
            "total_questions_answered": total_q,
            "average_score": round(avg_score, 1),
            "weak_topics": weak_topics,
            "strong_topics": strong_topics,
            "topic_breakdown": sorted(topic_breakdown, key=lambda x: x["accuracy"]),
            "recommendations": recommendations
        }

    def generate_adaptive_quiz(
        self,
        context_text: str,
        num_questions: int = 10,
        difficulty: str = "Medium",
        weak_topic: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        if not context_text or len(context_text.strip()) < 50:
            return self._fallback_mcqs()

        topic_focus = f"Focus heavily on the topic '{weak_topic}'." if weak_topic else ""

        instruction = (
            f"Generate exactly {num_questions} high-quality multiple choice questions (MCQs) strictly based on the provided document context.\n"
            f"Difficulty Level: {difficulty}.\n"
            f"{topic_focus}\n\n"
            f"STRICT REQUIREMENTS:\n"
            f"1. Every question MUST test a substantive concept, formula, mechanism, definition, or practical problem.\n"
            f"2. ABSOLUTELY FORBIDDEN: NEVER ask about document structure, section numbers, outline headings, or table of contents (e.g., FORBIDDEN: 'What is covered in section 2?', 'What are the two subtopics listed under...').\n"
            f"3. All 4 options must be realistic and technically plausible.\n\n"
            f"Return STRICTLY a JSON array with objects matching this exact structure:\n"
            f"[\n"
            f"  {{\n"
            f'    "question": "Clear conceptual question text?",\n'
            f'    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            f'    "answer": 0,\n'
            f'    "topic": "Conceptual Topic Name",\n'
            f'    "explanation": "Rationale based on context.",\n'
            f'    "difficulty": "{difficulty}"\n'
            f"  }}\n"
            f"]"
        )

        res = get_gemini_json(context_text[:35000], instruction)
        
        validated = []
        bad_patterns = [
            r'sub-?topic', r'listed under', r'section \d', r'chapter \d',
            r'table of contents', r'under \'?\d+\.', r'topics listed'
        ]
        if isinstance(res, list):
            for item in res:
                if isinstance(item, dict) and "question" in item and "options" in item:
                    q_text = str(item["question"])
                    combined = (q_text + " " + " ".join(str(o) for o in item.get("options", []))).lower()
                    if any(re.search(p, combined) for p in bad_patterns):
                        continue
                    opts = item.get("options", [])
                    if len(opts) >= 2:
                        ans_idx = item.get("answer", 0)
                        if not isinstance(ans_idx, int) or ans_idx < 0 or ans_idx >= len(opts):
                            ans_idx = 0
                        validated.append({
                            "question": q_text,
                            "options": [str(o) for o in opts],
                            "answer": ans_idx,
                            "topic": str(item.get("topic", weak_topic or "Document Content")),
                            "explanation": str(item.get("explanation", "Refer to uploaded document context.")),
                            "difficulty": difficulty
                        })

        return validated if validated else self._fallback_mcqs()

    def generate_flashcards(
        self,
        context_text: str,
        num_cards: int = 10,
        difficulty: str = "Medium"
    ) -> List[Dict[str, Any]]:
        if not context_text or len(context_text.strip()) < 50:
            return self._fallback_flashcards()

        instruction = (
            f"Generate exactly {num_cards} high-yield study flashcards strictly from the conceptual content of the provided document.\n"
            f"Difficulty Level: {difficulty}.\n\n"
            f"STRICT CONTENT & QUALITY RULES:\n"
            f"1. Test SUBSTANTIVE CONCEPTS, DEFINITIONS, MECHANISMS, FORMULAS, and EXPLANATIONS.\n"
            f"2. ABSOLUTELY FORBIDDEN:\n"
            f"   - NEVER ask about document structure, section numbers, headings, sub-headings, or table of contents (e.g., FORBIDDEN: 'What are the two sub-topics listed under...', 'What is section 2?', 'What topics are in chapter 1?').\n"
            f"   - NEVER ask questions where the answer is just a list of section or topic names.\n"
            f"   - NEVER ask about document metadata, page numbers, or file names.\n"
            f"3. 'front': A clear, conceptual question or scenario testing understanding of how a concept works, why it is used, or its key definition (e.g., 'How do Python virtual environments prevent dependency conflicts across projects?').\n"
            f"4. 'back': A comprehensive, clear, and accurate explanation of the concept.\n"
            f"5. 'topic': The conceptual topic name (e.g., 'Virtual Environments', 'OOP Polymorphism').\n\n"
            f"Return STRICTLY a JSON array matching:\n"
            f"[\n"
            f"  {{\n"
            f'    "front": "Conceptual question testing understanding",\n'
            f'    "back": "Clear, informative conceptual answer / definition",\n'
            f'    "topic": "Conceptual Topic Name",\n'
            f'    "difficulty": "{difficulty}"\n'
            f"  }}\n"
            f"]"
        )

        res = get_gemini_json(context_text[:35000], instruction)
        validated = []
        bad_patterns = [
            r'sub-?topic', r'listed under', r'section \d', r'chapter \d',
            r'table of contents', r'under \'?\d+\.', r'topics listed',
            r'what are the (two|three|four|\d+) topics'
        ]
        if isinstance(res, list):
            for item in res:
                if isinstance(item, dict) and "front" in item and "back" in item:
                    front_text = str(item["front"])
                    back_text = str(item["back"])
                    combined = (front_text + " " + back_text).lower()
                    if any(re.search(p, combined) for p in bad_patterns):
                        continue
                    validated.append({
                        "front": front_text,
                        "back": back_text,
                        "topic": str(item.get("topic", "Core Subject")),
                        "difficulty": difficulty
                    })

        return validated if validated else self._fallback_flashcards()

    def generate_study_plan(
        self,
        subject: str,
        exam_date: str,
        daily_hours: float,
        current_level: str,
        documents_summary: str
    ) -> Dict[str, Any]:
        """
        Generates a custom day-by-day structured AI study plan tailored to the actual course content.
        """
        mins = int(daily_hours * 60)
        instruction = (
            f"Create an authoritative, custom 7-day AI Study Roadmap for the subject '{subject}'.\n"
            f"Target Exam Date: {exam_date}.\n"
            f"Daily Study Allocation: {daily_hours} hours ({mins} minutes/day).\n"
            f"Student Current Level: {current_level}.\n\n"
            f"DOCUMENT SYLLABUS & CONTENT:\n{documents_summary[:30000]}\n\n"
            f"CRITICAL INSTRUCTIONS:\n"
            f"1. You MUST read the provided document content above and extract the REAL topics, core concepts, formulas, tools, and best practices.\n"
            f"2. DO NOT use generic placeholder text like 'Read Chapter 1' or 'Core Definitions & Foundations'.\n"
            f"3. In each day's 'focus_topic', name the EXACT concept or domain from the syllabus (e.g. 'Virtual Environments & Dependency Resolution', 'OOP: Inheritance & Dunder Methods', 'Functional Programming & Generators').\n"
            f"4. In each day's 'tasks', specify 3 to 4 concrete, actionable study tasks mentioning the actual techniques, code, or theories from the document (e.g. 'Review venv activation commands and requirements.txt locking', 'Implement Dog/Animal class hierarchy testing __str__ and __repr__').\n"
            f"5. 'key_goal': A clear mastery objective for that specific topic.\n\n"
            f"Return STRICTLY a JSON object matching:\n"
            f"{{\n"
            f'  "title": "Mastery Roadmap: {subject}",\n'
            f'  "overview": "Detailed personalized study plan based on your course syllabus.",\n'
            f'  "total_days": 7,\n'
            f'  "daily_schedule": [\n'
            f'    {{\n'
            f'      "day": 1,\n'
            f'      "focus_topic": "Specific Concept from Document",\n'
            f'      "duration_minutes": {mins},\n'
            f'      "tasks": ["Specific task 1 mentioning real concepts", "Specific task 2", "Specific task 3"],\n'
            f'      "key_goal": "Specific mastery goal"\n'
            f'    }}\n'
            f'  ],\n'
            f'  "exam_day_tips": ["Actionable tip 1 for {subject}", "Actionable tip 2", "Actionable tip 3"]\n'
            f"}}"
        )

        res = get_gemini_json(documents_summary[:35000] if documents_summary else subject, instruction)
        if isinstance(res, dict) and "daily_schedule" in res and len(res["daily_schedule"]) > 0:
            return res

        # Extract topics dynamically from documents_summary if available
        extracted_topics = []
        if documents_summary:
            lines = documents_summary.split("\n")
            for line in lines:
                clean = line.strip()
                # Match numbered headings like "2. Installation and Environment Setup" or "2.1 Virtual Environments"
                m = re.match(r'^(?:\d+\.?\d*\.?\s+|#+\s+)([A-Za-z][A-Za-z0-9\s,\-_/]+)$', clean)
                if m:
                    t = m.group(1).strip()
                    if len(t) > 4 and t not in extracted_topics:
                        extracted_topics.append(t)

        if not extracted_topics or len(extracted_topics) < 4:
            extracted_topics = [
                f"{subject} Core Architecture & Syntax",
                f"{subject} Execution Mechanics & Data Types",
                f"{subject} Control Flow & Functional Constructs",
                f"{subject} Object-Oriented Modeling & Design",
                f"{subject} Standard Libraries & Ecosystem Packages",
                f"{subject} Practical Implementation & Optimization",
                f"{subject} Comprehensive Exam Mock & High-Yield Review"
            ]

        while len(extracted_topics) < 7:
            extracted_topics.append(f"{subject} Topic {len(extracted_topics)+1}")

        schedule = []
        for d in range(1, 8):
            topic_name = extracted_topics[d - 1] if d - 1 < len(extracted_topics) else f"{subject} Advanced Topics"
            schedule.append({
                "day": d,
                "focus_topic": topic_name,
                "duration_minutes": mins,
                "tasks": [
                    f"Master core principles and definitions of {topic_name}",
                    f"Work through implementation examples and edge cases for {topic_name}",
                    f"Generate active recall flashcards to test retention of {topic_name}"
                ],
                "key_goal": f"Achieve 90%+ conceptual mastery in {topic_name}"
            })

        return {
            "title": f"Mastery Study Roadmap: {subject}",
            "overview": f"A comprehensive 7-day syllabus-grounded roadmap designed for {daily_hours} hours daily study.",
            "total_days": 7,
            "daily_schedule": schedule,
            "exam_day_tips": [
                f"Review high-yield definitions and formulas for {subject} 1 hour before the exam.",
                "Practice active recall with flashcards rather than passive reading.",
                "Pace yourself during the exam: prioritize high-confidence questions first.",
                "Read each question stem carefully to avoid missing key constraints."
            ]
        }

    @staticmethod
    def _fallback_mcqs() -> List[Dict[str, Any]]:
        return [
            {
                "question": "What is the primary definition of Supervised Learning?",
                "options": [
                    "Training models using labeled datasets containing inputs and true target outputs",
                    "Grouping unlabelled data into clusters without human intervention",
                    "Executing code loops on remote serverless functions",
                    "Optimizing database indices for SQL query execution"
                ],
                "answer": 0,
                "topic": "Machine Learning Fundamentals",
                "explanation": "Supervised learning relies on paired input-output training data to learn mapping functions.",
                "difficulty": "Medium"
            },
            {
                "question": "Which evaluation metric is best suited for imbalanced classification tasks?",
                "options": [
                    "Precision-Recall AUC / F1-Score",
                    "Simple Accuracy Percentage",
                    "Mean Absolute Error (MAE)",
                    "Root Mean Squared Error (RMSE)"
                ],
                "answer": 0,
                "topic": "Model Evaluation Metrics",
                "explanation": "F1-Score and PR-AUC measure true performance when class distribution is highly imbalanced.",
                "difficulty": "Medium"
            },
            {
                "question": "What is the main function of an activation function in Neural Networks?",
                "options": [
                    "Introduce non-linearity enabling complex feature representation",
                    "Increase GPU memory speed during matrix multiplication",
                    "Normalize input file formatting before tokenization",
                    "Compress PDF text documents into chunk embeddings"
                ],
                "answer": 0,
                "topic": "Neural Network Architectures",
                "explanation": "Non-linear activation functions (like ReLU/Sigmoid) allow networks to learn non-linear decision boundaries.",
                "difficulty": "Medium"
            },
            {
                "question": "What primary problem does the Attention Mechanism solve in Sequence Processing?",
                "options": [
                    "Mitigates bottlenecking and information loss over long-distance dependencies",
                    "Eliminates the need for GPU hardware acceleration",
                    "Reduces training dataset size by 90%",
                    "Converts unstructured text directly into SQL queries"
                ],
                "answer": 0,
                "topic": "Transformer Architectures",
                "explanation": "Self-attention allows direct weighting of distant tokens regardless of positional distance.",
                "difficulty": "Medium"
            },
            {
                "question": "What distinguishes L1 Regularization (Lasso) from L2 Regularization (Ridge)?",
                "options": [
                    "L1 adds absolute weight penalties driving redundant weights to zero",
                    "L2 eliminates bias terms while L1 increases model variance",
                    "L1 can only be applied to decision trees",
                    "L2 performs automatic text chunking on PDF documents"
                ],
                "answer": 0,
                "topic": "Regularization Techniques",
                "explanation": "L1 regularization produces sparse feature representations by driving unimportant weights strictly to 0.",
                "difficulty": "Medium"
            },
            {
                "question": "What is Overfitting in Machine Learning models?",
                "options": [
                    "When a model learns noise and specific training patterns but fails to generalize to unseen test data",
                    "When a model is too simple to capture underlying patterns in training data",
                    "When data embeddings have insufficient vector dimensions",
                    "When API key authorization tokens expire"
                ],
                "answer": 0,
                "topic": "Model Training Dynamics",
                "explanation": "Overfitting occurs when high model capacity memorizes training noise rather than true underlying concepts.",
                "difficulty": "Medium"
            },
            {
                "question": "What is the purpose of Cross-Validation in empirical model testing?",
                "options": [
                    "To assess model stability and generalization accuracy across multiple data folds",
                    "To speed up text embedding generation in RAG pipelines",
                    "To auto-correct grammatical errors in prompt text",
                    "To convert DOCX files into raw TXT format"
                ],
                "answer": 0,
                "topic": "Validation Strategies",
                "explanation": "K-fold cross-validation provides an unbiased estimate of out-of-sample performance.",
                "difficulty": "Medium"
            },
            {
                "question": "In Vector Databases, what does Cosine Similarity measure?",
                "options": [
                    "The cosine of the angle between two multi-dimensional embedding vectors",
                    "The Euclidean distance between two database table rows",
                    "The exact character count difference between two strings",
                    "The network transmission speed of REST API endpoints"
                ],
                "answer": 0,
                "topic": "Vector Search & Retrieval",
                "explanation": "Cosine similarity measures directional alignment between normalized embeddings independently of magnitude.",
                "difficulty": "Medium"
            },
            {
                "question": "What is the role of a Prompt System Message in LLM Applications?",
                "options": [
                    "Establishes high-priority persona, safety guidelines, and output formatting rules",
                    "Increases GPU clock speed during inference",
                    "Automatically saves chat history to local disk storage",
                    "Compiles Python code into WebAssembly binaries"
                ],
                "answer": 0,
                "topic": "Prompt Engineering",
                "explanation": "System instructions set structural boundaries, tone, and behavioral constraints for language model outputs.",
                "difficulty": "Medium"
            },
            {
                "question": "What is Retrieval-Augmented Generation (RAG)?",
                "options": [
                    "Combining vector search retrieval with generative LLMs to ground responses in external documents",
                    "Fine-tuning model weights using gradient descent on proprietary datasets",
                    "Generating random multiple choice questions without source context",
                    "Compressing large PDF documents into ZIP archives"
                ],
                "answer": 0,
                "topic": "RAG Architectures",
                "explanation": "RAG dynamically fetches relevant context chunks to produce accurate, verifiable, and grounded model answers.",
                "difficulty": "Medium"
            }
        ]

    @staticmethod
    def _fallback_flashcards() -> List[Dict[str, Any]]:
        return [
            {
                "front": "What is the Gradient Descent Optimization Algorithm?",
                "back": "An iterative first-order optimization algorithm used to minimize a loss function by taking steps proportional to the negative gradient.",
                "topic": "Optimization Models",
                "difficulty": "Medium"
            },
            {
                "front": "Define Overfitting in Machine Learning.",
                "back": "A condition where a statistical model learns noise and details in the training data to the extent that it negatively impacts performance on new data.",
                "topic": "Model Generalization",
                "difficulty": "Medium"
            },
            {
                "front": "What is the core function of Self-Attention in Transformers?",
                "back": "Calculates contextual relevance scores between all tokens in a sequence simultaneously, capturing long-range semantic dependencies.",
                "topic": "Transformer Architectures",
                "difficulty": "Medium"
            },
            {
                "front": "What is Vector Embeddings in RAG?",
                "back": "Dense numerical vector representations of text where semantically similar concepts map close together in high-dimensional space.",
                "topic": "Vector Search & Retrieval",
                "difficulty": "Medium"
            },
            {
                "front": "Explain the difference between Precision and Recall.",
                "back": "Precision measures true positives out of all predicted positives. Recall measures true positives out of all actual positives.",
                "topic": "Evaluation Metrics",
                "difficulty": "Medium"
            },
            {
                "front": "What is the Bias-Variance Tradeoff?",
                "back": "The balance between underfitting (high bias, oversimplified model) and overfitting (high variance, oversensitive to training data noise).",
                "topic": "Learning Theory",
                "difficulty": "Medium"
            },
            {
                "front": "What is the purpose of Data Normalization?",
                "back": "Scaling numerical input features to a standard range (e.g. 0 to 1) to ensure equal weight during model gradient updates.",
                "topic": "Data Preprocessing",
                "difficulty": "Medium"
            },
            {
                "front": "Define Zero-Shot Learning.",
                "back": "A model's ability to accurately classify or respond to tasks without receiving any explicit training examples beforehand.",
                "topic": "Prompt Engineering",
                "difficulty": "Medium"
            },
            {
                "front": "What is Grounding in AI Systems?",
                "back": "Constraining model outputs strictly to verifiable source context documents to eliminate hallucinations.",
                "topic": "Grounded RAG",
                "difficulty": "Medium"
            },
            {
                "front": "What is Cross-Entropy Loss?",
                "back": "A loss function measuring the performance of a classification model whose output is a probability value between 0 and 1.",
                "topic": "Loss Functions",
                "difficulty": "Medium"
            }
        ]

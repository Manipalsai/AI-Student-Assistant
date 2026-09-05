import time
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
            f"Generate exactly {num_questions} multiple choice questions (MCQs) strictly based on the provided document context.\n"
            f"Difficulty Level: {difficulty}.\n"
            f"{topic_focus}\n\n"
            f"Return STRICTLY a JSON array with objects matching this exact structure:\n"
            f"[\n"
            f"  {{\n"
            f'    "question": "Clear question text?",\n'
            f'    "options": ["Option A", "Option B", "Option C", "Option D"],\n'
            f'    "answer": 0,\n'
            f'    "topic": "Topic Name from Document",\n'
            f'    "explanation": "Rationale based on context.",\n'
            f'    "difficulty": "{difficulty}"\n'
            f"  }}\n"
            f"]"
        )

        res = get_gemini_json(context_text[:30000], instruction)
        
        validated = []
        if isinstance(res, list):
            for item in res:
                if isinstance(item, dict) and "question" in item and "options" in item:
                    opts = item.get("options", [])
                    if len(opts) >= 2:
                        ans_idx = item.get("answer", 0)
                        if not isinstance(ans_idx, int) or ans_idx < 0 or ans_idx >= len(opts):
                            ans_idx = 0
                        validated.append({
                            "question": str(item["question"]),
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
            f"Generate exactly {num_cards} study flashcards strictly from the provided document context text.\n"
            f"Difficulty Level: {difficulty}.\n\n"
            f"Return STRICTLY a JSON array matching:\n"
            f"[\n"
            f"  {{\n"
            f'    "front": "Question or Key Concept from Document",\n'
            f'    "back": "Clear concise answer / definition from Document",\n'
            f'    "topic": "Topic Name",\n'
            f'    "difficulty": "{difficulty}"\n'
            f"  }}\n"
            f"]"
        )

        res = get_gemini_json(context_text[:30000], instruction)
        validated = []
        if isinstance(res, list):
            for item in res:
                if isinstance(item, dict) and "front" in item and "back" in item:
                    validated.append({
                        "front": str(item["front"]),
                        "back": str(item["back"]),
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
        instruction = (
            f"Create a structured step-by-step AI Study Plan for subject '{subject}'.\n"
            f"Exam Target Date: {exam_date}.\n"
            f"Daily Available Study Time: {daily_hours} hours.\n"
            f"Student Current Level: {current_level}.\n"
            f"Document Syllabus Content:\n{documents_summary[:4000]}\n\n"
            f"INSTRUCTION: Extract ACTUAL topics, chapters, and concepts from the Document Syllabus Content provided above. "
            f"Create realistic, specific daily tasks matching the document content.\n\n"
            f"Return STRICTLY a JSON object matching:\n"
            f"{{\n"
            f'  "title": "Mastery Roadmap: {subject}",\n'
            f'  "overview": "Strategic study roadmap tailored to your syllabus content.",\n'
            f'  "total_days": 7,\n'
            f'  "daily_schedule": [\n'
            f'    {{\n'
            f'      "day": 1,\n'
            f'      "focus_topic": "Specific Topic Name from Document",\n'
            f'      "duration_minutes": {int(daily_hours * 60)},\n'
            f'      "tasks": ["Read Chapter/Section from document", "Practice 5 MCQs on Topic", "Review Flashcards"],\n'
            f'      "key_goal": "Understand core principles of Topic"\n'
            f'    }}\n'
            f'  ],\n'
            f'  "exam_day_tips": ["Review weak topic summaries", "Practice active recall with flashcards"]\n'
            f"}}"
        )

        res = get_gemini_json(documents_summary[:10000] if documents_summary else subject, instruction)
        if isinstance(res, dict) and "daily_schedule" in res:
            return res

        return {
            "title": f"Accelerated Study Plan: {subject}",
            "overview": f"A targeted study roadmap designed for {daily_hours} hours daily study based on your course material.",
            "total_days": 7,
            "daily_schedule": [
                {
                    "day": 1,
                    "focus_topic": f"{subject} Core Concepts & Foundations",
                    "duration_minutes": int(daily_hours * 60),
                    "tasks": ["Read Section 1 of uploaded syllabus", "Generate & review 10 Flashcards"],
                    "key_goal": "Understand fundamental terminology"
                },
                {
                    "day": 2,
                    "focus_topic": f"{subject} Practical Principles & Applications",
                    "duration_minutes": int(daily_hours * 60),
                    "tasks": ["Study key formulas and models", "Attempt 10 Medium MCQs"],
                    "key_goal": "Apply core principles to problem solving"
                }
            ],
            "exam_day_tips": ["Review weak topic summaries", "Practice active recall with flashcards"]
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
            }
        ]

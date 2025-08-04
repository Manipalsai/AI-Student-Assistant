import re
import random

def load_mcqs(file_path="mcqs_output.txt"):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ mcqs_output.txt not found.")
        return []

    # Split questions using regex
    raw_questions = re.split(r'\n(?=\d+\.\s)', content.strip())
    mcqs = []

    for block in raw_questions:
        try:
            question_match = re.search(r"\d+\.\s+(.+?)\n", block)
            options = re.findall(r"[A-D]\)\s+(.+)", block)
            answer_match = re.search(r"Answer:\s*([A-D])", block, re.IGNORECASE)

            if question_match and len(options) == 4 and answer_match:
                mcqs.append({
                    "question": question_match.group(1).strip(),
                    "options": [opt.strip() for opt in options],
                    "answer": answer_match.group(1).upper(),
                    "explanation": ""  
                })
            else:
                print("⚠️ Skipped malformed block:\n", block[:100])
        except Exception as e:
            print(f"⚠️ Error parsing block:\n{block[:100]}\nError: {e}")

    random.shuffle(mcqs)
    print(f"✅ Loaded {len(mcqs)} MCQs for quiz.")
    return mcqs


if __name__ == "__main__":
    mcqs = load_mcqs()
    if not mcqs:
        print("❌ No MCQs found.")
    else:
        print("✅ Sample MCQ:", mcqs[0])
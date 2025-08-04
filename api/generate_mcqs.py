import google.generativeai as genai
import os
import fitz  
from docx import Document
import markdown
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from datetime import datetime

genai.configure(api_key="AIzaSyB4x81dLPbD2ygOiJSZOg1ZrCvKleTQ0Co")  
model = genai.GenerativeModel(model_name="gemini-1.5-flash")

def extract_text_from_file(file_path):
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif ext == ".pdf":
        text = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text += page.get_text()
        return text
    elif ext == ".docx":
        doc = Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])
    elif ext == ".md":
        with open(file_path, "r", encoding="utf-8") as f:
            return markdown.markdown(f.read())
    else:
        raise ValueError("Unsupported file format.")

def save_mcqs_as_pdf(content, output_path="mcqs_output.pdf"):
    try:
        c = canvas.Canvas(output_path, pagesize=A4)
        width, height = A4
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 50, "🧠 Multiple Choice Questions")
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 70, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        c.setFont("Helvetica", 11)
        y = height - 100
        for line in content.split("\n"):
            if y < 50:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 11)
            c.drawString(50, y, line.strip())
            y -= 15
        c.save()
        print("💾 PDF saved to mcqs_output.pdf")
    except Exception as e:
        print("❌ PDF Generation Error:", e)

def generate_mcqs(file_path):
    try:
        study_content = extract_text_from_file(file_path)
    except Exception as e:
        return f"❌ Error reading file: {e}", None

    # Step 1: Generate questions only
    prompt1 = f"""
    Generate 10 multiple choice questions (MCQs) based on the following study material.
    Do NOT include answers. Format:

    1. Question?
    A) Option A
    B) Option B
    C) Option C
    D) Option D

    Material:
    {study_content}
    """
    try:
        questions = model.generate_content(prompt1).text.strip()

        # Step 2: Generate answer key
        prompt2 = f"""
        Provide the correct answer label (A/B/C/D) for the following questions in the format:
        1. B
        2. C
        ...

        {questions}
        """
        answers_raw = model.generate_content(prompt2).text.strip()
        answer_dict = {}
        for line in answers_raw.splitlines():
            if '.' in line:
                qno, ans = line.split('.', 1)
                answer_dict[qno.strip()] = ans.strip().upper()

        # Merge answers
        formatted_blocks = []
        q_counter = 0
        block = []
        for line in questions.splitlines():
            if line.strip().startswith(f"{q_counter + 1}."):
                if block:
                    formatted_blocks.append("\n".join(block))
                block = [line]
                q_counter += 1
            else:
                block.append(line)
        if block:
            formatted_blocks.append("\n".join(block))

        final_text = ""
        for i, block in enumerate(formatted_blocks, 1):
            ans = answer_dict.get(str(i), "?")
            final_text += f"{block}\nAnswer: {ans}\n\n"

        with open("mcqs_output.txt", "w", encoding="utf-8") as f:
            f.write(final_text.strip())

        save_mcqs_as_pdf(final_text.strip())
        return final_text.strip(), "mcqs_output.pdf"

    except Exception as e:
        print("❌ Gemini API Error:", e)
        return f"❌ Gemini API Error: {e}", None

if __name__ == "__main__":
    generate_mcqs("sample.pdf") 
# =========================================================================
# FINAL summarize_text.py - Corrected to accept model as a parameter
# =========================================================================

import google.generativeai as genai
import os
from datetime import datetime
from text_extractor import extract_text 
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

# Remove all hardcoded API keys and configure calls

# GENERATE CLEAN SUMMARY
def summarize_text_with_model(file_path, model):
    try:
        extracted_text = extract_text(file_path)

        prompt = f"""
You are a study assistant. Your task is to generate a clean, readable summary of the following text.

📝 Instructions:
- The output should be in simple plain text.
- Use clear section headings like "Arrays", "Linked Lists", "Stacks and Queues", etc.
- Do NOT use any Markdown symbols like # or **.
- Each section should start with a title and a brief paragraph summarizing that topic.
- The summary should be structured, informative, and readable.

Text:
{extracted_text}
        """

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred during summarization: {e}")
        return f"Error: Failed to generate summary. Details: {e}"

#SAVE TO PDF
def save_summary_to_pdf(summary_text, filename="summary_output.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    title = "Study Material Summary"
    date_str = datetime.now().strftime("%B %d, %Y")

    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, height - 72, title)
    c.setFont("Helvetica", 11)
    c.drawString(72, height - 90, f"Date: {date_str}")

    text_obj = c.beginText(72, height - 120)
    text_obj.setFont("Helvetica", 11)

    for line in summary_text.split("\n"):
        if line.strip() == "":
            text_obj.textLine(" ")
        else:
            text_obj.textLine(line.strip())

    c.drawText(text_obj)
    c.save()
    print(f"✅ Summary saved to PDF as '{filename}'")

# The testing block is not needed for the Vercel deployment
# if __name__ == "__main__":
#     file_path = "sample.pdf"
#     summary = summarize_text(file_path)
#     
#     print("\n=== SUMMARY ===\n")
#     print(summary)
# 
#     if not summary.startswith("Error:"):
#         save_summary_to_pdf(summary)
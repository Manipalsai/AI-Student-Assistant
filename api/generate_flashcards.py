from utils import extract_text, get_gemini_json

def generate_flashcards(file_path):
    """
    Generates Flashcards from file content as JSON.
    """
    try:
        text = extract_text(file_path)
        if not text:
            return {"error": "Could not extract text from file."}

        prompt = f"""
        Generate 10 key concept flashcards based on the following text.
        Each flashcard should have a 'front' (the term or question) and a 'back' (the definition or answer).
        
        Content:
        {text}

        Return output as a JSON object:
        {{
            "flashcards": [
                {{
                    "front": "Term",
                    "back": "Definition"
                }}
            ]
        }}
        """

        result = get_gemini_json(prompt)
        if not result or 'flashcards' not in result:
             return {"error": "Failed to generate flashcards."}
        
        return {"flashcards": result['flashcards']}

    except Exception as e:
        return {"error": f"Error generating Flashcards: {e}"}

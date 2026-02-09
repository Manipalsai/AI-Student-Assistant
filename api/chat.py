from utils import extract_text, get_gemini_text

def chat_with_document(file_path, user_query, chat_history=[]):
    """
    Simulates a chat with the document. Ideally this would be RAG, 
    but for a simple demo, we pass the extracted text as context.
    """
    try:
        # Check cache or re-extract text?
        # For simplicity, we extract every time or rely on client sending full text context?
        # Since this API takes file_path, we must extract. 
        # CAUTION: If file is large, context window might be exceeded.
        # But user wants "Top Notch", so let's try to handle it.
        
        text = extract_text(file_path)
        if not text:
            return "Error: Could not read document context."

        # Limit context size to avoid token limits (very crude)
        if len(text) > 50000:
            text = text[:50000] + "...(truncated)"

        history_str = "\n".join([f"User: {msg['user']}\nAI: {msg['ai']}" for msg in chat_history])
        
        prompt = f"""
        You are an intelligent assistant helping a user understand a document.
        
        Document Content:
        {text}
        
        Chat History:
        {history_str}
        
        User Question: {user_query}
        
        Answer based ONLY on the document provided. If the answer is not in the document, say "I cannot find the answer in the document."
        """

        return get_gemini_text(prompt)

    except Exception as e:
        return f"Error in chat: {e}"

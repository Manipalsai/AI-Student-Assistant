# AI POWERED Student Assistant

A full-stack application for assisting students with their studies by leveraging the power of AI. This project was built to provide an interactive and educational tool for processing study materials and generating self-assessment quizzes.

---

### ✨ Features

* **Intelligent Document Analysis:** Upload a PDF file to get a clean, readable summary of its content, highlighting key concepts and main points.
* **Dynamic Quiz Generation:** Instantly create quizzes and multiple-choice questions (MCQs) based on the uploaded document to test your comprehension.
* **PDF Export:** Save the generated summary and quiz questions to a PDF file for easy access and revision.
* **Modern & Interactive UI:** A clean, minimalist user interface designed for a seamless and intuitive user experience.
* **Dynamic Content:** Real-time generation of summaries and quizzes tailored to the specific content of your uploaded material.

---

### 🚀 Technologies Used

**Frontend:**
* **React:** The core library for building the user interface.
* **HTML/CSS:** For structuring and styling the application.

**Backend:**
* **Python:** The core language for the backend logic.
* **Google Gemini API:** The AI model used for text generation and summarization.
* **`reportlab`:** A Python library for generating PDF files.

---

### ⚙️ How to Run Locally

#### Prerequisites

* **Git:** For cloning the repository.
* **Node.js & npm:** For running the frontend.
* **Python & pip:** For running the backend.
* **A Gemini API Key:** Get one from [Google AI Studio](https://aistudio.google.com/app/apikey) and add it to your backend code (e.g., in `summarize_text.py`).

#### Installation

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/Manipalsai/AI-Student-Assistant.git](https://github.com/Manipalsai/AI-Student-Assistant.git)
    cd AI-Student-Assistant
    ```

2.  **Backend Setup:**
    * Navigate to your backend directory (if separate).
    * Install the required Python packages:
        ```bash
        pip install google-generativeai reportlab
        ```
    * Start your backend server.

3.  **Frontend Setup:**
    * Navigate to the frontend directory.
    * Install the npm dependencies:
        ```bash
        npm install
        ```
    * Start the development server:
        ```bash
        npm run dev
        ```

The application will open in your browser at `http://localhost:5173` (or a similar address).

---

### 🤝 Contributing

This project is a great starting point for anyone interested in full-stack development and AI applications. Feel free to fork the repository, add new features, and improve the UI!

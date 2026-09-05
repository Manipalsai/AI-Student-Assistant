# Deploying AI Student Assistant (RAG Platform)

This project is configured for deployment on **Vercel** or any cloud platform (Render, Railway, AWS, Docker).

## Prerequisites

1.  **Vercel Account**: Sign up at [vercel.com](https://vercel.com).
2.  **Google Gemini API Key**: Obtain a key from [aistudio.google.com](https://aistudio.google.com).

## Deployment Instructions

### 1. Vercel Deployment

1. Push code to GitHub repository.
2. In Vercel, click **"Add New Project"** and import your repository.
3. Add Environment Variable:
   * **Key**: `GOOGLE_API_KEY`
   * **Value**: `your_gemini_api_key`
4. Click **Deploy**.

Vercel will build the React Vite frontend using `@vercel/static-build` and deploy the FastAPI backend using `@vercel/python`.

### 2. Local Development

**Backend Server:**
```bash
cd api
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

**Frontend Server:**
```bash
cd Frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

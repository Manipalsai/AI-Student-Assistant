# Deploying AI Student Assistant

This project is configured for easy deployment on **Vercel**. It uses a Python backend (FastAPI) and a React frontend (Vite).

## Prerequisites

1.  **Vercel Account**: Create one at [vercel.com](https://vercel.com).
2.  **Google Gemini API Key**: Get one at [aistudio.google.com](https://aistudio.google.com).

## Deployment Steps

### 1. Deploy to Vercel (Automatic)

Since the project has a `vercel.json` configuration, you can deploy it directly.

1.  Push your code to a GitHub repository.
2.  Log in to Vercel and click **"Add New Project"**.
3.  Import your GitHub repository.
4.  **Environment Variables**:
    *   In the "Environment Variables" section, add a new variable:
        *   **Key**: `GOOGLE_API_KEY`
        *   **Value**: `your_gemini_api_key_here`
5.  Click **Deploy**.

Vercel will automatically:
*   Build the Frontend using `npm install` and `npm run build`.
*   Set up the Python Backend Serverless Functions.
*   Route `/api/*` requests to the backend logic.

### 2. Local Development

To run the project locally on your machine:

**Backend:**
```bash
cd api
pip install -r requirements.txt
uvicorn app:app --reload
```
(Server runs at `http://localhost:8000`)

**Frontend:**
```bash
cd Frontend
npm install
npm run dev
```
(Client runs at `http://localhost:5173`)

The frontend is configured to proxy `/api` requests to `http://localhost:8000`, so everything works seamlessly.

## Troubleshooting

*   **Timeout Errors**: If generating a summary or quiz takes longer than 10 seconds (Vercel Hobby plan limit), you might see a timeout error. The `flash` model (Gemini 1.5 Flash) used in this project is optimized for speed to avoid this.
*   **Missing Dependencies**: If the backend fails, check if `api/requirements.txt` lists all used libraries.

## Project Structure

*   `Frontend/`: React application (UI).
*   `api/`: Python FastAPI application (Logic).
*   `vercel.json`: Deployment configuration.

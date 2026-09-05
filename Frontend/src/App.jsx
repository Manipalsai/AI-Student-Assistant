import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import DashboardLayout from './layouts/DashboardLayout';
import DocumentLibrary from './pages/dashboard/DocumentLibrary';
import Summarize from './pages/dashboard/Summarize';
import Flashcards from './pages/dashboard/Flashcards';
import Quiz from './pages/dashboard/Quiz';
import Chat from './pages/dashboard/Chat';
import StudyPlan from './pages/dashboard/StudyPlan';
import AnalyticsDashboard from './pages/dashboard/AnalyticsDashboard';
import { StudyProvider } from './context/StudyContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <StudyProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#0f172a',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#0f172a',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="documents" replace />} />
          <Route path="documents" element={<DocumentLibrary />} />
          <Route path="chat" element={<Chat />} />
          <Route path="summary" element={<Summarize />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="study-plan" element={<StudyPlan />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudyProvider>
  );
}

export default App;

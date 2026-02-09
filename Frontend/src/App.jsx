
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import DashboardLayout from './layouts/DashboardLayout';
import Summarize from './pages/dashboard/Summarize';
import Flashcards from './pages/dashboard/Flashcards';
import Quiz from './pages/dashboard/Quiz';
import Chat from './pages/dashboard/Chat';
import { StudyProvider } from './context/StudyContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <StudyProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<Summarize />} />
          <Route path="flashcards" element={<Flashcards />} />
          <Route path="quiz" element={<Quiz />} />
          <Route path="chat" element={<Chat />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </StudyProvider>
  );
}

export default App;

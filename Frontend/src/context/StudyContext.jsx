import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudyContext = createContext();

export const StudyProvider = ({ children }) => {
    // Multi-document state
    const [documents, setDocuments] = useState([]);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Feature specific persistent states
    const [summary, setSummary] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [flashcards, setFlashcards] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [studyPlan, setStudyPlan] = useState(null);

    // RAG Customization Controls
    const [explanationStyle, setExplanationStyle] = useState("standard");
    const [targetLanguage, setTargetLanguage] = useState("English");
    const [difficulty, setDifficulty] = useState("Medium");

    // Fetch documents and analytics on load
    useEffect(() => {
        fetchDocuments();
        fetchAnalytics();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await axios.get('/api/documents');
            if (res.data && res.data.documents) {
                setDocuments(res.data.documents);
                // By default, select all uploaded documents
                if (selectedDocumentIds.length === 0) {
                    setSelectedDocumentIds(res.data.documents.map(d => d.id));
                }
            }
        } catch (err) {
            console.error("Failed to fetch documents:", err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await axios.get('/api/analytics');
            if (res.data) {
                setAnalytics(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        }
    };

    const uploadDocument = async (file) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post('/api/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data && res.data.document) {
                const newDoc = res.data.document;
                setDocuments(prev => [...prev.filter(d => d.id !== newDoc.id), newDoc]);
                setSelectedDocumentIds(prev => [...new Set([...prev, newDoc.id])]);
                toast.success(res.data.message || `Uploaded '${file.name}'`);
                fetchAnalytics();
                return newDoc;
            }
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Failed to upload document.";
            toast.error(msg);
            throw new Error(msg);
        } finally {
            setUploading(false);
        }
    };

    const deleteDocument = async (docId) => {
        try {
            await axios.delete(`/api/documents/${docId}`);
            setDocuments(prev => prev.filter(d => d.id !== docId));
            setSelectedDocumentIds(prev => prev.filter(id => id !== docId));
            toast.success("Document deleted");
            fetchAnalytics();
        } catch (err) {
            toast.error("Failed to delete document");
        }
    };

    const toggleDocumentSelection = (docId) => {
        setSelectedDocumentIds(prev => {
            if (prev.includes(docId)) {
                return prev.filter(id => id !== docId);
            } else {
                return [...prev, docId];
            }
        });
    };

    const selectAllDocuments = () => {
        setSelectedDocumentIds(documents.map(d => d.id));
    };

    const queryRag = async (query, customStyle = null, customLang = null) => {
        setLoading(true);
        try {
            // Convert internal chat format [{user, ai}] to API format [{role, content}]
            const historyForAPI = chatHistory.flatMap(msg => {
                const turns = [];
                if (msg.user) turns.push({ role: 'user', content: msg.user });
                if (msg.ai) turns.push({ role: 'model', content: msg.ai });
                return turns;
            });

            const payload = {
                query,
                document_ids: selectedDocumentIds,
                history: historyForAPI,
                explanation_style: customStyle || explanationStyle,
                target_language: customLang || targetLanguage
            };

            const res = await axios.post('/api/rag/query', payload);
            const data = res.data;

            const aiMessage = {
                user: query,
                ai: data.answer,
                citations: data.citations || [],
                grounded: data.grounded,
                rewritten_query: data.rewritten_query,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setChatHistory(prev => [...prev, aiMessage]);
            return data;
        } catch (err) {
            const msg = err.response?.data?.detail || err.message || "Failed to query RAG assistant.";
            toast.error(msg, { id: 'rag-error' });
            return null;
        } finally {
            setLoading(false);
        }
    };

    const generateSummary = async (customDocId = null) => {
        setLoading(true);
        try {
            const docIds = customDocId ? [customDocId] : selectedDocumentIds;
            const res = await axios.post('/api/summarize', { document_ids: docIds });
            setSummary(res.data.summary);
            return res.data.summary;
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate summary.");
        } finally {
            setLoading(false);
        }
    };

    const generateQuiz = async (customDifficulty = null, weakTopic = null) => {
        setLoading(true);
        try {
            const res = await axios.post('/api/quiz', {
                document_ids: selectedDocumentIds,
                num_questions: 10,
                difficulty: customDifficulty || difficulty,
                weak_topic: weakTopic
            });
            const qList = res.data.mcqs || res.data.quiz;
            setQuiz(qList);
            return qList;
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate quiz.");
        } finally {
            setLoading(false);
        }
    };

    const submitQuizAttempt = async (attemptData) => {
        try {
            await axios.post('/api/quiz/submit', attemptData);
            toast.success("Quiz score saved to Learning Analytics!");
            fetchAnalytics();
        } catch (err) {
            console.error("Failed to log quiz attempt:", err);
        }
    };

    const generateFlashcards = async (customDifficulty = null) => {
        setLoading(true);
        try {
            const res = await axios.post('/api/flashcards', {
                document_ids: selectedDocumentIds,
                num_cards: 10,
                difficulty: customDifficulty || difficulty
            });
            setFlashcards(res.data.flashcards);
            return res.data.flashcards;
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate flashcards.");
        } finally {
            setLoading(false);
        }
    };

    const generateStudyPlan = async (planParams) => {
        setLoading(true);
        try {
            const res = await axios.post('/api/study-plan', {
                ...planParams,
                document_ids: selectedDocumentIds
            });
            setStudyPlan(res.data);
            return res.data;
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to generate AI study plan.");
        } finally {
            setLoading(false);
        }
    };

    const clearChatHistory = () => setChatHistory([]);

    return (
        <StudyContext.Provider value={{
            documents, selectedDocumentIds, loading, uploading,
            uploadDocument, deleteDocument, toggleDocumentSelection, selectAllDocuments,
            summary, setSummary, generateSummary,
            quiz, setQuiz, generateQuiz, submitQuizAttempt,
            flashcards, setFlashcards, generateFlashcards,
            chatHistory, setChatHistory, clearChatHistory, queryRag,
            analytics, fetchAnalytics,
            studyPlan, setStudyPlan, generateStudyPlan,
            explanationStyle, setExplanationStyle,
            targetLanguage, setTargetLanguage,
            difficulty, setDifficulty
        }}>
            {children}
        </StudyContext.Provider>
    );
};

export const useStudy = () => useContext(StudyContext);

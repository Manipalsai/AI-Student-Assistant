import { createContext, useContext, useState } from 'react';
import axios from 'axios';

const StudyContext = createContext();

export const StudyProvider = ({ children }) => {
    const [text, setText] = useState(null);
    const [fileName, setFileName] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Persistent study content states
    const [summary, setSummary] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [flashcards, setFlashcards] = useState(null);
    const [chatHistory, setChatHistory] = useState([]);

    const uploadFile = async (file) => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await axios.post('/api/extract-text', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.text) {
                setText(res.data.text);
                setFileName(file.name);
                // Clear previous contexts when a new file is uploaded
                setSummary(null);
                setQuiz(null);
                setFlashcards(null);
                setChatHistory([]);
            } else {
                throw new Error("No text returned from server.");
            }
        } catch (err) {
            setError(err.message || "Failed to upload file.");
        } finally {
            setLoading(false);
        }
    };

    const clearFile = () => {
        setText(null);
        setFileName(null);
        setSummary(null);
        setQuiz(null);
        setFlashcards(null);
        setChatHistory([]);
    };

    return (
        <StudyContext.Provider value={{
            text, fileName, loading, error, uploadFile, clearFile,
            summary, setSummary,
            quiz, setQuiz,
            flashcards, setFlashcards,
            chatHistory, setChatHistory
        }}>
            {children}
        </StudyContext.Provider>
    );
};

export const useStudy = () => useContext(StudyContext);

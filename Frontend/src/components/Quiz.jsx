import React, { useState } from "react";
import axios from "axios";

function Quiz() {
const [mcqs, setMcqs] = useState([]);
const [current, setCurrent] = useState(0);
const [selected, setSelected] = useState("");
const [score, setScore] = useState(0);
const [showAnswer, setShowAnswer] = useState(false);
const [started, setStarted] = useState(false);
const [loading, setLoading] = useState(false);

const startQuiz = async () => {
    setLoading(true);
    try {
    const res = await axios.get("/api/get-quiz");
    setMcqs(res.data.mcqs);
    setStarted(true);
} catch (err) {
    console.error("Quiz load error:", err);
    alert(" Failed to load quiz. Check backend.");
} finally {
    setLoading(false);
}

const handleSubmit = () => {
    if (selected === mcqs[current]?.answer) {
    setScore(score + 1);
    }
    setShowAnswer(true);
};

const handleNext = () => {
    setSelected("");
    setShowAnswer(false);
    setCurrent(current + 1);
};

if (!started) {
    return (
    <div className="card quiz-card">
        <h2>Ready to take a Quiz?</h2>
        <button onClick={startQuiz}>Start Quiz</button>
        {loading && <p>🚀 Starting quiz...</p>}
    </div>
    );
}

if (!mcqs.length) {
    return (
    <div className="card quiz-card">
        <p>⏳ Loading quiz...</p>
    </div>
    );
}

if (current >= mcqs.length) {
    return (
    <div className="card quiz-card">
        <h2>🎉 Quiz Completed!</h2>
        <p>You scored {score} out of {mcqs.length}</p>
    </div>
    );
}

const q = mcqs[current];
const correct = q.answer;

return (
    <div className="card quiz-card">
    <h2>Quiz</h2>
    <div style={{
        padding: "1rem",
        borderRadius: "8px",
        marginTop: "1rem",
        fontFamily: "Arial, sans-serif",
    }}>
        <p><b>{current + 1}. {q.question}</b></p>

        {q.options.map((opt, i) => {
        const label = String.fromCharCode(65 + i);
        let color = "inherit";

        if (showAnswer) {
            if (label === correct) color = "green";
            else if (label === selected && label !== correct) color = "red";
        }

        return (
            <div key={i}>
            <input
                type="radio"
                id={`opt-${i}`}
                name="option"
                value={label}
                onChange={() => setSelected(label)}
                checked={selected === label}
                disabled={showAnswer}
            />
            <label htmlFor={`opt-${i}`} style={{ color }}>
                {" "}{label}. {opt}
            </label>
            </div>
        );
        })}

{!showAnswer ? (
<button
    style={{ marginTop: "10px" }}
    onClick={handleSubmit}
    disabled={!selected}
>
    Submit
</button>
) : (
<>
    <p style={{ color: "green", marginTop: "10px" }}>
    ✅ <b>Correct Answer:</b> {correct}
    </p>
    {current < mcqs.length - 1 ? (
    <button onClick={handleNext}>Next</button>
    ) : (
    <button
        style={{ marginTop: "10px", backgroundColor: "#2e7d32", color: "#fff", padding: "8px 16px", borderRadius: "4px" }}
        onClick={handleNext}
    >
        Finish Quiz
    </button>
    )}
</>
)}

    </div>
    </div>
);
}

export default Quiz;
import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

function McqGenerator() {
const [file, setFile] = useState(null);
const [mcqs, setMcqs] = useState("");
const [loading, setLoading] = useState(false);

const handleFileChange = (e) => {
    setFile(e.target.files[0]);
};

const handleGenerateMCQs = async () => {
    if (!file) {
    alert("Please choose a file first.");
    return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
    const response = await axios.post("https://your-public-backend-url.com/generate-mcqs", formData);
    console.log("MCQs:", response.data.mcqs);
    setMcqs(response.data.mcqs);
} catch (error) {
    console.error("Error generating MCQs:", error);
    alert("Failed to generate MCQs. Check backend and file.");
} finally {
    setLoading(false);
    }
};

const handleSaveTxt = () => {
    if (!mcqs) {
    alert("No MCQs to save!");
    return;
    }

    const element = document.createElement("a");
    const fileBlob = new Blob([mcqs], { type: "text/plain" });
    element.href = URL.createObjectURL(fileBlob);
    element.download = "mcqs_output.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

const handleSavePDF = () => {
    const doc = new jsPDF();
    const lines = mcqs.split("\n");
    let y = 10;

    doc.setFont("Times", "normal");
    doc.setFontSize(12);

    lines.forEach((line) => {
    if (y > 280) {
        doc.addPage();
        y = 10;
    }
    doc.text(line, 10, y);
    y += 10;
    });

    doc.save("mcqs_output.pdf");
};

return (
    <div className="card mcq-card">
    <h2> MCQ Generator</h2>
    <input type="file" onChange={handleFileChange} />
    <button onClick={handleGenerateMCQs}>Generate MCQs</button>

    {loading && <p>⚙️ Generating MCQs...</p>}

    {mcqs && !loading && (
        <>
        <div style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "1em",
            marginTop: "1em",
            background: "#f8f8f8",
            fontFamily: "Arial, sans-serif",
            borderRadius: "5px",
            whiteSpace: "pre-wrap",
            color: "#000"
        }}>
            {mcqs}
        </div>

        <div style={{ marginTop: "10px" }}>
            <button onClick={handleSaveTxt}>💾 Download as Txt</button>
            <button onClick={handleSavePDF}>📄 Download as PDF</button>
        </div>
        </>
    )}
    </div>
);
}

export default McqGenerator;
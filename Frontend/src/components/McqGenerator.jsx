import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";

function McqGenerator() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [mcqs, setMcqs] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setFileName(uploadedFile ? uploadedFile.name : "No file chosen");
  };

  const handleGenerateMCQs = async () => {
    if (!file) {
      alert("Please choose a file first.");
      return;
    }

    setLoading(true);
    setMcqs(""); // Clear previous MCQs
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/generate-mcqs", formData);
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
      <h2>MCQ Generator</h2>
      
      {/* File input and button using our new styles */}
      <div className="file-input-container">
        <div className="file-input-wrapper">
          <input 
            type="file" 
            id="file-input-mcq" 
            onChange={handleFileChange} 
          />
          <label htmlFor="file-input-mcq" className="choose-file-button">
            Choose File
          </label>
        </div>
        <span className="file-name-display">{fileName}</span>
      </div>
      
      {/* Generate button is now correctly linked */}
      <button 
        className="button generate-button" 
        onClick={handleGenerateMCQs}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate MCQs"}
      </button>

      {/* Loading state */}
      {loading && <p>⚙️ Generating MCQs...</p>}

      {/* MCQs output and download buttons */}
      {mcqs && !loading && (
        <>
          <div className="output">
            {mcqs}
          </div>

          <div className="button-group">
            <button onClick={handleSaveTxt} className="button">💾 Download as Txt</button>
            <button onClick={handleSavePDF} className="button">📄 Download as PDF</button>
          </div>
        </>
      )}
    </div>
  );
}

export default McqGenerator;
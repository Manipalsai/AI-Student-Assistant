import React, { useState } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import {
  Document,
  Packer,
  Paragraph,
  TextRun
} from "docx";

function SummaryGenerator() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file chosen");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const uploadedFile = e.target.files[0];
    setFile(uploadedFile);
    setFileName(uploadedFile ? uploadedFile.name : "No file chosen");
  };

  const handleGenerateSummary = async () => {
    if (!file) {
      alert("Please upload a file first!");
      return;
    }

    setLoading(true);
    setSummary(""); // Clear previous summary
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("/api/summarize", formData);
      setSummary(response.data.summary);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary. Please check your backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const lineHeight = 10;
    let y = margin;

    doc.setFont("Times", "normal");
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(summary, 180);

    lines.forEach((line) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    doc.save("summary_output.pdf");
  };

  const handleDownloadDocx = () => {
    const doc = new Document({
      sections: [
        {
          children: summary.split("\n").map((line) =>
            new Paragraph({
              children: [new TextRun(line)],
            })
          ),
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, "summary_output.docx");
    });
  };

  return (
    <div className="card summary-card">
      <h2>Summary Generator</h2>
      
      {/* File input and button using our new styles */}
      <div className="file-input-container">
        <div className="file-input-wrapper">
          <input 
            type="file" 
            id="file-input-summary" 
            onChange={handleFileChange} 
          />
          <label htmlFor="file-input-summary" className="choose-file-button">
            Choose File
          </label>
        </div>
        <span className="file-name-display">{fileName}</span>
      </div>
      
      {/* Generate button is now correctly linked */}
      <button 
        className="button generate-button" 
        onClick={handleGenerateSummary}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Summary"}
      </button>

      {/* Loading state */}
      {loading && <p>⏳ Generating summary...</p>}

      {/* Summary output and download buttons */}
      {summary && !loading && (
        <>
          <div className="output">
            {summary}
          </div>

          <div className="button-group">
            <button onClick={handleDownloadPDF} className="button">📄 Download as PDF</button>
            <button onClick={handleDownloadDocx} className="button">📝 Download as DOCX</button>
          </div>
        </>
      )}
    </div>
  );
}

export default SummaryGenerator;
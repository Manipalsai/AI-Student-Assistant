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
const [summary, setSummary] = useState("");
const [loading, setLoading] = useState(false);

const handleFileChange = (e) => {
    setFile(e.target.files[0]);
};

const handleGenerateSummary = async () => {
    if (!file) {
    alert("Please upload a file first!");
    return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
    const response = await axios.post("http://localhost:8000/summarize", formData);
    setSummary(response.data.summary);
    } catch (error) {
    console.error("Error fetching summary:", error);
    alert("Failed to generate summary. Check the backend.");
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
    <h2> Summary Generator</h2>
    <input type="file" onChange={handleFileChange} />
    <button onClick={handleGenerateSummary}>Generate Summary</button>

    {loading && <p>⏳ Generating summary...</p>}

    {summary && !loading && (
        <>
        <div
            style={{
            maxHeight: "300px",
            overflowY: "auto",
            padding: "1em",
            marginTop: "1em",
            background: "#f8f8f8",
            fontFamily: "Arial, sans-serif",
            fontSize: "14px",
            lineHeight: "1.6",
            borderRadius: "8px",
            whiteSpace: "pre-wrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            color: "#000"
            }}
        >
            {summary}
        </div>

        <div style={{ marginTop: "10px" }}>
            <button onClick={handleDownloadPDF}>📄 Download as PDF</button>
            <button onClick={handleDownloadDocx}>📝 Download as DOCX</button>
        </div>
        </>
    )}
    </div>
);
}

export default SummaryGenerator;
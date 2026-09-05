import { useStudy } from '../context/StudyContext';
import { FileText, Layers, Check } from 'lucide-react';

const DocumentSelectorDropdown = ({ label = "Active Document Scope:" }) => {
    const { documents, selectedDocumentIds, toggleDocumentSelection, selectAllDocuments } = useStudy();

    if (!documents || documents.length === 0) {
        return (
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-3.5 py-1.5 rounded-xl font-medium">
                <FileText size={14} />
                <span>No documents uploaded. (Upload in Document Library)</span>
            </div>
        );
    }

    const isAllSelected = selectedDocumentIds.length === documents.length;

    const handleSelectChange = (e) => {
        const val = e.target.value;
        if (val === "ALL") {
            selectAllDocuments();
        } else {
            // Select only the chosen single document
            documents.forEach(d => {
                if (d.id === val && !selectedDocumentIds.includes(d.id)) {
                    toggleDocumentSelection(d.id);
                } else if (d.id !== val && selectedDocumentIds.includes(d.id)) {
                    toggleDocumentSelection(d.id);
                }
            });
        }
    };

    const currentValue = isAllSelected ? "ALL" : (selectedDocumentIds[0] || "ALL");

    return (
        <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3.5 py-1.5 rounded-xl text-xs">
            <Layers size={14} className="text-blue-400 shrink-0" />
            <span className="text-gray-400 font-semibold shrink-0">{label}</span>
            <select
                value={currentValue}
                onChange={handleSelectChange}
                className="bg-transparent text-blue-300 font-bold focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
                <option value="ALL" className="bg-gray-900 text-white font-bold">
                    🌐 All Documents ({documents.length})
                </option>
                {documents.map((doc) => (
                    <option key={doc.id} value={doc.id} className="bg-gray-900 text-gray-200">
                        📄 {doc.filename} ({doc.pages_count}p)
                    </option>
                ))}
            </select>
        </div>
    );
};

export default DocumentSelectorDropdown;

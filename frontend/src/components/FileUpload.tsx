import React, { useState } from "react";
import { Link } from "react-router-dom";
import type { AdvisoryData } from "../types/advisoryData";
import { API_BASE, withCreds } from "../api/config";
import { useAuth } from "../context/AuthContext";

type FileUploadProps = {
    onUploadSuccess: (data: AdvisoryData) => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
    const { refresh } = useAuth();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [status, setStatus] = useState<string>("");
    const [paywalled, setPaywalled] = useState(false);
    const [busy, setBusy] = useState(false);

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            setStatus("Please select at least one file.");
            return;
        }

        const formData = new FormData();
        // Files are numbered by upload order on the backend (S1, S2, …).
        selectedFiles.forEach((file) => formData.append("files", file));

        setBusy(true);
        setStatus("Uploading…");
        setPaywalled(false);

        try {
            const response = await fetch(`${API_BASE}/upload-session`, {
                method: "POST",
                body: formData,
                ...withCreds,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                if (response.status === 402) setPaywalled(true);
                setStatus(
                    (payload as { error?: string }).error ?? "Upload failed."
                );
                return;
            }

            const data: AdvisoryData = await response.json();
            onUploadSuccess(data);
            // A credit was just spent — refresh the user so the banner updates.
            await refresh();
            const skipped =
                (data as unknown as {
                    skipped?: { name: string; reason: string }[];
                }).skipped ?? [];
            if (skipped.length > 0) {
                const loaded = selectedFiles.length - skipped.length;
                setStatus(
                    `Loaded ${loaded} of ${selectedFiles.length} files. ` +
                        `Skipped ${skipped.length} unreadable: ${skipped
                            .map((s) => s.name)
                            .join(", ")}.`
                );
            } else {
                setStatus(
                    `Loaded ${selectedFiles.length} session${
                        selectedFiles.length === 1 ? "" : "s"
                    }.`
                );
            }
        } catch {
            setStatus("Could not reach the upload server.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="card">
            <h2>Upload Telemetry Files</h2>

            <input
                type="file"
                accept=".csv"
                multiple
                className="block w-full max-w-full text-sm"
                onChange={(event) => {
                    setSelectedFiles(Array.from(event.target.files ?? []));
                }}
            />

            {selectedFiles.length > 0 && (
                <ul className="upload-file-list">
                    {selectedFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`}>
                            S{index + 1}: {file.name}
                        </li>
                    ))}
                </ul>
            )}

            <button onClick={handleUpload} disabled={busy}>
                {busy ? "Uploading…" : "Upload"}
            </button>

            {status && (
                <p className={paywalled ? "advisory-negative" : undefined}>
                    {status}
                    {paywalled && (
                        <>
                            {" "}
                            <Link
                                to="/app/subscription"
                                style={{ color: "#a6e22e", fontWeight: 700 }}
                            >
                                View plans →
                            </Link>
                        </>
                    )}
                </p>
            )}
        </div>
    );
};

export default FileUpload;

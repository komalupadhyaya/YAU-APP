import React, { useRef, useState, useEffect } from "react";
import { FaCamera, FaFilePdf } from "react-icons/fa";
import {
  uploadChildImage,
  updateStudentDocUrl,
} from "../../../firebase/ApiClient";

function UploadExistingID({ childId, memberId, onSubmit }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);

    // Create preview URL
    const objectUrl = URL.createObjectURL(f);
    setPreviewUrl(objectUrl);

    console.log("Selected file:", f.name, f.type, f.size);
  };

  // Clean up preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const openPicker = () => inputRef.current?.click();

  const handleUpload = async () => {
    if (!file) {
      alert("Please choose a file first");
      return;
    }
    try {
      setBusy(true);
      console.log("Starting upload…");
      const url = await uploadChildImage(file, `child-existing-ids/${childId}`);
      if (!url) throw new Error("Upload returned no URL");

      console.log("Uploaded. URL:", url);
      // Firestore update with file type (jpg/png/pdf)
      const extension =
        file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];

      // Firestore update
      await updateStudentDocUrl(memberId, childId, url, extension);
      console.log("Firestore updated for child:", childId);

      // Let parent update UI if desired
      onSubmit?.(url);
      alert("Submitted for approval ✅");
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed, please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-2xl shadow-md border border-gray-200">
      <h2 className="text-lg font-semibold text-green-700 mb-3">
        Upload Existing ID
      </h2>

      <p className="text-sm py-4 pt-0">
        Upload a photo of your child's valid government-issued ID (MVA, Passport, or Military ID).
        This will be used to verify eligibility for games.
      </p>

      <div className="flex items-center space-x-4 mb-4">
        <button
          className="flex items-center bg-green-600 text-white py-2 px-4 rounded-lg"
          onClick={() => alert("Photo capture feature coming soon!")}
          disabled={busy}
        >
          <FaCamera className="mr-2" /> Take Photo
        </button>

        <button
          className="flex items-center bg-green-100 text-green-700 py-2 px-4 rounded-lg border border-green-400"
          onClick={openPicker}
          disabled={busy}
        >
          Upload from Gallery
        </button>
      </div>

      {/* Hidden File Input controlled by ref (no id collisions) */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Preview Section */}
      {previewUrl && (
        <div className="mt-4 mb-4">
          <h3 className="text-md font-medium text-gray-700 mb-2">Preview</h3>
          <div className="border border-gray-300 rounded-lg p-2 flex justify-center">
            {file.type === "application/pdf" ? (
              <div className="p-4 bg-gray-100 rounded-lg flex items-center">
                <FaFilePdf className="text-red-500 text-3xl mr-2" />
                <span className="text-gray-700">{file.name}</span>
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="ID preview"
                className="max-h-64 max-w-full object-contain rounded-md"
                onLoad={() => URL.revokeObjectURL(previewUrl)}
              />
            )}
          </div>
        </div>
      )}

      <ul className="text-sm text-gray-700 pl-5 mb-4 list-disc">
        <li>Make sure ID is clear and readable.</li>
        <li>Only one ID is required per child.</li>
        <li>Accepted formats: JPG, PNG, PDF.</li>
      </ul>

      <button
        onClick={handleUpload}
        className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "Uploading…" : "Upload & Continue"}
      </button>
    </div>
  );
}

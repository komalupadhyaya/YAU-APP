import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUserData, updateMember } from "../../firebase/apis/api-members.js";
import { uploadChildImage } from '../mychild/utils/uploadImage.js';
import childImagePlaceholder from '../../assets/child.jpg';
import { FaCamera, FaFilePdf, FaPlus, FaTimes } from 'react-icons/fa';
import Logo from '../../assets/YAU_Logo.png';
import { collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config.js";
// import AddChildModal from "../mychild/components/AddChild.jsx";
import { deleteStudentDoc } from "../mychild/utils/deleteChild.js";
import PurchaseLeagueID from "../mychild/components/PurchageLeagueId.jsx";
import Button from "@mui/material/Button";
import { downloadGeneratedID } from '../../utils/IdGenerator.js';
import { Plus, RefreshCw } from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

function ChildrenTable({ memberId, childrenList, onViewChild, onAddChild, onDeleteChild }) {
  return (
    <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead className="bg-white-700 border-b border-gray-200 text-black">
          <tr>
            <th className="p-3">Photo</th>
            <th className="p-3">Name</th>
            <th className="p-3">DOB</th>
            <th className="p-3">Status</th>
            <th className="p-3">Action</th>
            <th className="p-3">Delete</th>
          </tr>
        </thead>
        <tbody>
          {childrenList.map((child) => (
            <tr
              key={child.id}
              className="border-b hover:bg-gray-50 transition"
            >
              <td className="p-3">
                <img
                  src={child.photoUrl || childImagePlaceholder}
                  alt="child"
                  className="w-12 h-12 rounded-full object-cover"
                />
              </td>
              <td className="p-3">{child.name}</td>
              <td className="p-3">{child.dob}</td>
              <td className="p-3">
                {child.status === "active" && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    Active
                  </span>
                )}
                {child.status === "pending" && (
                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs">
                    Pending
                  </span>
                )}
                {child.status === "rejected" && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                    Rejected
                  </span>
                )}
                {child.status === "unverified" && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">
                    Unverified
                  </span>
                )}
              </td>
              <td className="p-3">
                <button
                  onClick={() => onViewChild(child.id)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm"
                >
                  View / Manage
                </button>
              </td>
              <td className="p-3">
                <button
                  onClick={() => onDeleteChild(child.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="hidden m-3 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Add a New Child</h3>
          <p className="text-gray-600 mb-6">Add a new child to manage their ID and uniform orders.</p>
          <button
            onClick={onAddChild}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            Add Child
          </button>
        </div>
      </div>
    </div>
  );
}

async function updateStudentDocUrl(memberId, childUid, url, fileType) {
  const parentRef = doc(db, "members", memberId);
  const parentSnap = await getDoc(parentRef);

  if (!parentSnap.exists()) throw new Error("Parent not found");

  const parentData = parentSnap.data();

  const updatedStudents = parentData.students.map((student) =>
    student.uid === childUid
      ? {
          ...student,
          governmentIdUrl: url,
          governmentIdUrl_filetype: fileType,
          idStatus: "pending",
          updatedAt: new Date()
        }
      : student
  );

  await updateDoc(parentRef, { students: updatedStudents });
}

function UploadExistingID({ childId, memberId, onSubmit }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreviewUrl(objectUrl);
    console.log("Selected file:", f.name, f.type, f.size);
  };

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
      const url = await uploadChildImage(file, `child-existing-ids/${childId}`);
      if (!url) throw new Error("Upload returned no URL");

      const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
      await updateStudentDocUrl(memberId, childId, url, extension);

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
      <h2 className="text-lg font-semibold text-blue-700 mb-3">Upload Existing ID</h2>
      <p className="text-sm py-4 pt-0">
        Upload a photo of your child's valid government-issued ID (MVA, Passport, or Military ID).
        This will be used to verify eligibility for games.
      </p>

      <div className="flex items-center space-x-4 mb-4">
        <button
          className="flex items-center bg-blue-600 text-white py-2 px-4 rounded-lg"
          onClick={() => alert("Take Photo functionality will be implemented later")}
          disabled={busy}
        >
          <FaCamera className="mr-2" /> Take Photo
        </button>

        <button
          className="flex items-center bg-blue-100 text-blue-700 py-2 px-4 rounded-lg border border-blue-400"
          onClick={openPicker}
          disabled={busy}
        >
          Upload from Gallery
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl && (
        <div className="mt-4 mb-4">
          <h3 className="text-md font-medium text-gray-700 mb-2">Preview</h3>
          <div className="border border-gray-300 rounded-lg p-2 flex justify-center">
            {file.type === 'application/pdf' ? (
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
        className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-60"
        disabled={busy}
      >
        {busy ? "Uploading…" : "Upload & Continue"}
      </button>
    </div>
  );
}

function IDCard({ status, child }) {
  if (status === "pending") {
    return (
      <div className="p-6 text-center border rounded-2xl shadow-md text-gray-400 bg-gray-50">
        <p className="text-lg font-bold">Child ID (Pending)</p>
        <p className="text-sm">Awaiting Admin Approval</p>
      </div>
    );
  }

  if (status === "active") {
    return (
      <div className="p-6 text-center border rounded-2xl shadow-md bg-blue-50 text-blue-700">
        <p className="text-lg font-bold">Child ID (Active)</p>
        <p className="text-sm mb-2">Valid until: {child.expirationDate || 'N/A'}</p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          onClick={() => {
            if (child.generatedIdUrl) {
              downloadGeneratedID(child.generatedIdUrl, `ID_${child.name.replace(' ', '_')}.png`);
            } else {
              alert('No generated ID available. Contact admin.');
            }
          }}
        >
          Download ID Card
        </button>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="p-6 text-center border rounded-2xl shadow-md bg-red-50 text-red-600">
        <p className="text-lg font-bold">Child ID (Rejected)</p>
        <p className="text-sm">Reason: {child?.idRejectionReason || "Not provided reason"}</p>
        <button className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg">
          Re-Upload
        </button>
      </div>
    );
  }

  return null;
}

function ChildDetail({ child, memberId, onBack, onUploaded }) {
  const [showReuploadForm, setShowReuploadForm] = useState(false);
  const [reuploadType, setReuploadType] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({
    governmentId: null,
    birthCertificate: null,
    headshot: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const hasPurchasedLeagueId = child.leagueIdPurchased;
  const hasExistingId = child.governmentIdUrl;
  const hasHeadshot = child.headshotUrl;
  const hasBirthCertificate = child.birthCertificateUrl;

  const handleFileSelect = (type, file) => {
    setUploadedFiles((prev) => ({
      ...prev,
      [type]: file,
    }));
  };

  const handleSubmitReUploads = async () => {
    setIsSubmitting(true);
    try {
      if (uploadedFiles.governmentId) {
        const govUrl = await uploadChildImage(
          uploadedFiles.governmentId,
          `child-existing-ids/${child.id}`
        );
        const govExtension =
          uploadedFiles.governmentId.type === "application/pdf"
            ? "pdf"
            : uploadedFiles.governmentId.type.split("/")[1];
        await updateStudentDocUrl(memberId, child.id, govUrl, govExtension);
      }

      if (uploadedFiles.birthCertificate) {
        const birthCertUrl = await uploadChildImage(
          uploadedFiles.birthCertificate,
          `child-birth-certificates/${child.id}`
        );
        await updateStudentDocField(
          memberId,
          child.id,
          "birthCertificateUrl",
          birthCertUrl,
          uploadedFiles.birthCertificate.type === "application/pdf" ? "pdf" : "image"
        );
      }

      if (uploadedFiles.headshot) {
        const headshotUrl = await uploadChildImage(
          uploadedFiles.headshot,
          `child-headshots/${child.id}`
        );
        await updateStudentDocField(memberId, child.id, "headshotUrl", headshotUrl, "image");
      }

      await updateStudentStatus(memberId, child.id, "pending");

      alert("Documents re-uploaded successfully! Status changed to pending review.");
      onUploaded();
      setShowReuploadForm(false);
      setUploadedFiles({
        governmentId: null,
        birthCertificate: null,
        headshot: null,
      });
    } catch (error) {
      console.error("Error re-uploading documents:", error);
      alert("Failed to re-upload documents. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (child.generatedPdfUrl) {
        await downloadGeneratedID(child.generatedPdfUrl, `ID_${child.name.replace(' ', '_')}.pdf`);
      } else if (child.generatedIdUrl) {
        await downloadGeneratedID(child.generatedIdUrl, `ID_${child.name.replace(' ', '_')}.png`);
      } else {
        alert('No generated ID available. Contact admin.');
      }
    } catch (error) {
      // Error is handled in downloadGeneratedID
    } finally {
      setIsDownloading(false);
    }
  };

  const renderIDCard = () => {
    if (child.status === "pending") {
      return (
        <div className="p-6 text-center border rounded-2xl shadow-md text-gray-400 bg-gray-50">
          <p className="text-lg font-bold">Child ID (Pending)</p>
          <p className="text-sm">Awaiting Admin Approval</p>
        </div>
      );
    }

    if (child.status === "active") {
      return (
        <div
          className="bg-white shadow-lg overflow-hidden"
          style={{
            width: "300px",
            margin: "0 auto",
            fontFamily: "Arial, sans-serif"
          }}
        >
          <div className="bg-white text-white text-center py-1 px-4">
            <div className="flex justify-center">
              <img
                src={Logo}
                alt="profile"
                className="w-[175px]"
              />
            </div>
          </div>

          <div className="bg-gray-100">
            <div
              className="bg-blue-900 text-white text-center py-1 italic"
              style={{ fontSize: "14px" }}
            >
              Youth Athlete University
            </div>

            <div className="bg-red-600 h-1 mb-3"></div>

            <div className="flex items-center gap-3 p-1">
              <div className="p-2 overflow-hidden" style={{ width: "160px", height: "200px" }}>
                <img
                  src={child.headshotUrl || childImagePlaceholder}
                  alt="Student Photo"
                  className="w-full h-full rounded-md object-cover"
                />
              </div>

              <div className="flex-1">
                <h3 className="text-blue-900 font-bold text-lg leading-tight mb-1">
                  {child.name}
                </h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>DOB:</strong> {child.dob}</p>
                  <p><strong>Location:</strong> {child.location}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2 text-blue-900 font-bold text-sm">
              Exp: {child.expirationDate}
            </div>
          </div>

          <div className="p-3 text-center bg-white">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download ID Card (PDF)'}
            </button>
          </div>
        </div>
      );
    }

    if (child.status === "rejected") {
      return (
        <div className="p-6 text-center border rounded-2xl shadow-md bg-red-50 text-red-600">
          <p className="text-lg font-bold">Child ID (Rejected)</p>
          <p className="text-sm">Reason: {child?.idRejectionReason || "Not provided reason"}</p>
          <button
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg"
            onClick={() => setShowReuploadForm(true)}
          >
            Re-Upload
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      className="p-4 bg-gray-50 rounded-xl shadow-md"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button onClick={onBack} className="mb-4 text-blue-700 hover:underline">
        ← Back to My Children
      </button>

      <h2 className="text-xl font-bold text-blue-700 mb-4">Manage {child.name}’s ID</h2>

      {child.status === "rejected" && child.idRejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold mb-2">Rejection Reason:</h3>
          <p className="text-red-700">{child.idRejectionReason}</p>
        </div>
      )}

      {(child.status === "pending" || child.status === "active" || child.status === "rejected") &&
        (hasExistingId || hasPurchasedLeagueId) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Uploaded Documents</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasExistingId && (
                <DocumentPreview
                  title="Government ID"
                  fileUrl={child.governmentIdUrl}
                  fileType={child.governmentIdUrl_filetype}
                  onReupload={() => setReuploadType("governmentId")}
                  showReupload={child.status === "rejected"}
                />
              )}

              {hasPurchasedLeagueId && (
                <>
                  {hasBirthCertificate && (
                    <DocumentPreview
                      title="Birth Certificate"
                      fileUrl={child.birthCertificateUrl}
                      fileType={child.birthCertificateUrl_filetype}
                      onReupload={() => setReuploadType("birthCertificate")}
                      showReupload={child.status === "rejected"}
                    />
                  )}

                  {hasHeadshot && (
                    <DocumentPreview
                      title="Headshot Photo"
                      fileUrl={child.headshotUrl}
                      fileType={child.headshotUrl_filetype}
                      onReupload={() => setReuploadType("headshot")}
                      showReupload={child.status === "rejected"}
                    />
                  )}
                </>
              )}
            </div>

            {hasPurchasedLeagueId && child.leagueIdPayment && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Amount:</span>
                    <span className="ml-2 text-gray-700">
                      ${(child.leagueIdPayment.amount / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-2 text-gray-700 capitalize">
                      {child.leagueIdPayment.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Note:</span>
                    <span className="ml-2 text-gray-700">
                      You don't need to pay again for league ID verification.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {child.status === "rejected" && showReuploadForm && (
              <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Re-upload Documents</h4>
                <p className="text-gray-600 mb-4">
                  Please re-upload the documents that need correction based on the rejection reason.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {hasExistingId && (
                    <FileUploadButton
                      label="Government ID"
                      onFileSelect={(file) => handleFileSelect("governmentId", file)}
                      acceptedFile={uploadedFiles.governmentId}
                    />
                  )}

                  {hasPurchasedLeagueId && hasBirthCertificate && (
                    <FileUploadButton
                      label="Birth Certificate"
                      onFileSelect={(file) => handleFileSelect("birthCertificate", file)}
                      acceptedFile={uploadedFiles.birthCertificate}
                    />
                  )}

                  {hasPurchasedLeagueId && hasHeadshot && (
                    <FileUploadButton
                      label="Headshot Photo"
                      onFileSelect={(file) => handleFileSelect("headshot", file)}
                      acceptedFile={uploadedFiles.headshot}
                      accept="image/*"
                    />
                  )}
                </div>

                {(uploadedFiles.governmentId || uploadedFiles.birthCertificate || uploadedFiles.headshot) && (
                  <button
                    onClick={handleSubmitReUploads}
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Re-uploaded Documents"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      {child.status === "unverified" && (
        <div className="grid md:grid-cols-2 gap-6">
          <UploadExistingID childId={child.id} memberId={memberId} onSubmit={onUploaded} />
          <PurchaseLeagueID child={child} memberId={memberId} onSubmit={onUploaded} />
        </div>
      )}

      {(child.status === "pending" || child.status === "active" || child.status === "rejected") && (
        <div className="mt-6">{renderIDCard()}</div>
      )}
    </motion.div>
  );
}

function DocumentPreview({ title, fileUrl, fileType, onReupload, showReupload }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
      {fileType === 'pdf' ? (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <FaFilePdf className="text-red-500 text-2xl" />
          <span className="text-gray-700">PDF Document</span>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-blue-600 hover:text-blue-800 text-sm"
          >
            View Document
          </a>
        </div>
      ) : (
        <div className="text-center">
          <img
            src={fileUrl}
            alt={title}
            className="max-h-48 max-w-full mx-auto rounded-lg border border-gray-200"
          />
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm"
          >
            Open in new tab
          </a>
        </div>
      )}

      {showReupload && (
        <button
          onClick={onReupload}
          className="mt-3 w-full bg-yellow-600 text-white py-2 rounded-lg text-sm"
        >
          Re-upload {title}
        </button>
      )}
    </div>
  );
}

function FileUploadButton({ label, onFileSelect, acceptedFile, accept = "image/*,.pdf" }) {
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="text-center">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full bg-blue-100 text-blue-700 py-3 rounded-lg border border-blue-300 hover:bg-blue-200 transition"
      >
        {acceptedFile ? (
          <span className="text-blue-600">✓ {acceptedFile.name}</span>
        ) : (
          `Upload ${label}`
        )}
      </button>
    </div>
  );
}

async function updateStudentDocField(memberId, childUid, fieldName, url, fileType = null) {
  const parentRef = doc(db, "members", memberId);
  const parentSnap = await getDoc(parentRef);

  if (!parentSnap.exists()) throw new Error("Parent not found");

  const parentData = parentSnap.data();
  const updatedStudents = parentData.students.map((student) =>
    student.uid === childUid
      ? {
          ...student,
          [fieldName]: url,
          ...(fileType && { [`${fieldName}_filetype`]: fileType }),
          updatedAt: new Date()
        }
      : student
  );

  await updateDoc(parentRef, { students: updatedStudents });
}

async function updateStudentStatus(memberId, childUid, status) {
  const parentRef = doc(db, "members", memberId);
  const parentSnap = await getDoc(parentRef);

  if (!parentSnap.exists()) throw new Error("Parent not found");

  const parentData = parentSnap.data();
  const updatedStudents = parentData.students.map((student) =>
    student.uid === childUid
      ? {
          ...student,
          idStatus: status,
          updatedAt: new Date()
        }
      : student
  );

  await updateDoc(parentRef, { students: updatedStudents });
}

function AddChildModal({ isOpen, onClose, onAddChild, memberId }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_AGE = 3;
  const MAX_AGE = 14;

  const calculateAgeGroup = (dob) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const cutoffDate = new Date(new Date().getFullYear(), 6, 31);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();

    if (today < cutoffDate && 
        (birthDate.getMonth() > 6 || 
         (birthDate.getMonth() === 6 && birthDate.getDate() > 31))) {
      age--;
    }

    if (age < MIN_AGE || age > MAX_AGE) return "N/A";
    return `${age}U`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of birth is required";
    } else {
      const ageGroup = calculateAgeGroup(formData.dob);
      if (ageGroup === "N/A") {
        newErrors.dob = `Child must be between ${MIN_AGE}-${MAX_AGE} years old`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const parentRef = doc(db, "members", memberId);
      const parentSnap = await getDoc(parentRef);
      
      if (!parentSnap.exists()) {
        throw new Error("Member not found");
      }

      const parentData = parentSnap.data();
      
      const newChild = {
        uid: doc(collection(db, "students")).id,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dob: dayjs(formData.dob).format("MM-DD-YYYY"),
        ageGroup: calculateAgeGroup(formData.dob),
        idStatus: "unverified",
        createdAt: new Date(),
        uniformTop: "",
        uniformBottom: ""
      };

      const updatedStudents = [...(parentData.students || []), newChild];
      
      await updateDoc(parentRef, { students: updatedStudents });
      
      onAddChild(newChild);
      onClose();
      
      setFormData({ firstName: "", lastName: "", dob: "" });
      setErrors({});
      
    } catch (error) {
      console.error("Error adding child:", error);
      alert("Failed to add child. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-green-700">Add New Child</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                errors.firstName ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              placeholder="Enter first name"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={`w-full p-3 border rounded-lg ${
                errors.lastName ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-green-500 focus:border-transparent`}
              placeholder="Enter last name"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <DatePicker
              value={formData.dob ? dayjs(formData.dob) : null}
              onChange={(date) => handleChange("dob", date ? date.toISOString() : "")}
              minDate={dayjs("2011-01-01")}
              maxDate={dayjs()}
              disableFuture
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.dob,
                  helperText: errors.dob || `Children must be ${MIN_AGE}-${MAX_AGE} years old`,
                },
              }}
            />
          </div>

          {formData.dob && calculateAgeGroup(formData.dob) !== "N/A" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-sm">
                ✓ Eligible for: {calculateAgeGroup(formData.dob)} Age Group
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Adding..." : "Add Child"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function ChildID() {
  const { user } = useAuth();
  const [view, setView] = useState("table");
  const [selectedChild, setSelectedChild] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [childrenList, setChildrenList] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchChildren = async () => {
    if (!user?.email) return;

    try {
      const parentData = await getCurrentUserData(user.email);
      if (parentData) {
        setMemberId(parentData.id);

        if (parentData.students) {
          const formattedChildren = parentData.students.map((student) => ({
            id: student.uid,
            name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            firstName: student.firstName || "",
            lastName: student.lastName || "",
            dob: student.dob || "",
            status: student.idStatus || "unverified",
            photoUrl: student.photoUrl || null,
            ageGroup: student.ageGroup || "",
            uniformTop: student.uniformTop || "",
            uniformBottom: student.uniformBottom || "",
            location: parentData.location || "Not specified",
            governmentIdUrl: student.governmentIdUrl || null,
            governmentIdUrl_filetype: student.governmentIdUrl_filetype || null,
            headshotUrl: student.headshotUrl || null,
            headshotUrl_filetype: student.headshotUrl_filetype || null,
            birthCertificateUrl: student.birthCertificateUrl || null,
            birthCertificateUrl_filetype: student.birthCertificateUrl_filetype || null,
            idRejectionReason: student.idRejectionReason || "",
            leagueIdPurchased: student.leagueIdPurchased || false,
            leagueIdPayment: student.leagueIdPayment || null,
            expirationDate: student.expirationDate || "Apr 23, 2025",
            generatedIdUrl: student.generatedIdUrl || null,
          }));

          setChildrenList(formattedChildren);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching parent/children:", error);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, [user?.email]);

  const handleViewChild = (id) => {
    const child = childrenList.find((c) => c.id === id);
    setSelectedChild(child);
    setView("detail");
  };

  const handleAddChild = () => {
    setShowAddModal(true);
  };

  const handleChildAdded = (newChild) => {
    fetchChildren();
    setSelectedChild({
      id: newChild.uid,
      name: `${newChild.firstName} ${newChild.lastName}`,
      dob: newChild.dob,
      status: newChild.idStatus,
      photoUrl: null
    });
    setView("detail");
  };

  const handleDeleteChild = async (childId) => {
    if (!memberId) return;
    const confirmDelete = window.confirm("Are you sure you want to delete this child?");
    if (!confirmDelete) return;

    try {
      await deleteStudentDoc(memberId, childId);
      await fetchChildren();
      alert("Child deleted ✅");
    } catch (error) {
      console.error("❌ Error deleting child:", error);
      alert("Failed to delete child. Try again.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-700">My Child's ID</h1>
        <Button
          className="bg-white text-blue-600 border border-gray-200 hover:bg-blue-50 hover:border-blue-300 font-medium px-4 py-2 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          variant="outlined"
          onClick={() => fetchChildren()}
          startIcon={<RefreshCw className="w-4 h-4" />}
        >
          Refresh
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {view === "table" && (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ChildrenTable
              memberId={memberId}
              childrenList={childrenList}
              onViewChild={handleViewChild}
              onAddChild={handleAddChild}
              onDeleteChild={handleDeleteChild}
            />
          </motion.div>
        )}
        {view === "detail" && selectedChild && (
          <ChildDetail
            key="detail"
            memberId={memberId}
            child={selectedChild}
            onBack={() => setView("table")}
            onUploaded={async () => {
              await fetchChildren();
              setView("table");
            }}
          />
        )}
      </AnimatePresence>

      <AddChildModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddChild={handleChildAdded}
        memberId={memberId}
      />
    </div>
  );
}
import React, { useState } from "react";
import { auth } from "../../firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reauthenticate user with current password
  const reauthenticate = (currentPass) => {
    const user = auth.currentUser;
    if (!user || !user.email)
      throw new Error("No authenticated user found. Please log in again.");

    const credential = EmailAuthProvider.credential(user.email, currentPass);
    return reauthenticateWithCredential(user, credential);
  };

  const handleChangePassword = async () => {
    setMessage("");
    setError("");
    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    try {
      await reauthenticate(currentPassword);
      await updatePassword(auth.currentUser, newPassword);
      setMessage("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setError(
        err.message ||
          "Failed to update password. Please check your current password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setError("");
    setMessage("");
    if (!auth.currentUser?.email) {
      setError("No authenticated user email available.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, auth.currentUser.email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
        <Lock size={20} /> Change Password
      </h2>

      <div>
        <label className="block font-semibold mb-1 text-gray-700">
          Current Password
        </label>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Enter your current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Toggle current password visibility"
          >
            {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1 text-gray-700">
          New Password
        </label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Toggle new password visibility"
          >
            {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block font-semibold mb-1 text-gray-700">
          Confirm New Password
        </label>
        <input
          type="password"
          placeholder="Confirm your new password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-200">
        <p className="font-semibold">Password Requirements:</p>
        <ul className="list-disc list-inside mt-1">
          <li>At least 8 characters long</li>
          <li>
            Include uppercase, lowercase, numbers, or symbols (recommended)
          </li>
        </ul>
      </div>

      {error && (
        <div className="text-red-600 font-semibold p-3 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}
      {message && (
        <div className="text-green-600 font-semibold p-3 bg-green-50 border border-green-200 rounded-lg">
          {message}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <button
          onClick={handleChangePassword}
          disabled={loading}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        <button
          onClick={handleSendResetEmail}
          disabled={loading}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          Forgot password? Send reset email
        </button>
      </div>
    </div>
  );
}

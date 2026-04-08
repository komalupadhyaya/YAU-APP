import React, { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { getCurrentCoachData } from "../../firebase/coachAuth";
import ChangePassword from "./ChangePassword";
import { User, Shield, Loader, AlertTriangle } from "lucide-react";

function Profile() {
  const [coach, setCoach] = useState(null);
  const [activeTab, setActiveTab] = useState("personal"); // 'personal' or 'security'

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    async function fetchCoach() {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user");

        const coachData = await getCurrentCoachData(user.uid);
        if (!coachData) throw new Error("Coach data not found");

        setCoach(coachData);
        setFormData({
          firstName: coachData.firstName || "",
          lastName: coachData.lastName || "",
          email: coachData.email || "",
          phone: coachData.phone || "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCoach();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      if (!coach?.id) throw new Error("Invalid coach ID");

      const coachRef = doc(db, "users", coach.id);
      await updateDoc(coachRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        // Email usually shouldn’t be changed here unless you have special flows
      });

      setCoach((prev) => ({ ...prev, ...formData }));
      alert("Profile updated successfully");
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader className="animate-spin text-blue-600" size={32} />
        <span className="ml-4 text-gray-600">Loading coach profile...</span>
      </div>
    );
  }

  if (error && !coach) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
        <AlertTriangle className="mr-3" size={24} />
        <div>
          <h2 className="font-bold">Error Loading Profile</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Profile & Settings
      </h1>

      <div className="bg-white rounded-xl shadow-lg">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "personal"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <User size={16} className="mr-2" />
              Personal Information
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "security"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Shield size={16} className="mr-2" />
              Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="mb-4">
                <label className="block mb-1 font-semibold text-gray-700">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold text-gray-700">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold text-gray-700">
                  Email (read-only)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  readOnly
                  className="w-full border border-gray-300 p-2 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "security" && <ChangePassword />}
        </div>
      </div>
    </div>
  );
}

export default Profile;

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase/config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { User, Image, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const ParentIDCreation = () => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState({ headshot: null, birthCert: null });
  const [step, setStep] = useState(1); // 1: Select child, 2: Upload, 3: Complete

  const handleFileChange = (type, file) => {
    setFiles(prev => ({ ...prev, [type]: file }));
  };

  const validateFiles = () => {
    if (!files.headshot) return 'Headshot required';
    if (!files.birthCert) return 'Birth certificate required';
    return null;
  };

  const submitID = async () => {
    const error = validateFiles();
    if (error) {
      alert(error);
      return;
    }

    setLoading(true);
    try {
      // Upload headshot
      const headshotRef = ref(db.storage, `parents/${user.id}/ids/${selectedChild.uid}/headshot.jpg`);
      await uploadBytes(headshotRef, files.headshot);
      const headshotUrl = await getDownloadURL(headshotRef);

      // Upload birth cert
      const birthRef = ref(db.storage, `parents/${user.id}/ids/${selectedChild.uid}/birth-cert.pdf`);
      await uploadBytes(birthRef, files.birthCert);
      const birthUrl = await getDownloadURL(birthRef);

      // Update child record
      const parentRef = doc(db, 'members', user.id);
      await updateDoc(parentRef, {
        [`students.${selectedChild.uid}.headshotUrl`]: headshotUrl,
        [`students.${selectedChild.uid}.birthCertificateUrl`]: birthUrl,
        [`students.${selectedChild.uid}.idStatus`]: 'submitted',
        [`students.${selectedChild.uid}.submittedAt`]: new Date(),
        [`students.${selectedChild.uid}.idPayment`]: {
          amount: 1000, // $10
          status: 'paid', 
          timestamp: new Date()
        }
      });

      alert('✅ ID submitted! Admin review in 24-48h');
      setShowModal(false);
      setFiles({ headshot: null, birthCert: null });
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.students?.length) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-lg">
        <AlertCircle size={64} className="mx-auto text-yellow-400 mb-4" />
        <h3 className="text-xl font-bold mb-2">No Children</h3>
        <p>Contact admin to add children</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Digital ID ($10/child)
          </h2>
          <p className="text-gray-600 mt-1">Birth cert + headshot → Admin approval → Download</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600">
          + Create ID
        </Button>
      </div>

      {/* Child Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {user.students.map((child) => (
          <div key={child.uid} className="group p-6 bg-white/70 backdrop-blur-sm rounded-2xl border hover:border-blue-300 hover:shadow-xl transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {child.firstName[0]}{child.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{child.firstName} {child.lastName}</h4>
                <p className="text-sm text-gray-500">{child.ageGroup}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                child.idStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                child.idStatus === 'submitted' ? 'bg-amber-100 text-amber-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {child.idStatus === 'approved' ? '✅ Approved' : 
                 child.idStatus === 'submitted' ? '⏳ Pending' : '➕ Create'}
              </span>
              {child.idStatus !== 'approved' && (
                <Button size="sm" onClick={() => {
                  setSelectedChild(child);
                  setShowModal(true);
                }} variant="outline" className="!px-4 !py-1.5 text-xs font-medium">
                  Create ID
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Digital ID" size="lg">
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border-2 border-dashed border-emerald-200">
            <h3 className="text-xl font-bold mb-3 text-gray-800">{selectedChild?.firstName}'s ID</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>DOB:</strong> {selectedChild?.dob}</div>
              <div><strong>Age Group:</strong> {selectedChild?.ageGroup}</div>
              <div><strong>Fee:</strong> <span className="font-mono text-lg">$10</span></div>
              <div><strong>Status:</strong> <span className="font-semibold text-emerald-700">Ready to Submit</span></div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block font-medium mb-2 flex items-center gap-2">
                <Image size={18} />
                Headshot Photo
              </label>
              <input type="file" accept="image/jpeg,image/png" onChange={(e) => handleFileChange('headshot', e.target.files[0])}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {files.headshot && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                  ✅ {files.headshot.name}
                </div>
              )}
            </div>
            <div>
              <label className="block font-medium mb-2 flex items-center gap-2">
                <FileText size={18} />
                Birth Certificate (PDF/JPG)
              </label>
              <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange('birthCert', e.target.files[0])}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {files.birthCert && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
                  ✅ {files.birthCert.name}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={submitID} disabled={loading || !files.headshot || !files.birthCert} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
              {loading ? 'Submitting...' : 'Pay $10 & Submit ID'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ParentIDCreation;


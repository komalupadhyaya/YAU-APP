import React, { useState, useEffect } from "react";
import Header from "../layout/Header";
import Button from "../common/Button";
import Modal from "../common/Modal";
import Table, { TableRow, TableCell } from "../common/Table";
import {
  getMessages,
  getLocations,
  addMessage,
  updateMessage,
  deleteMessage,
  getCoaches,
} from "../../firebase/firestore";
import { getParents } from "../../firebase/apis/api-parents";
import { useAuth } from "../../context/AuthContext";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../../firebase/config";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  MessageSquare,
  Users,
  Send,
  Eye,
  EyeOff,
  Image as ImageIcon,
  MapPin,
  Trophy,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { LinearProgress, Snackbar, Alert } from "@mui/material";
import { Autocomplete } from "../common/AutoComplete";
import { deleteDoc, doc } from "firebase/firestore";

const Messages = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [groups, setGroups] = useState([]);
  const [locations, setLocations] = useState([]);
  const [totalRecipients, setTotalRecipients] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [newMessage, setNewMessage] = useState({
    title: "",
    description: "",
    imageUrl: "",
    targetAgeGroup: "all",
    targetLocation: "all",
    targetSport: "all",
    priority: "normal",
  });

  const priorityOptions = ["low", "normal", "high", "urgent"];
  const statusOptions = ["all", "read", "unread"];
  const itemsPerPageOptions = [5, 10, 25, 50];

  const getSportIcon = (sport) => {
    const icons = {
      Soccer: "⚽",
      Basketball: "🏀",
      Baseball: "⚾",
      "Track & Field": "🏃‍♂️",
      "Flag Football": "🏈",
      "Tackle Football": "🏈",
      Kickball: "🥎",
      Golf: "🏌️",
      Cheer: "📣",
    };
    return icons[sport] || "🏆";
  };

  useEffect(() => {
    loadMessages();
    loadGroupData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const [messagesData, locationsData, parentsData, coachesData] =
        await Promise.all([
          getMessages(),
          getLocations(),
          getParents(),
          getCoaches(),
        ]);
      setTotalRecipients(parentsData.length + coachesData.length);
      const processedLocations = locationsData.map((location) => {
        if (typeof location === "string") {
          return location;
        }
        if (location.name) return location.name;
        if (location.city && location.state)
          return `${location.city}, ${location.state}`;
        if (location.address) return location.address;
        return "Unknown Location";
      });

      setLocations(processedLocations);
      setMessages(messagesData);
      setSelectedMessages([]);
    } catch (error) {
      console.error("Error loading messages:", error);
      setSnackbar({
        open: true,
        message: "Failed to load messages.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupData = async () => {
    try {
      const [parentsData] = await Promise.all([getParents(), getCoaches()]);

      const ageGroups = new Set();
      const locations = new Set();
      const sports = new Set();

      parentsData.forEach((parent) => {
        if (parent.location) locations.add(parent.location);
        if (parent.sport) sports.add(parent.sport);
        if (parent.children) {
          parent.children.forEach((child) => {
            if (child.ageGroup) ageGroups.add(child.ageGroup);
          });
        }
      });

      setGroups({
        ageGroups: Array.from(ageGroups).sort(),
        locations: Array.from(locations).sort(),
        sports: Array.from(sports).sort(),
      });
    } catch (error) {
      console.error("Error loading group data:", error);
    }
  };

  const ageGroups = [
    "3U",
    "4U",
    "5U",
    "6U",
    "7U",
    "8U",
    "9U",
    "10U",
    "11U",
    "12U",
    "13U",
    "14U",
  ];

  const handleSelectMessage = (messageId) => {
    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSelectAll = () => {
    if (selectedMessages.length === currentItems.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(currentItems.map((message) => message.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMessages.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one message to delete.",
        severity: "warning",
      });
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedMessages.length} selected message(s)?`
      )
    ) {
      try {
        setLoading(true);
        const deletePromises = selectedMessages.map(async (messageId) => {
          const messageToDelete = messages.find((m) => m.id === messageId);
          if (messageToDelete?.imageUrl) {
            await deleteImageFromFirebase(messageToDelete.imageUrl);
          }
          await deleteDoc(doc(db, "admin_posts", messageId));
        });

        await Promise.all(deletePromises);
        setSnackbar({
          open: true,
          message: `Successfully deleted ${selectedMessages.length} message(s).`,
          severity: "success",
        });
        setSelectedMessages([]);
        const newTotalItems = filteredMessages.length - selectedMessages.length;
        const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        } else if (newTotalPages === 0) {
          setCurrentPage(1);
        }
        await loadMessages();
      } catch (error) {
        console.error("Error deleting messages:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete some messages.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteMessage = async (id) => {
    if (window.confirm("Are you sure you want to delete this message?")) {
      try {
        setLoading(true);
        const messageToDelete = messages.find((m) => m.id === id);
        if (messageToDelete?.imageUrl) {
          await deleteImageFromFirebase(messageToDelete.imageUrl);
        }
        await deleteDoc(doc(db, "admin_posts", id));
        setSnackbar({
          open: true,
          message: "Message deleted successfully.",
          severity: "success",
        });
        const newTotalItems = filteredMessages.length - 1;
        const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
        if (currentItems.length === 1 && currentPage > 1) {
          setCurrentPage((prev) => prev - 1);
        } else if (newTotalPages === 0) {
          setCurrentPage(1);
        }
        await loadMessages();
      } catch (error) {
        console.error("Error deleting message:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete message.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddMessage = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let imageUrl = newMessage.imageUrl;

      if (addImageFile) {
        imageUrl = await uploadImageToFirebase(addImageFile);
      }

      const messageData = {
        ...newMessage,
        authorId: user.uid,
        imageUrl,
        authorName: `${user.firstName} ${user.lastName}`,
        read: false,
      };

      await addMessage(messageData);
      setSnackbar({
        open: true,
        message: "Message posted successfully!",
        severity: "success",
      });
      resetAddForm();
      setIsAddModalOpen(false);
      await loadMessages();
    } catch (error) {
      console.error("Error adding message:", error);
      setSnackbar({
        open: true,
        message: "Failed to post message.",
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEditMessage = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      let imageUrl = editingMessage.imageUrl;

      if (editImageFile) {
        if (editingMessage.imageUrl) {
          await deleteImageFromFirebase(editingMessage.imageUrl);
        }
        imageUrl = await uploadImageToFirebase(editImageFile);
      }

      await updateMessage(editingMessage.id, {
        ...editingMessage,
        imageUrl,
      });

      setSnackbar({
        open: true,
        message: "Message updated successfully!",
        severity: "success",
      });
      resetEditForm();
      setEditingMessage(null);
      await loadMessages();
    } catch (error) {
      console.error("Error updating message:", error);
      setSnackbar({
        open: true,
        message: "Failed to update message.",
        severity: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAddImageUpload = (file) => {
    if (!file) return;

    if (!validateImageFile(file)) return;

    setAddImageFile(file);
    createImagePreview(file, setAddImagePreview);
  };

  const handleEditImageUpload = (file) => {
    if (!file) return;

    if (!validateImageFile(file)) return;

    setEditImageFile(file);
    createImagePreview(file, setEditImagePreview);
  };

  const validateImageFile = (file) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setSnackbar({
        open: true,
        message: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
        severity: "error",
      });
      return false;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setSnackbar({
        open: true,
        message: "Image size should be less than 5MB",
        severity: "error",
      });
      return false;
    }

    return true;
  };

  const createImagePreview = (file, setPreview) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToFirebase = async (file) => {
    return new Promise((resolve, reject) => {
      const fileName = `messages/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          setUploading(false);
          setSnackbar({
            open: true,
            message: "Failed to upload image.",
            severity: "error",
          });
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(0);
            resolve(downloadURL);
          } catch (error) {
            setSnackbar({
              open: true,
              message: "Failed to get image URL.",
              severity: "error",
            });
            reject(error);
          }
        }
      );
    });
  };

  const deleteImageFromFirebase = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes("firebase")) return;

    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const resetAddForm = () => {
    setNewMessage({
      title: "",
      description: "",
      imageUrl: "",
      targetAgeGroup: "all",
      targetLocation: "all",
      targetSport: "all",
      priority: "normal",
    });
    setAddImageFile(null);
    setAddImagePreview("");
    setUploadProgress(0);
  };

  const resetEditForm = () => {
    setEditImageFile(null);
    setEditImagePreview("");
    setUploadProgress(0);
  };

  const removeAddImage = () => {
    setAddImageFile(null);
    setAddImagePreview("");
    setNewMessage({ ...newMessage, imageUrl: "" });
  };

  const removeEditImage = () => {
    setEditImageFile(null);
    setEditImagePreview("");
    setEditingMessage({ ...editingMessage, imageUrl: "" });
  };

  const toggleMessageRead = async (messageId, currentReadStatus) => {
    try {
      await updateMessage(messageId, { read: !currentReadStatus });
      await loadMessages();
    } catch (error) {
      console.error("Error updating message status:", error);
      setSnackbar({
        open: true,
        message: "Failed to update message status.",
        severity: "error",
      });
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return "Unknown";
    const now = new Date();
    const messageDate = date instanceof Date ? date : new Date(date);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return messageDate.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTargetingInfo = (message) => {
    const targets = [];
    if (message.targetAgeGroup && message.targetAgeGroup !== "all") {
      targets.push(`Age: ${message.targetAgeGroup}`);
    }
    if (message.targetLocation && message.targetLocation !== "all") {
      targets.push(`Location: ${message.targetLocation}`);
    }
    if (message.targetSport && message.targetSport !== "all") {
      targets.push(`Sport: ${message.targetSport}`);
    }
    return targets.length > 0 ? targets.join(", ") : "All Groups";
  };

  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "read" && message.read) ||
      (filterStatus === "unread" && !message.read);

    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredMessages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredMessages.slice(startIndex, endIndex);

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPage = (page) => setCurrentPage(page);

  const getPageNumbers = () => {
    const delta = 2;
    const pages = [];
    const startPage = Math.max(1, currentPage - delta);
    const endPage = Math.min(totalPages, currentPage + delta);
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (loading) {
    return (
      <div>
        <Header title="Message Center" subtitle="Loading messages..." />
        <div className="glass rounded-2xl p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Message Center"
        subtitle="Manage communication with coaches and parents"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {messages.length}
              </div>
              <div className="text-sm text-gray-600">Total Messages</div>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Eye className="text-green-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {messages.filter((m) => m.read).length}
              </div>
              <div className="text-sm text-gray-600">Read Messages</div>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <EyeOff className="text-orange-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {messages.filter((m) => !m.read).length}
              </div>
              <div className="text-sm text-gray-600">Unread Messages</div>
            </div>
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Users className="text-purple-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-gray-800">
                {totalRecipients}
              </div>
              <div className="text-sm text-gray-600">Total Recipients</div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800">
              All Messages ({filteredMessages.length})
            </h3>
            {selectedMessages.length > 0 && (
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                disabled={loading}
              >
                <Trash2 size={16} className="mr-2" />
                Delete Selected ({selectedMessages.length})
              </Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              New Message
            </Button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Showing {currentItems.length} of {totalItems} messages
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {itemsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">entries</span>
          </div>
        </div>

        {filteredMessages.length > 0 ? (
          <>
            <Table
              headers={[
                <input
                  type="checkbox"
                  checked={
                    selectedMessages.length === currentItems.length &&
                    currentItems.length > 0
                  }
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                />,
                "Status",
                "Title",
                "Target Group",
                "Priority",
                "Sent",
                "Actions",
              ]}
            >
              {currentItems.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(message.id)}
                      onChange={() => handleSelectMessage(message.id)}
                      className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() =>
                        toggleMessageRead(message.id, message.read)
                      }
                      className={`p-1 rounded-full ${
                        message.read ? "text-green-600" : "text-gray-400"
                      }`}
                    >
                      {message.read ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {message.imageUrl && (
                        <ImageIcon size={16} className="text-gray-400" />
                      )}
                      <div>
                        <div className="truncate max-w-[200px]">
                          {message.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">
                          {message.description}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{getTargetingInfo(message)}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(
                        message.priority
                      )}`}
                    >
                      {message?.priority?.charAt(0)?.toUpperCase() + message?.priority?.slice(1) || "normal"}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {getTimeAgo(message.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedMessage(message)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View Message"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessage(message);
                          setEditImagePreview(message.imageUrl || "");
                        }}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="Edit Message"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Message"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, totalItems)}{" "}
                  of {totalItems} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="First Page"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          pageNum === currentPage
                            ? "bg-primary-500 text-white"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Last Page"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <MessageSquare size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No Messages Found
            </h3>
            <p className="text-gray-500">
              {messages.length === 0
                ? "No messages have been sent yet. Create your first message to communicate with coaches and parents."
                : "No messages match your current search criteria."}
            </p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          resetAddForm();
          setIsAddModalOpen(false);
        }}
        title="Send New Message"
        size="lg"
      >
        <form onSubmit={handleAddMessage} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newMessage.title}
              onChange={(e) =>
                setNewMessage({ ...newMessage, title: e.target.value })
              }
              required
              placeholder="Enter message title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message *
            </label>
            <textarea
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newMessage.description}
              onChange={(e) =>
                setNewMessage({ ...newMessage, description: e.target.value })
              }
              required
              rows="4"
              placeholder="Enter your message content"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
              <span className="text-gray-500 text-xs ml-2">(Optional)</span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAddImageUpload(e.target.files[0])}
                  className="hidden"
                  id="add-image-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="add-image-upload"
                  className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 transition-colors ${
                    uploading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Upload size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {addImageFile ? "Change Image" : "Upload Image"}
                  </span>
                </label>
                {(addImageFile || addImagePreview) && (
                  <button
                    type="button"
                    onClick={removeAddImage}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="w-full">
                  <LinearProgress
                    variant="determinate"
                    value={uploadProgress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#e5e7eb",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 4,
                        backgroundColor: "#6366f1",
                      },
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              {(addImagePreview || newMessage.imageUrl) && (
                <div className="relative">
                  <img
                    src={addImagePreview || newMessage.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Preview
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Autocomplete
                label="Age Groups"
                options={ageGroups}
                value={newMessage.targetAgeGroup}
                onChange={(value) => {
                  setNewMessage({
                    ...newMessage,
                    targetAgeGroup: Array.isArray(value) ? value : [value],
                  });
                }}
                placeholder="Select Age Groups/Grade (multiple allowed)"
                getOptionLabel={(group) => group}
                getOptionValue={(group) => group}
                multiple={true}
                required
              />
            </div>

            <div>
              <Autocomplete
                label="Location"
                options={locations}
                value={newMessage.targetLocation}
                onChange={(value) =>
                  setNewMessage({ ...newMessage, targetLocation: value })
                }
                placeholder="Select location or enter custom location"
                getOptionLabel={(location) => location}
                getOptionValue={(location) => location}
                allowCustomInput={true}
                required
              />
            </div>

            <div>
              <Autocomplete
                label="Sport"
                options={groups.sports}
                value={newMessage.targetSport}
                onChange={(value) =>
                  setNewMessage({ ...newMessage, targetSport: value })
                }
                placeholder="Select Sport"
                getOptionLabel={(sport) => `${getSportIcon(sport)} ${sport}`}
                getOptionValue={(sport) => sport}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
              value={newMessage.priority}
              onChange={(e) =>
                setNewMessage({ ...newMessage, priority: e.target.value })
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                resetAddForm();
                setIsAddModalOpen(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={uploading}>
              <Send size={16} className="mr-1" />
              {uploading ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedMessage && (
        <Modal
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          title="Message Details"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedMessage.title}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                  selectedMessage.priority
                )}`}
              >
                {selectedMessage.priority || "normal"}
              </span>
            </div>

            {selectedMessage.imageUrl && (
              <div className="rounded-lg overflow-hidden w-[450px]">
                <img
                  src={selectedMessage.imageUrl}
                  alt="Message"
                  className="w-full h-50 object-cover rounded-lg"
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedMessage.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Target Group:</span>
                <p className="text-gray-600">
                  {getTargetingInfo(selectedMessage)}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sent:</span>
                <p className="text-gray-600">
                  {getTimeAgo(selectedMessage.timestamp)}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {editingMessage && (
        <Modal
          isOpen={!!editingMessage}
          onClose={() => {
            resetEditForm();
            setEditingMessage(null);
          }}
          title="Edit Message"
          size="lg"
        >
          <form onSubmit={handleEditMessage} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingMessage.title || ""}
                onChange={(e) =>
                  setEditingMessage({
                    ...editingMessage,
                    title: e.target.value,
                  })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingMessage.description || ""}
                onChange={(e) =>
                  setEditingMessage({
                    ...editingMessage,
                    description: e.target.value,
                  })
                }
                required
                rows="4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image
                <span className="text-gray-500 text-xs ml-2">(Optional)</span>
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleEditImageUpload(e.target.files[0])}
                    className="hidden"
                    id="edit-image-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="edit-image-upload"
                    className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 transition-colors ${
                      uploading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Upload size={20} className="text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {editImageFile ? "Change Image" : "Upload Image"}
                    </span>
                  </label>
                  {(editImageFile ||
                    editImagePreview ||
                    editingMessage.imageUrl) && (
                    <button
                      type="button"
                      onClick={removeEditImage}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {uploading && uploadProgress > 0 && (
                  <div className="w-full">
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#e5e7eb",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 4,
                          backgroundColor: "#6366f1",
                        },
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Uploading... {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}

                {(editImagePreview || editingMessage.imageUrl) && (
                  <div className="relative">
                    <img
                      src={editImagePreview || editingMessage.imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      Preview
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500">
                  Supported formats: JPEG, PNG, GIF, WebP (Max 5MB)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Trophy size={16} className="inline mr-1" />
                  Age Group
                </label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingMessage.targetAgeGroup || "all"}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      targetAgeGroup: e.target.value,
                    })
                  }
                >
                  <option value="all">All Age Groups</option>
                  {ageGroups?.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin size={16} className="inline mr-1" />
                  Location
                </label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingMessage.targetLocation || "all"}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      targetLocation: e.target.value,
                    })
                  }
                >
                  <option value="all">All Locations</option>
                  {groups.locations?.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users size={16} className="inline mr-1" />
                  Sport
                </label>
                <select
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                  value={editingMessage.targetSport || "all"}
                  onChange={(e) =>
                    setEditingMessage({
                      ...editingMessage,
                      targetSport: e.target.value,
                    })
                  }
                >
                  <option value="all">All Sports</option>
                  {groups.sports?.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                value={editingMessage.priority || "normal"}
                onChange={(e) =>
                  setEditingMessage({
                    ...editingMessage,
                    priority: e.target.value,
                  })
                }
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  resetEditForm();
                  setEditingMessage(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Updating..." : "Update Message"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Messages;

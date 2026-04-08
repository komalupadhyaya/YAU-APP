// components/admin/community/AddPostModal.js
import React, { useState, useRef } from 'react';
import Modal from '../../common/Modal';
import {
    X,
    Upload,
    Image,
    Video,
    FileText,
    Eye,
    Calendar,
    Clock,
    Hash,
    AtSign,
    MapPin,
    Users,
    Camera,
    Film,
    Globe,
    Heart,
    MessageCircle,
    Share2,
    Lock,
    CheckCircle,
    AlertCircle
} from 'lucide-react';
import {
    addCommunityPost,
    uploadCommunityMedia
} from '../../../firebase/apis/api-community';
import { useAuth } from '../../../context/AuthContext';
import { Autocomplete } from '../../common/AutoComplete';

const AddPostModal = ({ isOpen, onClose, onSubmit, locations }) => {
    const { user } = useAuth()
    const [currentStep, setCurrentStep] = useState(1);
    const [newPost, setNewPost] = useState({
        title: '',
        caption: '',
        team: '',
        authorType: 'admin',
        authorName: `${user.firstName} ${user.lastName}`,
        authorId: user.uid,
        mediaFiles: [],
        mediaUrls: [],
        hashtags: [],
        mentions: [],
        location: '',
        scheduledFor: '',
        status: 'published',
        visibility: 'public',
        allowComments: true,
        allowSharing: true,
        category: 'general'
    });

    const [uploadProgress, setUploadProgress] = useState({});
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [errors, setErrors] = useState({});

    const fileInputRef = useRef(null);// eslint-disable-next-line
    const videoInputRef = useRef(null);

    const steps = [
        { id: 1, title: 'Post Details', icon: FileText },
        { id: 2, title: 'Media Upload', icon: Upload },
        { id: 3, title: 'Settings & Preview', icon: Eye }
    ];

    const categories = [
        { value: 'general', label: 'General', icon: Globe },
        { value: 'training', label: 'Training', icon: Users },
        { value: 'match', label: 'Match Updates', icon: Clock },
        { value: 'announcement', label: 'Announcements', icon: AlertCircle },
        { value: 'achievement', label: 'Achievements', icon: CheckCircle },
        { value: 'news', label: 'News', icon: FileText }
    ];

    const handleInputChange = (field, value) => {
        setNewPost(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }

        // Auto-extract hashtags and mentions
        if (field === 'caption') {
            const hashtags = value.match(/#[\w]+/g) || [];
            const mentions = value.match(/@[\w]+/g) || [];
            setNewPost(prev => ({
                ...prev,
                hashtags: [...new Set(hashtags)],
                mentions: [...new Set(mentions)]
            }));
        }
    };

    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!newPost.caption.trim()) newErrors.caption = 'Caption is required';
            if (!newPost.authorName.trim()) newErrors.authorName = 'Author name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleMediaUpload(e.dataTransfer.files);
        }
    };

 const handleMediaUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
        setUploadingMedia(true);
        const tempPostId = `temp_${Date.now()}`;
        const fileArray = Array.from(files);

        // Validate files
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/mov'];

        const validFiles = fileArray.filter(file => {
            if (file.size > maxSize) {
                alert(`File ${file.name} is too large. Maximum size is 100MB.`);
                return false;
            }
            if (!allowedTypes.includes(file.type)) {
                alert(`File ${file.name} is not supported. Please use JPG, PNG, GIF, WebP, MP4, WebM, or MOV files.`);
                return false;
            }
            if (file.size === 0) {
                alert(`File ${file.name} is empty.`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        console.log('📤 Starting upload for files:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

        // Upload files sequentially to avoid overwhelming the server
        const uploadResults = [];
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

            try {
                // Update progress
                setUploadProgress(prev => ({
                    ...prev,
                    [i]: { fileName: file.name, progress: 0, status: 'uploading' }
                }));

                console.log(`🚀 Uploading file ${i + 1}/${validFiles.length}:`, file.name);

                const result = await uploadCommunityMedia(file, tempPostId, mediaType, (progress) => {
                    setUploadProgress(prev => ({
                        ...prev,
                        [i]: { ...prev[i], progress }
                    }));
                });

                setUploadProgress(prev => ({
                    ...prev,
                    [i]: { ...prev[i], progress: 100, status: 'completed' }
                }));

                uploadResults.push({ ...result, file, originalIndex: i });
                console.log(`✅ File ${i + 1} uploaded successfully:`, result);

            } catch (error) {
                console.error(`❌ Failed to upload file ${file.name}:`, error);
                setUploadProgress(prev => ({
                    ...prev,
                    [i]: { ...prev[i], status: 'error', error: error.message }
                }));
            }
        }

        const successfulUploads = uploadResults.filter(result => result && result.url);

        if (successfulUploads.length > 0) {
            setNewPost(prev => ({
                ...prev,
                mediaUrls: [...prev.mediaUrls, ...successfulUploads.map(result => result.url)],
                mediaFiles: [...prev.mediaFiles, ...successfulUploads.map(result => ({
                    ...result,
                    type: result.file.type.startsWith('image/') ? 'image' : 'video',
                    size: result.file.size,
                    name: result.file.name
                }))]
            }));
        }

        if (successfulUploads.length !== validFiles.length) {
            alert(`${successfulUploads.length} of ${validFiles.length} files uploaded successfully. Check console for errors.`);
        }

    } catch (error) {
        console.error('Error uploading media:', error);
        alert('Failed to upload media files. Please try again.');
    } finally {
        setUploadingMedia(false);
        // Clear progress after a delay
        setTimeout(() => {
            setUploadProgress({});
        }, 3000);
    }
};


    const removeMedia = (index) => {
        setNewPost(prev => ({
            ...prev,
            mediaUrls: prev.mediaUrls.filter((_, i) => i !== index),
            mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
        }));

        if (previewIndex >= newPost.mediaUrls.length - 1) {
            setPreviewIndex(Math.max(0, newPost.mediaUrls.length - 2));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateStep(1)) {
            setCurrentStep(1);
            return;
        }

        try {
            setLoading(true);

            const postData = {
                title: newPost.title,
                caption: newPost.caption,
                hashtags: newPost.hashtags,
                authorId: user?.id || 'admin',
                authorName: newPost.authorName,
                authorType: newPost.authorType,
                team: newPost.team,
                location: newPost.location,
                category: newPost.category,
                visibility: newPost.visibility,
                allowComments: newPost.allowComments,
                allowSharing: newPost.allowSharing,
                mediaUrls: newPost.mediaUrls, // Already uploaded URLs
                mediaCount: newPost.mediaUrls.length,
                hasVideo: newPost.mediaFiles.some(file => file.type === 'video'),
                hasImage: newPost.mediaFiles.some(file => file.type === 'image'),
                isScheduled: !!newPost.scheduledFor,
                scheduledFor: newPost.scheduledFor ? new Date(newPost.scheduledFor) : null,
                // Remove mediaFiles - we already have URLs
            };

            await addCommunityPost(postData);

            // Reset form
            setNewPost({
                title: '',
                caption: '',
                team: '',
                authorType: 'admin',
                authorName: 'YAU Admin',
                authorId: 'admin',
                mediaFiles: [],
                mediaUrls: [],
                hashtags: [],
                mentions: [],
                location: '',
                scheduledFor: '',
                status: 'published',
                visibility: 'public',
                allowComments: true,
                allowSharing: true,
                category: 'general'
            });

            setCurrentStep(1);
            onClose();
            if (onSubmit) onSubmit();

            alert('✅ Post published successfully!');

        } catch (error) {
            console.error('Error adding post:', error);
            alert('Failed to publish post');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        {/* Author Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <User size={16} className="inline mr-1" />
                                    Post as *
                                </label>
                                <select
                                    value={newPost.authorType}
                                    onChange={(e) => handleInputChange('authorType', e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                >
                                    <option value="admin">Admin</option>
                                    <option value="coach">Coach</option>
                                    <option value="official">Official Account</option>
                                </select>
                            </div> */}

                            {/* <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Author Name *
                                </label>
                                <input
                                    type="text"
                                    value={newPost.authorName}
                                    onChange={(e) => handleInputChange('authorName', e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.authorName ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                    placeholder="Enter author name"
                                    required
                                />
                                {errors.authorName && <p className="text-red-500 text-sm mt-1">{errors.authorName}</p>}
                            </div> */}
                        </div>

                        {/* Category and Team */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={newPost.category}
                                    onChange={(e) => handleInputChange('category', e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    {categories.map(category => {
                                        return (
                                            <option key={category.value} value={category.value}>
                                                {category.label}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <Users size={16} className="inline mr-1" />
                                    Team/Group
                                </label>
                                <input
                                    type="text"
                                    value={newPost.team}
                                    onChange={(e) => handleInputChange('team', e.target.value)}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="e.g., U12 Eagles, Training Tips, News..."
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Title (Optional)
                            </label>
                            <input
                                type="text"
                                value={newPost.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Add a catchy title for your post..."
                                maxLength={150}
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                                {newPost.title.length}/150 characters
                            </div>
                        </div>

                        {/* Caption with Enhanced Text Area */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FileText size={16} className="inline mr-1" />
                                Caption *
                            </label>
                            <div className="relative">
                                <textarea
                                    value={newPost.caption}
                                    onChange={(e) => handleInputChange('caption', e.target.value)}
                                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${errors.caption ? 'border-red-500' : 'border-gray-200'
                                        }`}
                                    placeholder="Share what's on your mind... Use #hashtags to increase visibility and @mentions to tag people!"
                                    rows={6}
                                    maxLength={2200}
                                    required
                                />

                                {/* Text Formatting Helper */}
                                <div className="absolute bottom-3 right-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('caption', newPost.caption + ' #')}
                                        className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                                        title="Add hashtag"
                                    >
                                        <Hash size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('caption', newPost.caption + ' @')}
                                        className="p-1 text-green-500 hover:bg-green-50 rounded"
                                        title="Add mention"
                                    >
                                        <AtSign size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Use #hashtags and @mentions</span>
                                <span className={newPost.caption.length > 2000 ? 'text-red-500' : ''}>
                                    {newPost.caption.length}/2200 characters
                                </span>
                            </div>
                            {errors.caption && <p className="text-red-500 text-sm mt-1">{errors.caption}</p>}

                            {/* Live hashtag and mention preview */}
                            {(newPost.hashtags.length > 0 || newPost.mentions.length > 0) && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                    {newPost.hashtags.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                                <Hash size={14} />
                                                Hashtags:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {newPost.hashtags.slice(0, 10).map((hashtag, index) => (
                                                    <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                                        {hashtag}
                                                    </span>
                                                ))}
                                                {newPost.hashtags.length > 10 && (
                                                    <span className="text-xs text-gray-500">+{newPost.hashtags.length - 10} more</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {newPost.mentions.length > 0 && (
                                        <div>
                                            <div className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                                                <AtSign size={14} />
                                                Mentions:
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {newPost.mentions.slice(0, 10).map((mention, index) => (
                                                    <span key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                                        {mention}
                                                    </span>
                                                ))}
                                                {newPost.mentions.length > 10 && (
                                                    <span className="text-xs text-gray-500">+{newPost.mentions.length - 10} more</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <Autocomplete
                                label=" Location "
                                options={locations}
                                value={newPost.location}
                                onChange={(value) => setNewPost({ ...newPost, location: value })}
                                placeholder="Select location or enter custom location"
                                getOptionLabel={(location) => location}
                                getOptionValue={(location) => location}
                                allowCustomInput={true}
                                required
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold mb-2">Add Media to Your Post</h3>
                            <p className="text-gray-600">Upload photos and videos to make your post more engaging</p>
                        </div>

                        {/* Enhanced Upload Area */}
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-gray-300 hover:border-primary-500 hover:bg-gray-50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={(e) => handleMediaUpload(e.target.files)}
                                className="hidden"
                                disabled={uploadingMedia}
                            />

                            {uploadingMedia ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mb-4"></div>
                                    <div className="text-lg font-medium text-gray-700 mb-2">Uploading media files...</div>
                                    <div className="text-sm text-gray-500">Please wait while we process your files</div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="flex gap-4 mb-4">
                                        <div className="p-4 bg-blue-100 rounded-full">
                                            <Camera size={32} className="text-blue-600" />
                                        </div>
                                        <div className="p-4 bg-purple-100 rounded-full">
                                            <Film size={32} className="text-purple-600" />
                                        </div>
                                    </div>

                                    <div className="text-xl font-semibold text-gray-700 mb-2">
                                        Upload Photos & Videos
                                    </div>
                                    <div className="text-gray-500 mb-4">
                                        Drag and drop files here, or click to browse
                                    </div>

                                    <div className="flex gap-3 mb-4">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                                        >
                                            <Image size={20} />
                                            Choose Photos
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'video/*';
                                                input.multiple = true;
                                                input.onchange = (e) => handleMediaUpload(e.target.files);
                                                input.click();
                                            }}
                                            className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                                        >
                                            <Video size={20} />
                                            Choose Videos
                                        </button>
                                    </div>

                                    <div className="text-sm text-gray-400">
                                        Supports: JPG, PNG, GIF, WebP, MP4, WebM, MOV (Max 100MB per file)
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {Object.keys(uploadProgress).length > 0 && (
                            <div className="space-y-2">
                                <h4 className="font-medium text-gray-700">Upload Progress</h4>
                                {Object.entries(uploadProgress).map(([key, progress]) => (
                                    <div key={key} className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700 truncate">
                                                {progress.fileName}
                                            </span>
                                            <span className={`text-sm ${progress.status === 'completed' ? 'text-green-600' :
                                                progress.status === 'error' ? 'text-red-600' :
                                                    'text-blue-600'
                                                }`}>
                                                {progress.status === 'completed' ? 'Complete' :
                                                    progress.status === 'error' ? 'Error' :
                                                        `${progress.progress}%`}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all ${progress.status === 'completed' ? 'bg-green-500' :
                                                    progress.status === 'error' ? 'bg-red-500' :
                                                        'bg-blue-500'
                                                    }`}
                                                style={{ width: `${progress.progress}%` }}
                                            />
                                        </div>
                                        {progress.error && (
                                            <p className="text-red-600 text-xs mt-1">{progress.error}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Media Preview Grid */}
                        {newPost.mediaUrls.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-700">
                                        Media Preview ({newPost.mediaUrls.length} files)
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setNewPost(prev => ({
                                            ...prev,
                                            mediaUrls: [],
                                            mediaFiles: []
                                        }))}
                                        className="text-sm text-red-600 hover:text-red-800 hover:underline"
                                    >
                                        Clear All
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
                                    {newPost.mediaUrls.map((url, index) => (
                                        <div key={index} className="relative group">
                                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                                {url.includes('.mp4') || newPost.mediaFiles[index]?.type?.startsWith('video') ? (
                                                    <video
                                                        src={url}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        controls
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <img
                                                        src={url}
                                                        alt={`Upload ${index + 1}`}
                                                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                                        onClick={() => setPreviewIndex(index)}
                                                    />
                                                )}
                                            </div>

                                            {/* Remove button */}
                                            <button
                                                type="button"
                                                onClick={() => removeMedia(index)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                            >
                                                <X size={14} />
                                            </button>

                                            {/* Media type and size indicator */}
                                            <div className="absolute bottom-2 left-2 right-2">
                                                <div className="bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs flex items-center justify-between">
                                                    <div className="flex items-center gap-1">
                                                        {url.includes('.mp4') || newPost.mediaFiles[index]?.type?.startsWith('video') ? (
                                                            <>
                                                                <Video size={10} />
                                                                VIDEO
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Image size={10} />
                                                                PHOTO
                                                            </>
                                                        )}
                                                    </div>
                                                    {newPost.mediaFiles[index]?.size && (
                                                        <span>
                                                            {(newPost.mediaFiles[index].size / (1024 * 1024)).toFixed(1)}MB
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        {/* Post Settings */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Post Settings</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={newPost.status}
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="published">Publish Now</option>
                                        <option value="draft">Save as Draft</option>
                                        <option value="scheduled">Schedule for Later</option>
                                    </select>
                                </div>

                                {/* Visibility */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Visibility
                                    </label>
                                    <select
                                        value={newPost.visibility}
                                        onChange={(e) => handleInputChange('visibility', e.target.value)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="public">Public</option>
                                        <option value="members">Members Only</option>
                                        <option value="team">Team Only</option>
                                    </select>
                                </div>
                            </div>

                            {/* Schedule Date/Time */}
                            {newPost.status === 'scheduled' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar size={16} className="inline mr-1" />
                                        Schedule Date & Time
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={newPost.scheduledFor}
                                        onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            )}

                            {/* Post Options */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-700">Post Options</h4>

                                <div className="space-y-2">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={newPost.allowComments}
                                            onChange={(e) => handleInputChange('allowComments', e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Allow comments</span>
                                    </label>

                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={newPost.allowSharing}
                                            onChange={(e) => handleInputChange('allowSharing', e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">Allow sharing</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Live Post Preview */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Eye size={20} />
                                Post Preview
                            </h3>

                            <div className="border border-gray-200 rounded-xl p-6 bg-gradient-to-br from-gray-50 to-white max-h-96 overflow-y-auto">
                                {/* Preview header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        {newPost.authorName.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800">{newPost.authorName}</div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                {newPost.authorType}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {newPost.status === 'scheduled' && newPost.scheduledFor
                                                    ? `Scheduled for ${new Date(newPost.scheduledFor).toLocaleString()}`
                                                    : 'Just now'
                                                }
                                            </span>
                                            {newPost.visibility !== 'public' && (
                                                <>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        <Lock size={12} />
                                                        {newPost.visibility}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Preview content */}
                                {newPost.title && (
                                    <h4 className="font-bold text-gray-800 mb-3 text-lg">{newPost.title}</h4>
                                )}

                                <div className="mb-4">
                                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                                        {newPost.caption || 'No caption provided'}
                                    </p>
                                </div>

                                {/* Preview media */}
                                {newPost.mediaUrls.length > 0 && (
                                    <div className="mb-4">
                                        {newPost.mediaUrls.length === 1 ? (
                                            <div className="rounded-lg overflow-hidden">
                                                {newPost.mediaUrls[0].includes('.mp4') || newPost.mediaFiles[0]?.type?.startsWith('video') ? (
                                                    <video
                                                        src={newPost.mediaUrls[0]}
                                                        controls
                                                        className="w-full max-h-64 object-cover"
                                                        muted
                                                    />
                                                ) : (
                                                    <img
                                                        src={newPost.mediaUrls[0]}
                                                        alt="Preview"
                                                        className="w-full max-h-64 object-cover"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {newPost.mediaUrls.slice(0, 4).map((url, index) => (
                                                    <div key={index} className="aspect-square rounded-lg overflow-hidden relative">
                                                        {url.includes('.mp4') || newPost.mediaFiles[index]?.type?.startsWith('video') ? (
                                                            <video
                                                                src={url}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                            />
                                                        ) : (
                                                            <img
                                                                src={url}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                        {index === 3 && newPost.mediaUrls.length > 4 && (
                                                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                                                <span className="text-white font-bold text-lg">
                                                                    +{newPost.mediaUrls.length - 4}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {newPost.team && (
                                        <span className="text-sm text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                            {newPost.team}
                                        </span>
                                    )}
                                    {newPost.location && (
                                        <span className="text-sm text-green-600 bg-green-100 px-3 py-1 rounded-full flex items-center gap-1">
                                            <MapPin size={12} />
                                            {newPost.location}
                                        </span>
                                    )}
                                    <span className="text-sm text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                                        {categories.find(c => c.value === newPost.category)?.label || 'General'}
                                    </span>
                                </div>

                                {/* Preview engagement placeholder */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1 hover:text-red-500 cursor-pointer">
                                            <Heart size={14} />
                                            <span>0</span>
                                        </div>
                                        {newPost.allowComments && (
                                            <div className="flex items-center gap-1 hover:text-blue-500 cursor-pointer">
                                                <MessageCircle size={14} />
                                                <span>0</span>
                                            </div>
                                        )}
                                        {newPost.allowSharing && (
                                            <div className="flex items-center gap-1 hover:text-green-500 cursor-pointer">
                                                <Share2 size={14} />
                                                <span>0</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-xs text-gray-400">
                                        Preview Mode
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!loading && !uploadingMedia) {
                    onClose();
                    setCurrentStep(1);
                    setNewPost({
                        title: '',
                        caption: '',
                        team: '',
                        authorType: 'admin',
                        authorName: 'YAU Admin',
                        authorId: 'admin',
                        mediaFiles: [],
                        mediaUrls: [],
                        hashtags: [],
                        mentions: [],
                        location: '',
                        scheduledFor: '',
                        status: 'published',
                        visibility: 'public',
                        allowComments: true,
                        allowSharing: true,
                        category: 'general'
                    });
                }
            }}
            title="Create Community Post"
            size="lg"
            className="max-h-[90vh]"
        >
            <div className="flex flex-col h-full">
                {/* Enhanced Step Navigation */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${isActive ? 'bg-primary-500 text-white' :
                                        isCompleted ? 'bg-green-500 text-white' :
                                            'bg-gray-200 text-gray-600'
                                        }`}>
                                        <Icon size={18} />
                                        <span className="font-medium hidden sm:inline">{step.title}</span>
                                        <span className="sm:hidden font-medium">{step.id}</span>
                                    </div>

                                    {index < steps.length - 1 && (
                                        <div className="w-8 h-0.5 bg-gray-300 mx-2">
                                            <div className={`h-full transition-all ${step.id < currentStep ? 'bg-green-500' : 'bg-gray-300'
                                                }`} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {getStepContent()}
                </div>

                {/* Enhanced Navigation Buttons */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex flex-col sm:flex-row gap-3">
                    <div className="flex gap-3 flex-1">
                        {currentStep > 1 && (
                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={loading || uploadingMedia}
                                className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (!loading && !uploadingMedia) {
                                    onClose();
                                    setCurrentStep(1);
                                }
                            }}
                            disabled={loading || uploadingMedia}
                            className="flex-1 sm:flex-none px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="flex gap-3">
                        {currentStep < 3 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={!newPost.caption.trim() || !newPost.authorName.trim() || loading || uploadingMedia}
                                className="flex-1 sm:flex-none px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={!newPost.caption.trim() || uploadingMedia || loading}
                                className="flex-1 sm:flex-none px-8 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Publishing...
                                    </div>
                                ) : newPost.status === 'draft' ? (
                                    'Save Draft'
                                ) : newPost.status === 'scheduled' ? (
                                    'Schedule Post'
                                ) : (
                                    'Publish Post'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AddPostModal;
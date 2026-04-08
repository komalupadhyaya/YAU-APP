// components/admin/CommunityManagement.js
import React, { useState, useEffect } from 'react';
import Header from '../../layout/Header';
import Button from '../../common/Button';
import {
    getCommunityPosts,
    deleteCommunityPost,
    updateCommunityPost,
} from '../../../firebase/apis/api-community';
import {
    Plus,
    Search,
    RefreshCw,
    Download,
    Upload as UploadIcon
} from 'lucide-react';

// Import sub-components
import CommunityStats from './CommunityStats';
import FilterControls from './FilterControls';
import PostsGrid from './PostsGrid';
import Pagination from './Pagination';
import PostDetailModal from './PostDetailModal';
import AddPostModal from './AddPostModal';
import BulkActions from './BulkActions';
import { getLocations } from '../../../firebase/firestore';

const CommunityManagement = () => {
    // State management
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [selectedPosts, setSelectedPosts] = useState(new Set());
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
    const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false);
    const [locations, setLocations] = useState([]);

    // Filters and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        userType: 'all',
        mediaType: 'all',
        dateRange: 'all',
        team: 'all'
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [postsPerPage, setPostsPerPage] = useState(12);
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');

    // View mode
    const [viewMode, setViewMode] = useState('grid'); // grid, list, detailed

    // Statistics
    const [stats, setStats] = useState({
        totalPosts: 0,
        publishedPosts: 0,
        blockedPosts: 0,
        reportedPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        engagementRate: 0
    });

    // Effects
    useEffect(() => {
        loadCommunityPosts();// eslint-disable-next-line
    }, [sortBy, sortOrder]);

    useEffect(() => {
        calculateStats();// eslint-disable-next-line
    }, [posts]);

    // Main functions
    const loadCommunityPosts = async () => {
        try {
            setLoading(true);
            const [communityPosts, locationsData] = await Promise.all([
                getCommunityPosts(),
                getLocations()
            ]);
            const sortedPosts = communityPosts.sort((a, b) => {
                const aValue = a[sortBy];
                const bValue = b[sortBy];

                if (sortOrder === 'desc') {
                    return bValue > aValue ? 1 : -1;
                } else {
                    return aValue > bValue ? 1 : -1;
                }
            });

            setPosts(sortedPosts);

            setLocations(locationsData.map(loc => loc.name));
        } catch (error) {
            console.error('Error loading community posts:', error);
            showNotification('Failed to load community posts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const totalPosts = posts.length;
        const publishedPosts = posts.filter(p => p.status === 'published' && !p.isBlocked).length;
        const blockedPosts = posts.filter(p => p.isBlocked).length;
        const reportedPosts = posts.filter(p => (p.reportCount || 0) > 0).length;
        const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
        const totalComments = posts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
        const totalShares = posts.reduce((sum, p) => sum + (p.shareCount || 0), 0);
        const engagementRate = totalPosts > 0 ? ((totalLikes + totalComments + totalShares) / totalPosts).toFixed(1) : 0;

        setStats({
            totalPosts,
            publishedPosts,
            blockedPosts,
            reportedPosts,
            totalLikes,
            totalComments,
            totalShares,
            engagementRate
        });
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await deleteCommunityPost(postId);
            await loadCommunityPosts();
            setSelectedPost(null);
            setIsPostModalOpen(false);
            showNotification('Post deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting post:', error);
            showNotification('Failed to delete post', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleBlockPost = async (postId, shouldBlock) => {
        try {
            await updateCommunityPost(postId, {
                isBlocked: shouldBlock,
                blockedReason: shouldBlock ? 'Blocked by admin' : null,
                blockedAt: shouldBlock ? new Date() : null
            });
            await loadCommunityPosts();

            if (selectedPost && selectedPost.id === postId) {
                setSelectedPost(prev => ({
                    ...prev,
                    isBlocked: shouldBlock
                }));
            }

            showNotification(`Post ${shouldBlock ? 'blocked' : 'unblocked'} successfully`, 'success');
        } catch (error) {
            console.error('Error updating post status:', error);
            showNotification('Failed to update post status', 'error');
        }
    };

    const handleBulkActions = async (action, postIds) => {
        try {
            setLoading(true);

            const promises = Array.from(postIds).map(postId => {
                switch (action) {
                    case 'block':
                        return updateCommunityPost(postId, { isBlocked: true });
                    case 'unblock':
                        return updateCommunityPost(postId, { isBlocked: false });
                    case 'delete':
                        return deleteCommunityPost(postId);
                    default:
                        return Promise.resolve();
                }
            });

            await Promise.all(promises);
            await loadCommunityPosts();
            setSelectedPosts(new Set());
            setIsBulkActionsOpen(false);

            showNotification(`Bulk ${action} completed successfully`, 'success');
        } catch (error) {
            console.error(`Error in bulk ${action}:`, error);
            showNotification(`Failed to perform bulk ${action}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async () => {
        try {
            const dataToExport = filteredPosts.map(post => ({
                id: post.id,
                title: post.title,
                caption: post.caption,
                authorName: post.authorName,
                authorType: post.authorType,
                team: post.team,
                status: post.status,
                isBlocked: post.isBlocked,
                likesCount: post.likesCount || 0,
                commentsCount: post.commentsCount || 0,
                shareCount: post.shareCount || 0,
                reportCount: post.reportCount || 0,
                mediaCount: post.mediaCount || 0,
                createdAt: post.createdAt?.toDate?.() || post.createdAt,
                updatedAt: post.updatedAt?.toDate?.() || post.updatedAt,
            }));

            const csvContent = convertToCSV(dataToExport);
            downloadCSV(csvContent, `community_posts_${new Date().toISOString().split('T')[0]}.csv`);

            showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            showNotification('Failed to export data', 'error');
        }
    };

    const showNotification = (message, type) => {
        // Implement your notification system here
        alert(`${type.toUpperCase()}: ${message}`);
    };

    // Filtering logic
    const filteredPosts = posts.filter(post => {
        const matchesSearch = !searchTerm || (
            (post.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (post.caption || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (post.team || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (post.authorName || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        const matchesStatus = filters.status === 'all' ||
            (filters.status === 'published' && post.status === 'published' && !post.isBlocked) ||
            (filters.status === 'blocked' && post.isBlocked) ||
            (filters.status === 'reported' && (post.reportCount || 0) > 0) ||
            (filters.status === 'draft' && post.status === 'draft');

        const matchesUserType = filters.userType === 'all' || post.authorType === filters.userType;

        const matchesMediaType = filters.mediaType === 'all' ||
            (filters.mediaType === 'video' && post.hasVideo) ||
            (filters.mediaType === 'image' && post.hasImage && !post.hasVideo) ||
            (filters.mediaType === 'text' && !post.hasVideo && !post.hasImage);

        const matchesTeam = filters.team === 'all' || post.team === filters.team;

        return matchesSearch && matchesStatus && matchesUserType && matchesMediaType && matchesTeam;
    });

    // Pagination
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = filteredPosts.slice(indexOfFirstPost, indexOfLastPost);
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

    // Helper functions
    const convertToCSV = (data) => {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];

        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
    };

    const downloadCSV = (content, filename) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && posts.length === 0) {
        return (
            <div>
                <Header title="Community Management" subtitle="Loading community posts..." />
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen ">
            <Header
                title="Community Management"
                subtitle="Manage all community posts, interactions, and content moderation"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Enhanced Statistics */}
                <CommunityStats stats={stats} />

                {/* Main Content */}
                <div className="glass rounded-2xl p-4 sm:p-6 mt-6">
                    {/* Header Controls */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Community Posts ({filteredPosts.length})
                            </h3>

                            {selectedPosts.size > 0 && (
                                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-lg">
                                    <span className="text-sm text-blue-700 font-medium">
                                        {selectedPosts.size} selected
                                    </span>
                                    <button
                                        onClick={() => setIsBulkActionsOpen(true)}
                                        className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                                    >
                                        Bulk Actions
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Search and Action Controls */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <div className="relative">
                                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search posts, authors, teams..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={loadCommunityPosts}
                                    disabled={loading}
                                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>

                                <button
                                    onClick={handleExportData}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    <span className="hidden sm:inline">Export</span>
                                </button>

                                <Button
                                    onClick={() => setIsAddPostModalOpen(true)}
                                    className="whitespace-nowrap flex items-center gap-2"
                                >
                                    <Plus size={20} />
                                    <span className="hidden sm:inline">Create Post</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Filter Controls */}
                    <FilterControls
                        filters={filters}
                        setFilters={setFilters}
                        posts={posts}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        postsPerPage={postsPerPage}
                        setPostsPerPage={setPostsPerPage}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        sortOrder={sortOrder}
                        setSortOrder={setSortOrder}
                    />

                    {/* Posts Display */}
                    {currentPosts.length > 0 ? (
                        <>
                            <PostsGrid
                                posts={currentPosts}
                                viewMode={viewMode}
                                selectedPosts={selectedPosts}
                                setSelectedPosts={setSelectedPosts}
                                onPostClick={(post) => {
                                    setSelectedPost(post);
                                    setIsPostModalOpen(true);
                                }}
                                onBlockPost={handleBlockPost}
                                onDeletePost={handleDeletePost}
                                loading={loading}
                            />

                            {/* Enhanced Pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalPosts={filteredPosts.length}
                                postsPerPage={postsPerPage}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <div className="mb-4">
                                <UploadIcon size={64} className="mx-auto text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-600 mb-2">
                                {searchTerm || Object.values(filters).some(f => f !== 'all')
                                    ? 'No Posts Match Your Filters'
                                    : 'No Community Posts Yet'}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || Object.values(filters).some(f => f !== 'all')
                                    ? "Try adjusting your search terms or filters."
                                    : "Start building your community by creating the first post."}
                            </p>
                            <div className="flex gap-3 justify-center">
                                {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setFilters({
                                                status: 'all',
                                                userType: 'all',
                                                mediaType: 'all',
                                                dateRange: 'all',
                                                team: 'all'
                                            });
                                        }}
                                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Clear Filters
                                    </button>
                                )}
                                <Button onClick={() => setIsAddPostModalOpen(true)}>
                                    <Plus size={20} className="mr-2" />
                                    Create Post
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {isPostModalOpen && selectedPost && (
                <PostDetailModal
                    isOpen={isPostModalOpen}
                    onClose={() => {
                        setIsPostModalOpen(false);
                        setSelectedPost(null);
                    }}
                    post={selectedPost}
                    onUpdate={loadCommunityPosts}
                    onDelete={() => handleDeletePost(selectedPost.id)}
                    onBlock={(shouldBlock) => handleBlockPost(selectedPost.id, shouldBlock)}
                />
            )}

            {isAddPostModalOpen && (
                <AddPostModal
                    isOpen={isAddPostModalOpen}
                    onClose={() => setIsAddPostModalOpen(false)}
                    onSubmit={loadCommunityPosts}
                    locations={locations}
                />
            )}

            {isBulkActionsOpen && (
                <BulkActions
                    isOpen={isBulkActionsOpen}
                    onClose={() => setIsBulkActionsOpen(false)}
                    selectedPosts={selectedPosts}
                    posts={posts}
                    onBulkAction={handleBulkActions}
                />
            )}
        </div>
    );
};

export default CommunityManagement;
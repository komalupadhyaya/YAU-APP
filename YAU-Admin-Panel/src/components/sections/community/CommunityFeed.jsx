// components/admin/community/CommunityFeed.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
    getCommunityPosts,
    toggleCommunityPostLike,
    addCommunityPostComment,
    getCommunityPostComments,
    getCommunityPostLikes
} from '../../../firebase/apis/api-community';
import {
    Heart,
    MessageCircle,
    Share2,
    Pin,
    MoreHorizontal,
    Image,
    Plus
} from 'lucide-react';
import EmojiPicker from '../../common/EmojiPicket';
import Button from '../../common/Button';
import { getLocations } from '../../../firebase/firestore';
import AddPostModal from './AddPostModal';

const CommunityFeed = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [userLikes, setUserLikes] = useState(new Set());
    const [commentText, setCommentText] = useState({});
    const [showComments, setShowComments] = useState(new Set());
    const [postComments, setPostComments] = useState({});
    const [page, setPage] = useState(1);
    const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
    const [locations, setLocations] = useState([]);

    // Refs for comment inputs
    const commentInputRefs = useRef({});

    useEffect(() => {
        loadInitialFeed();
        // eslint-disable-next-line
    }, []);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (window.innerHeight + document.documentElement.scrollTop
                !== document.documentElement.offsetHeight) return;

            if (!loadingMore && hasMore) {
                loadMorePosts();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);// eslint-disable-next-line
    }, [loadingMore, hasMore]);
    const handleEmojiSelect = (postId, emoji) => {
        setCommentText(prev => ({
            ...prev,
            [postId]: (prev[postId] || '') + emoji
        }));

        // Focus back to input after emoji selection
        if (commentInputRefs.current[postId]) {
            commentInputRefs.current[postId].focus();
        }
    };


    const loadInitialFeed = async () => {
        try {
            setLoading(true);
            const [feedPosts, locationsData] = await Promise.all([
                getCommunityPosts(10),
                getLocations()
            ]);
            const visiblePosts = feedPosts.filter(post =>
                // post.status === 'published' && !post.isBlocked
                post
            );
            setPosts(visiblePosts);
            loadUserLikesForPosts(visiblePosts);
            setHasMore(visiblePosts.length === 10);
            setLocations(locationsData.map(loc => loc.name));
        } catch (error) {
            console.error('Error loading feed:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMorePosts = async () => {
        try {
            setLoadingMore(true);
            const morePosts = await getCommunityPosts(10, page * 10); // Pagination
            const visiblePosts = morePosts.filter(post =>
                post.status === 'published' && !post.isBlocked
            );

            if (visiblePosts.length > 0) {
                setPosts(prev => [...prev, ...visiblePosts]);
                loadUserLikesForPosts(visiblePosts);
                setPage(prev => prev + 1);
                setHasMore(visiblePosts.length === 10);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading more posts:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    const loadUserLikesForPosts = async (postsToCheck) => {
        try {
            const allLikes = await Promise.all(
                postsToCheck.map(post => getCommunityPostLikes(post.id))
            );

            const likedPosts = new Set(userLikes);
            allLikes.forEach((postLikes, index) => {
                const userHasLiked = postLikes.some(like => like.userId === user?.id);
                if (userHasLiked) {
                    likedPosts.add(postsToCheck[index]?.id);
                }
            });

            setUserLikes(likedPosts);
        } catch (error) {
            console.error('Error loading user likes:', error);
        }
    };

    const handleLike = async (postId) => {
        try {
            // Optimistic update
            const isCurrentlyLiked = userLikes.has(postId);

            if (isCurrentlyLiked) {
                setUserLikes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(postId);
                    return newSet;
                });
            } else {
                setUserLikes(prev => new Set([...prev, postId]));
            }

            setPosts(prev => prev.map(post =>
                post.id === postId
                    ? { ...post, likesCount: post.likesCount + (isCurrentlyLiked ? -1 : 1) }
                    : post
            ));

            const result = await toggleCommunityPostLike(
                postId,
                user.id,
                'admin',
                user.name || 'Admin'
            );

            // Sync with actual result if different
            if (result.liked !== !isCurrentlyLiked) {
                if (result.liked) {
                    setUserLikes(prev => new Set([...prev, postId]));
                } else {
                    setUserLikes(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(postId);
                        return newSet;
                    });
                }
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert optimistic update
            loadUserLikesForPosts(posts.filter(p => p.id === postId));
        }
    };

    const handleComment = async (postId) => {
        const comment = commentText[postId];
        if (!comment?.trim()) return;

        try {
            await addCommunityPostComment(
                postId,
                user.id,
                'admin',
                user.name || 'Admin',
                comment
            );

            setPosts(prev => prev.map(post =>
                post.id === postId
                    ? { ...post, commentsCount: post.commentsCount + 1 }
                    : post
            ));

            setCommentText(prev => ({ ...prev, [postId]: '' }));

            if (showComments.has(postId)) {
                loadPostComments(postId);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    const loadPostComments = async (postId) => {
        try {
            const comments = await getCommunityPostComments(postId);
            setPostComments(prev => ({ ...prev, [postId]: comments }));
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    };

    const toggleComments = (postId) => {
        setShowComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
                loadPostComments(postId);
            }
            return newSet;
        });
    };

    const handleShare = async (post) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: post.title || 'Community Post',
                    text: post.caption,
                    url: `${window.location.origin}/post/${post.id}`
                });
            } else {
                await navigator.clipboard.writeText(
                    `${window.location.origin}/post/${post.id}`
                );
                // You might want to show a toast notification instead of alert
                alert('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const formatTimeAgo = (date) => {
        if (!date) return 'Unknown';
        const now = new Date();
        const postDate = date instanceof Date ? date : new Date(date);
        const diffInSeconds = Math.floor((now - postDate) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
        return postDate.toLocaleDateString();
    };
    const processText = (text) => {
        if (!text) return text;

        // This will preserve emojis naturally since they're just Unicode characters
        return text;
    };
    const PostMedia = ({ post }) => {
        if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

        return (
            <div className="relative">
                {post.mediaUrls.length === 1 ? (
                    <div className="w-full">
                        {post.mediaUrls[0].includes('.mp4') || post.hasVideo ? (
                            <div className="bg-black flex justify-center items-center" style={{ minHeight: '400px' }}>
                                <video
                                    src={post.mediaUrls[0]}
                                    controls
                                    className="max-w-full max-h-[600px] object-contain"
                                />
                            </div>
                        ) : (
                            <img
                                src={post.mediaUrls[0]}
                                alt="Post media"
                                className="w-full object-cover cursor-pointer"
                                style={{ maxHeight: '600px' }}
                            />
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-1">
                        {post.mediaUrls.slice(0, 4).map((url, index) => (
                            <div
                                key={index}
                                className="relative aspect-square overflow-hidden cursor-pointer hover:opacity-95 transition-opacity"
                            >
                                {url.includes('.mp4') ? (
                                    <video
                                        src={url}
                                        className="w-full h-full object-cover"
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={url}
                                        alt={`Media ${index + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                                {index === 3 && post.mediaUrls.length > 4 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                        <span className="text-white font-bold text-xl">
                                            +{post.mediaUrls.length - 4}
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Instagram-style Container */}
            <div className="max-w-lg mx-auto bg-white min-h-screen">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-3">
                            <h1 className="font-bold text-xl text-gray-800">Community Feed</h1>
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

                {/* Posts Feed */}
                <div className="pb-6">
                    {posts.map((post, index) => (
                        <div key={post.id} className="border-b border-gray-100 bg-white">
                            {/* Post Header */}
                            <div className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {(post.authorName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-gray-800">
                                                {post.authorName}
                                            </span>
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${post.authorType === 'admin' ? 'bg-red-100 text-red-700' :
                                                post.authorType === 'coach' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {post.authorType}
                                            </span>
                                            {post.isPinned && (
                                                <Pin size={12} className="text-yellow-500 fill-current" />
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {formatTimeAgo(post.createdAt)}
                                            {post.location && ` • ${post.location}`}
                                            {post.team && ` • ${post.team}`}
                                        </div>
                                    </div>
                                </div>
                                <MoreHorizontal size={20} className="text-gray-400 cursor-pointer hover:text-gray-600" />
                            </div>

                            {/* Post Media */}
                            <PostMedia post={post} />

                            {/* Action Buttons */}
                            <div className="px-4 pt-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => handleLike(post.id)}
                                            className={`transition-all duration-200 ${userLikes.has(post.id) ? 'text-red-500 scale-110' : 'text-gray-700 hover:text-red-500'
                                                }`}
                                        >
                                            <Heart
                                                size={24}
                                                fill={userLikes.has(post.id) ? 'currentColor' : 'none'}
                                                className="transition-all duration-200"
                                            />
                                        </button>

                                        <button
                                            onClick={() => toggleComments(post.id)}
                                            className="text-gray-700 hover:text-blue-500 transition-colors"
                                        >
                                            <MessageCircle size={24} />
                                        </button>

                                        <button
                                            onClick={() => handleShare(post)}
                                            className="text-gray-700 hover:text-green-500 transition-colors"
                                        >
                                            <Share2 size={24} />
                                        </button>
                                    </div>

                                </div>

                                {/* Likes Count */}
                                {post.likesCount > 0 && (
                                    <div className="font-semibold text-sm text-gray-800 mb-1">
                                        {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                                    </div>
                                )}

                                {/* Caption with Emoji Support */}
                                <div className="mb-2">
                                    {post.title && (
                                        <h3 className="font-semibold text-gray-800 mb-1">
                                            {processText(post.title)}
                                        </h3>
                                    )}
                                    {post.caption && (
                                        <div className="text-sm text-gray-800">
                                            <span className="font-semibold mr-2">{post.authorName}</span>
                                            <span>{processText(post.caption)}</span>
                                        </div>
                                    )}
                                </div>


                                {/* View Comments */}
                                {post.commentsCount > 0 && !showComments.has(post.id) && (
                                    <button
                                        onClick={() => toggleComments(post.id)}
                                        className="text-sm text-gray-500 mb-2 hover:text-gray-700"
                                    >
                                        View all {post.commentsCount} comments
                                    </button>
                                )}

                                {/* Comments */}
                                {showComments.has(post.id) && (
                                    <div className="space-y-2 mb-3">
                                        {postComments[post.id]?.map((comment) => (
                                            <div key={comment.id} className="text-sm">
                                                <span className="font-semibold mr-2">{comment.userName}</span>
                                                <span className="text-gray-800">{comment.comment}</span>
                                                <span className="text-gray-500 text-xs ml-2">
                                                    {formatTimeAgo(comment.createdAt)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Time stamp */}
                                <div className="text-xs text-gray-500 mb-3">
                                    {formatTimeAgo(post.createdAt)}
                                </div>
                            </div>

                            {/* Add Comment with Emoji Picker */}
                            <div className="border-t border-gray-100 px-4 py-2">
                                <div className="flex items-center gap-3">
                                    <EmojiPicker
                                        onEmojiSelect={(emoji) => handleEmojiSelect(post.id, emoji)}
                                    />
                                    <input
                                        ref={(el) => commentInputRefs.current[post.id] = el}
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={commentText[post.id] || ''}
                                        onChange={(e) => setCommentText(prev => ({
                                            ...prev,
                                            [post.id]: e.target.value
                                        }))}
                                        onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                                        className="flex-1 text-sm bg-transparent outline-none placeholder-gray-500"
                                        style={{ fontSize: '14px' }} // Ensures proper emoji rendering
                                    />
                                    {commentText[post.id]?.trim() && (
                                        <button
                                            onClick={() => handleComment(post.id)}
                                            className="text-blue-500 font-semibold text-sm hover:text-blue-600"
                                        >
                                            Post
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}



                    {/* Loading More */}
                    {loadingMore && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    )}

                    {/* End of Feed */}
                    {!hasMore && posts.length > 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">You've seen all posts!</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {posts.length === 0 && (
                        <div className="text-center py-16 px-8">
                            <Image size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No Posts Yet</h3>
                            <p className="text-sm text-gray-500">
                                The community feed will show published posts here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            {isAddPostModalOpen && (
                <AddPostModal
                    isOpen={isAddPostModalOpen}
                    onClose={() => setIsAddPostModalOpen(false)}
                    onSubmit={loadInitialFeed}
                    locations={locations}
                />
            )}
        </div>
    );
};

export default CommunityFeed;
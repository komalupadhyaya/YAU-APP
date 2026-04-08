// components/admin/community/BulkActions.js
import React, { useState } from 'react';
import Modal from '../../common/Modal';
import {
    CheckSquare,
    Eye,
    EyeOff,
    Trash2,
    Download,
    AlertTriangle,
    BarChart3
} from 'lucide-react';

const BulkActions = ({ isOpen, onClose, selectedPosts, posts, onBulkAction }) => {
    const [selectedAction, setSelectedAction] = useState('');
    const [confirmAction, setConfirmAction] = useState(false);
    const [loading, setLoading] = useState(false);

    const selectedPostsData = posts.filter(post => selectedPosts.has(post.id));

    const actions = [
        {
            id: 'block',
            label: 'Block Posts',
            icon: EyeOff,
            color: 'yellow',
            description: 'Hide selected posts from public view',
            warning: 'This will make the posts invisible to users'
        },
        {
            id: 'unblock',
            label: 'Unblock Posts',
            icon: Eye,
            color: 'green',
            description: 'Make selected posts visible again',
            warning: null
        },
        {
            id: 'delete',
            label: 'Delete Posts',
            icon: Trash2,
            color: 'red',
            description: 'Permanently remove selected posts',
            warning: 'This action cannot be undone!'
        },
        {
            id: 'export',
            label: 'Export Data',
            icon: Download,
            color: 'blue',
            description: 'Download selected posts data as CSV',
            warning: null
        }
    ];

    const handleAction = async () => {
        if (!selectedAction) return;

        try {
            setLoading(true);

            if (selectedAction === 'export') {
                await handleExport();
            } else {
                await onBulkAction(selectedAction, selectedPosts);
            }

            onClose();
        } catch (error) {
            console.error('Bulk action error:', error);
            alert('Failed to perform bulk action');
        } finally {
            setLoading(false);
            setConfirmAction(false);
        }
    };

    const handleExport = async () => {
        const dataToExport = selectedPostsData.map(post => ({
            id: post.id,
            title: post.title || '',
            caption: post.caption || '',
            authorName: post.authorName || '',
            authorType: post.authorType || '',
            team: post.team || '',
            status: post.status || '',
            isBlocked: post.isBlocked || false,
            likesCount: post.likesCount || 0,
            commentsCount: post.commentsCount || 0,
            shareCount: post.shareCount || 0,
            reportCount: post.reportCount || 0,
            mediaCount: post.mediaCount || 0,
            createdAt: post.createdAt?.toDate?.() || post.createdAt || '',
            updatedAt: post.updatedAt?.toDate?.() || post.updatedAt || '',
        }));

        const csvContent = convertToCSV(dataToExport);
        downloadCSV(csvContent, `bulk_posts_export_${new Date().toISOString().split('T')[0]}.csv`);
    };

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

    const getActionColor = (color) => {
        const colors = {
            yellow: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
            green: 'bg-green-50 border-green-200 hover:bg-green-100',
            red: 'bg-red-50 border-red-200 hover:bg-red-100',
            blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
        };
        return colors[color] || colors.blue;
    };

    const getIconColor = (color) => {
        const colors = {
            yellow: 'text-yellow-600',
            green: 'text-green-600',
            red: 'text-red-600',
            blue: 'text-blue-600'
        };
        return colors[color] || colors.blue;
    };

    const selectedActionData = actions.find(action => action.id === selectedAction);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Bulk Actions"
            size="lg"
        >
            <div className="space-y-6">
                {/* Selection Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                        <CheckSquare size={20} />
                        Selected Posts Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div>
                            <div className="font-medium text-blue-700">Total Selected</div>
                            <div className="text-2xl font-bold text-blue-800">{selectedPosts.size}</div>
                        </div>
                        <div>
                            <div className="font-medium text-green-700">Published</div>
                            <div className="text-2xl font-bold text-green-800">
                                {selectedPostsData.filter(p => p.status === 'published' && !p.isBlocked).length}
                            </div>
                        </div>
                        <div>
                            <div className="font-medium text-red-700">Blocked</div>
                            <div className="text-2xl font-bold text-red-800">
                                {selectedPostsData.filter(p => p.isBlocked).length}
                            </div>
                        </div>
                        <div>
                            <div className="font-medium text-yellow-700">Reported</div>
                            <div className="text-2xl font-bold text-yellow-800">
                                {selectedPostsData.filter(p => (p.reportCount || 0) > 0).length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Post Statistics */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} />
                        Quick Stats
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white rounded p-2 text-center">
                            <div className="font-bold text-purple-600">
                                {selectedPostsData.reduce((sum, p) => sum + (p.likesCount || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-gray-600">Total Likes</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                            <div className="font-bold text-blue-600">
                                {selectedPostsData.reduce((sum, p) => sum + (p.commentsCount || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-gray-600">Total Comments</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                            <div className="font-bold text-green-600">
                                {selectedPostsData.reduce((sum, p) => sum + (p.shareCount || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-gray-600">Total Shares</div>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                            <div className="font-bold text-orange-600">
                                {selectedPostsData.reduce((sum, p) => sum + (p.mediaCount || 0), 0).toLocaleString()}
                            </div>
                            <div className="text-gray-600">Media Files</div>
                        </div>
                    </div>
                </div>

                {/* Action Selection */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-gray-800">Choose Action</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {actions.map(action => {
                            const Icon = action.icon;
                            const isSelected = selectedAction === action.id;
                            
                            return (
                                <button
                                    key={action.id}
                                    onClick={() => setSelectedAction(action.id)}
                                    className={`p-4 border rounded-lg text-left transition-all ${
                                        isSelected
                                            ? `${getActionColor(action.color)} border-2`
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon size={20} className={isSelected ? getIconColor(action.color) : 'text-gray-600'} />
                                        <span className={`font-medium ${isSelected ? getIconColor(action.color) : 'text-gray-800'}`}>
                                            {action.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600">{action.description}</p>
                                    {action.warning && (
                                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            {action.warning}
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Posts Preview */}
                <div className="space-y-3">
                    <h4 className="font-medium text-gray-700">Selected Posts Preview</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3 bg-gray-50">
                        {selectedPostsData.slice(0, 10).map(post => (
                            <div key={post.id} className="flex items-center gap-3 p-2 bg-white rounded border">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {(post.authorName || 'U').charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-800 truncate">
                                        {post.title || 'No title'}
                                    </div>
                                    <div className="text-xs text-gray-600 truncate">
                                        {post.caption || 'No caption'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {post.isBlocked && <span className="text-red-600">BLOCKED</span>}
                                    {(post.reportCount || 0) > 0 && <span className="text-yellow-600">REPORTED</span>}
                                    <span>{post.status?.toUpperCase()}</span>
                                </div>
                            </div>
                        ))}
                        {selectedPostsData.length > 10 && (
                            <div className="text-center text-sm text-gray-500 py-2">
                                ... and {selectedPostsData.length - 10} more posts
                            </div>
                        )}
                    </div>
                </div>

                {/* Confirmation Step */}
                {selectedAction && selectedActionData?.warning && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={confirmAction}
                                onChange={(e) => setConfirmAction(e.target.checked)}
                                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                            />
                            <span className="text-sm text-yellow-800">
                                I understand this action and want to proceed
                            </span>
                        </label>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                
                <button
                    onClick={handleAction}
                    disabled={!selectedAction || loading || (selectedActionData?.warning && !confirmAction)}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedActionData?.color === 'red'
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : selectedActionData?.color === 'yellow'
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : selectedActionData?.color === 'green'
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                        </div>
                    ) : (
                        selectedActionData?.label || 'Execute Action'
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default BulkActions;
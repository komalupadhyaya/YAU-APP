// components/admin/community/Pagination.js
import React from 'react';
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    MoreHorizontal
} from 'lucide-react';

const Pagination = ({
    currentPage,
    totalPages,
    totalPosts,
    postsPerPage,
    onPageChange
}) => {
    const indexOfFirstPost = (currentPage - 1) * postsPerPage + 1;
    const indexOfLastPost = Math.min(currentPage * postsPerPage, totalPosts);

    const generatePageNumbers = () => {
        const pages = [];
        const showPages = 5; // Number of page buttons to show
        
        if (totalPages <= showPages) {
            // Show all pages
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Show first page
            pages.push(1);
            
            let startPage, endPage;
            if (currentPage <= 3) {
                startPage = 2;
                endPage = showPages - 1;
            } else if (currentPage >= totalPages - 2) {
                startPage = totalPages - showPages + 2;
                endPage = totalPages - 1;
            } else {
                startPage = currentPage - 1;
                endPage = currentPage + 1;
            }
            
            // Add ellipsis after first page if needed
            if (startPage > 2) {
                pages.push('ellipsis-1');
            }
            
            // Add middle pages
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            // Add ellipsis before last page if needed
            if (endPage < totalPages - 1) {
                pages.push('ellipsis-2');
            }
            
            // Show last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    const pageNumbers = generatePageNumbers();

    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 px-4 py-6 bg-gray-50 rounded-xl">
            {/* Results Info */}
            <div className="text-sm text-gray-600 order-2 sm:order-1">
                Showing{' '}
                <span className="font-medium text-gray-900">
                    {indexOfFirstPost.toLocaleString()}
                </span>
                {' '}-{' '}
                <span className="font-medium text-gray-900">
                    {indexOfLastPost.toLocaleString()}
                </span>
                {' '}of{' '}
                <span className="font-medium text-gray-900">
                    {totalPosts.toLocaleString()}
                </span>
                {' '}posts
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 order-1 sm:order-2">
                {/* First Page Button */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="First Page"
                    aria-label="Go to first page"
                >
                    <ChevronsLeft size={16} />
                </button>

                {/* Previous Page Button */}
                <button
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Previous Page"
                    aria-label="Go to previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                    {pageNumbers.map((page, index) => {
                        if (typeof page === 'string' && page.startsWith('ellipsis')) {
                            return (
                                <span
                                    key={page}
                                    className="px-3 py-2 text-gray-400"
                                    aria-hidden="true"
                                >
                                    <MoreHorizontal size={16} />
                                </span>
                            );
                        }

                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    page === currentPage
                                        ? 'bg-primary-500 text-white shadow-md transform scale-105'
                                        : 'border border-gray-200 hover:bg-gray-50 text-gray-700 hover:border-gray-300'
                                }`}
                                aria-label={`Go to page ${page}`}
                                aria-current={page === currentPage ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Page Button */}
                <button
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Next Page"
                    aria-label="Go to next page"
                >
                    <ChevronRight size={16} />
                </button>

                {/* Last Page Button */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    title="Last Page"
                    aria-label="Go to last page"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>

            {/* Quick Jump (Mobile Hidden) */}
            <div className="hidden lg:flex items-center gap-2 order-3 text-sm">
                <label htmlFor="page-jump" className="text-gray-600">
                    Go to:
                </label>
                <input
                    id="page-jump"
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= totalPages) {
                            onPageChange(page);
                        }
                    }}
                    className="w-16 px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-500">of {totalPages}</span>
            </div>
        </div>
    );
};

export default Pagination;
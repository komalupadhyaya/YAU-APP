import React, { useState, useEffect } from 'react';
import { ResourcesService } from '../../services/apiService';

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [previewResource, setPreviewResource] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setLoading(true);
        const response = await ResourcesService.getAll();
        const resourcesData = response.data || response;

        // Map Firebase resources structure to component format
        const formattedResources = resourcesData.map(resource => ({
          id: resource.id,
          title: resource.name || resource.title,
          description: resource.description,
          category: inferCategory(resource.name, resource.description),
          type: getFileType(resource.link),
          fileSize: resource.fileSize || 'Unknown',
          downloadUrl: resource.link,
          uploadDate: resource.updatedAt || resource.createdAt,
          tags: generateTags(resource.name, resource.description),
          logo: resource.logo,
          email: resource.email,
          phone: resource.phone,
          isFeatured: resource.isFeatured || false
        }));

        setResources(formattedResources);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching resources:', error);
        setResources([]);
        setLoading(false);
      }
    };

    fetchResources();
  }, []);

  const inferCategory = (name, description) => {
    const text = `${name} ${description}`.toLowerCase();
    if (text.includes('handbook') || text.includes('guide') || text.includes('manual')) return 'handbook';
    if (text.includes('training') || text.includes('skills') || text.includes('coach')) return 'training';
    if (text.includes('safety') || text.includes('first aid') || text.includes('emergency')) return 'safety';
    if (text.includes('form') || text.includes('registration') || text.includes('waiver')) return 'forms';
    if (text.includes('equipment') || text.includes('gear') || text.includes('maintenance')) return 'equipment';
    if (text.includes('health') || text.includes('nutrition') || text.includes('fitness')) return 'health';
    return 'general';
  };

  const getFileType = (link) => {
    if (!link) return 'link';
    const url = link.toLowerCase();
    if (url.includes('.pdf')) return 'pdf';
    if (url.includes('.mp4') || url.includes('.avi') || url.includes('video')) return 'video';
    if (url.includes('.zip') || url.includes('.rar')) return 'zip';
    if (url.includes('.doc') || url.includes('.docx')) return 'doc';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.gif')) return 'image';
    return 'link';
  };

  const generateTags = (name, description) => {
    const text = `${name} ${description}`.toLowerCase();
    const tags = [];

    // Common tags based on content
    if (text.includes('youth') || text.includes('young')) tags.push('youth');
    if (text.includes('athlete') || text.includes('sports')) tags.push('athletics');
    if (text.includes('parent') || text.includes('family')) tags.push('family');
    if (text.includes('coach') || text.includes('training')) tags.push('coaching');
    if (text.includes('registration') || text.includes('signup')) tags.push('registration');
    if (text.includes('safety') || text.includes('health')) tags.push('safety');
    if (text.includes('equipment') || text.includes('gear')) tags.push('equipment');

    return tags.slice(0, 5); // Limit to 5 tags
  };

  const categories = ['all', 'general', 'handbook', 'training', 'safety', 'forms', 'equipment', 'health'];

  const filteredResources = resources.filter(resource => {
    const matchesCategory = category === 'all' || resource.category === category;
    const matchesSearch = searchTerm === '' ||
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (cat) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      handbook: 'bg-blue-100 text-blue-800',
      training: 'bg-orange-100 text-orange-800',
      safety: 'bg-red-100 text-red-800',
      forms: 'bg-green-100 text-green-800',
      equipment: 'bg-purple-100 text-purple-800',
      health: 'bg-pink-100 text-pink-800'
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  const getFileIcon = (type) => {
    const icons = {
      pdf: '📄',
      video: '🎥',
      zip: '📦',
      doc: '📝',
      image: '🖼️',
      link: '🔗'
    };
    return icons[type] || '📁';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded w-full mb-4"></div>
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resources</h1>
        {/* <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Upload Resource
        </button> */}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Category Filter */}
      <div className=" hidden flex flex-wrap gap-2 mb-6 ">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${category === cat
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {cat === 'all' ? 'All Resources' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map(resource => (
          <div key={resource.id} className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow">
            {/* Resource Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getFileIcon(resource.type)}</span>
                <div className="flex flex-col gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${getCategoryColor(resource.category)}`}>
                    {resource.category}
                  </span>
                  {/* <span className="text-xs text-gray-500 uppercase">
                    {resource.type} • {resource.fileSize}
                  </span> */}
                </div>
              </div>
            </div>
            {resource.logo && (
              <img
                src={resource.logo}
                alt={`${resource.title} logo`}
                className="w-16 h-16 object-contain mb-4 rounded-lg"
              />
            )}

            {/* Resource Details */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
            <p className="text-gray-700 text-sm mb-4 leading-relaxed line-clamp-3">
              {resource.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-4">
              {resource.tags.slice(0, 3).map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                  {tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-gray-400 text-xs px-2 py-1">
                  +{resource.tags.length - 3} more
                </span>
              )}
            </div>

            {/* Upload Date */}
            <div className="text-xs text-gray-500 mb-4">
              Updated: {formatDate(resource.uploadDate)}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a href={resource.downloadUrl} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Visit</a>
              <button
              onClick={() => {
                setPreviewResource(resource);
                setIsModalOpen(true);
              }}
               className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No resources found</div>
          <div className="text-gray-400 text-sm">
            {searchTerm ? 'Try adjusting your search terms' : 'No resources available in this category'}
          </div>
        </div>
      )}

      {/* Resource Summary */}
      {filteredResources.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Library Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{resources.length}</div>
              <div className="text-gray-600">Total Resources</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {resources.filter(r => r.category === 'handbook').length}
              </div>
              <div className="text-gray-600">Handbooks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {resources.filter(r => r.category === 'training').length}
              </div>
              <div className="text-gray-600">Training Materials</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {resources.filter(r => r.category === 'forms').length}
              </div>
              <div className="text-gray-600">Forms & Documents</div>
            </div>
          </div>
        </div>
      )}


      {isModalOpen && previewResource && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
    <div className="bg-white max-w-2xl w-full rounded-2xl p-6 relative shadow-lg overflow-y-auto max-h-[90vh]">
      
      {/* Close Button */}
      <button
        onClick={() => {
          setIsModalOpen(false);
          setPreviewResource(null);
        }}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
      >
        &times;
      </button>

      {/* Modal Content */}
      <div className="space-y-4">
        {/* Logo */}
        {previewResource.logo && (
          <div className="flex justify-center mb-4">
            <img
              src={previewResource.logo}
              alt="Resource Logo"
              className="w-24 h-24 object-contain rounded-lg"
            />
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800">{previewResource.title}</h2>

        {/* Category + Type + Size */}
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(previewResource.category)}`}>
            {previewResource.category}
          </span>
          <span className="bg-gray-100 px-2 py-1 rounded">Type: {previewResource.type}</span>
          <span className="bg-gray-100 px-2 py-1 rounded">Size: {previewResource.fileSize}</span>
        </div>

        {/* Description */}
        <p className="text-gray-700 whitespace-pre-line">{previewResource.description}</p>

        {/* Tags */}
        {previewResource.tags && previewResource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {previewResource.tags.map((tag, index) => (
              <span key={index} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Upload Date */}
        <div className="text-xs text-gray-500">
          Uploaded: {formatDate(previewResource.uploadDate)}
        </div>

        {/* Contact Info */}
        {(previewResource.email || previewResource.phone) && (
          <div className="mt-4 space-y-1 text-sm text-gray-700">
            {previewResource.email && <div><strong>Email:</strong> {previewResource.email}</div>}
            {previewResource.phone && <div><strong>Phone:</strong> {previewResource.phone}</div>}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <a
            href={previewResource.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Visit Resource
          </a>
          <button
            onClick={() => {
              setIsModalOpen(false);
              setPreviewResource(null);
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

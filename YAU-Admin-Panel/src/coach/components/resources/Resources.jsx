// coach/components/resources/Resources.jsx
import React from 'react';
import { BookOpen, ExternalLink, Video, FileText, Users, Award, Clipboard } from 'lucide-react';

const Resources = () => {
  const resourceCategories = [
    {
      title: 'Coaching Courses',
      icon: BookOpen,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      items: [
        {
          title: 'Youth Sports Fundamentals',
          description: 'Essential coaching techniques for young athletes',
          type: 'course',
          url: 'https://mainsite.com/courses/youth-fundamentals',
          duration: '2 hours'
        },
        {
          title: 'Age-Appropriate Training',
          description: 'Training methods by age group',
          type: 'course',
          url: 'https://mainsite.com/courses/age-training',
          duration: '1.5 hours'
        }
      ]
    },
    {
      title: 'Practice Planning',
      icon: Clipboard,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      items: [
        {
          title: 'Practice Plan Templates',
          description: 'Ready-to-use practice session templates',
          type: 'template',
          url: 'https://mainsite.com/resources/practice-templates',
          download: true
        },
        {
          title: 'Drill Library',
          description: 'Age-specific drills and exercises',
          type: 'library',
          url: 'https://mainsite.com/resources/drills',
          count: '200+ drills'
        }
      ]
    },
    {
      title: 'Safety & Guidelines',
      icon: Award,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      items: [
        {
          title: 'Youth Safety Protocols',
          description: 'Essential safety guidelines for youth sports',
          type: 'guide',
          url: 'https://mainsite.com/resources/safety',
          required: true
        },
        {
          title: 'Emergency Procedures',
          description: 'What to do in case of injuries',
          type: 'guide',
          url: 'https://mainsite.com/resources/emergency',
          required: true
        }
      ]
    },
    {
      title: 'Communication Tools',
      icon: Users,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      items: [
        {
          title: 'Parent Communication Guide',
          description: 'Best practices for parent-coach communication',
          type: 'guide',
          url: 'https://mainsite.com/resources/communication',
          pages: '12 pages'
        },
        {
          title: 'Team Meeting Templates',
          description: 'Templates for team and parent meetings',
          type: 'template',
          url: 'https://mainsite.com/resources/meeting-templates',
          download: true
        }
      ]
    }
  ];

  const quickLinks = [
    {
      title: 'Main YAU Website',
      description: 'Visit our main website for more resources',
      icon: ExternalLink,
      url: 'https://mainsite.com',
      color: 'text-blue-600'
    },
    {
      title: 'Coach Certification',
      description: 'Get certified as a youth sports coach',
      icon: Award,
      url: 'https://mainsite.com/certification',
      color: 'text-green-600'
    },
    {
      title: 'Training Videos',
      description: 'Watch coaching technique videos',
      icon: Video,
      url: 'https://mainsite.com/videos',
      color: 'text-red-600'
    },
    {
      title: 'Coach Handbook',
      description: 'Complete guide for youth sports coaches',
      icon: FileText,
      url: 'https://mainsite.com/handbook',
      color: 'text-purple-600'
    }
  ];

  const handleResourceClick = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Coach Resources</h2>
          <p className="text-gray-600 mt-1">Training materials and tools to help you become a better coach</p>
        </div>
        <button
          onClick={() => handleResourceClick('https://mainsite.com')}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink size={16} />
          <span>Visit Main Site</span>
        </button>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, index) => {
            const Icon = link.icon;
            return (
              <button
                key={index}
                onClick={() => handleResourceClick(link.url)}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Icon size={20} className={link.color} />
                  <h4 className="font-medium text-gray-800">{link.title}</h4>
                </div>
                <p className="text-sm text-gray-600">{link.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resource Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {resourceCategories.map((category, categoryIndex) => {
          const CategoryIcon = category.icon;
          return (
            <div key={categoryIndex} className={`rounded-xl border-2 ${category.borderColor} ${category.bgColor} p-6`}>
              <div className="flex items-center space-x-3 mb-4">
                <div className={`p-2 rounded-lg bg-white border ${category.borderColor}`}>
                  <CategoryIcon size={24} className={category.iconColor} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">{category.title}</h3>
              </div>

              <div className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    onClick={() => handleResourceClick(item.url)}
                    className="bg-white rounded-lg p-4 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-800">{item.title}</h4>
                          {item.required && (
                            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                              Required
                            </span>
                          )}
                          {item.download && (
                            <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">
                              Download
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {item.duration && (
                            <span>📚 {item.duration}</span>
                          )}
                          {item.pages && (
                            <span>📄 {item.pages}</span>
                          )}
                          {item.count && (
                            <span>🎯 {item.count}</span>
                          )}
                          <span className="capitalize">{item.type}</span>
                        </div>
                      </div>
                      
                      <ExternalLink size={16} className="text-gray-400 ml-3 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help & Support */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="mr-2 text-blue-600" size={20} />
          Need Help?
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Contact Support</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>📧 Email: coaches@yauapp.com</p>
              <p>📞 Phone: (555) 123-4567</p>
              <p>💬 Live Chat: Available on main website</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Coach Community</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleResourceClick('https://mainsite.com/community')}
                className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                🏟️ Coach Forum - Share tips and experiences
              </button>
              <button
                onClick={() => handleResourceClick('https://mainsite.com/mentorship')}
                className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                👥 Mentorship Program - Connect with experienced coaches
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Updates */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Updates</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-sm font-medium text-green-800">New Safety Guidelines Available</p>
              <p className="text-xs text-green-600">Updated protocols for youth sports safety - review required</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-sm font-medium text-blue-800">Practice Plan Templates Updated</p>
              <p className="text-xs text-blue-600">New seasonal templates added to the library</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <p className="text-sm font-medium text-purple-800">Coach Certification Program</p>
              <p className="text-xs text-purple-600">Enroll in our new advanced coaching certification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
import React from 'react';
import { useState } from 'react';

const SupportPage = () => {
  const [emailCopied, setEmailCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const handleEmailClick = () => {
    window.location.href = 'mailto:Fun@YAUSports.org';
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:301-292-3688';
  };

  const copyToClipboard = (text, setCopied) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg overflow-hidden md:max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-8">
          <h1 className="text-2xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Support
          </h1>
          <p className="mt-2 text-blue-100">We're here to help you with any questions or issues</p>
        </div>

        <div className="p-6">
          {/* Contact Card */}
          <div className="bg-white py-6 px-6 rounded-xl shadow-md border border-gray-100">
            <div className="flex items-center mb-6">
              <div className="bg-blue-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-800">Contact Information</h2>
                <p className="text-gray-600">Reach out to our support team</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Email */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                <div className="flex items-center mb-3 sm:mb-0">
                  <div className="flex-shrink-0 bg-white p-2 rounded-md shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Email</p>
                    <a href="mailto:Fun@YAUSports.org" className="text-blue-600 font-medium">Fun@YAUSports.org</a>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => copyToClipboard('Fun@YAUSports.org', setEmailCopied)}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    {emailCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button 
                    onClick={handleEmailClick}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200">
                <div className="flex items-center mb-3 sm:mb-0">
                  <div className="flex-shrink-0 bg-white p-2 rounded-md shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">Phone</p>
                    <a href="tel:301-292-3688" className="text-green-600 font-medium">301-292-3688</a>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => copyToClipboard('301-292-3688', setPhoneCopied)}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    {phoneCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button 
                    onClick={handlePhoneClick}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="font-medium text-gray-800">How do I reset my password?</h3>
                <p className="text-gray-600 text-sm mt-1">Go to the login page and click "Forgot Password" to reset via email.</p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="font-medium text-gray-800">What are your operating hours?</h3>
                <p className="text-gray-600 text-sm mt-1">Our support team is available Monday-Friday, 9AM-5PM EST.</p>
              </div>
              
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <h3 className="font-medium text-gray-800">How do I update my payment method?</h3>
                <p className="text-gray-600 text-sm mt-1">You can update your payment information in the Billing section of your account.</p>
              </div>
            </div>
          </div>

          {/* Additional Support Options */}
          {/* <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Other Ways to Get Help
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">Help Center</h3>
                <p className="text-gray-600 text-sm">Browse our knowledge base for tutorials and guides.</p>
                <button className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-800">
                  Visit Help Center →
                </button>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-800 mb-2">Community Forum</h3>
                <p className="text-gray-600 text-sm">Get help from other community members.</p>
                <button className="mt-3 text-sm text-indigo-600 font-medium hover:text-indigo-800">
                  Join the Discussion →
                </button>
              </div>
            </div>
          </div> */}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm pb-6">
          <p>© {new Date().getFullYear()} YAU Sports. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
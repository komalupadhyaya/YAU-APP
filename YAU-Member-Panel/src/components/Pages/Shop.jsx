import React from 'react'
import { useNavigate } from 'react-router-dom';
import { FaTshirt, FaShoppingBag, FaHatCowboy, FaMedal } from 'react-icons/fa';

const shopItems = [
  {
    id: 1,
    name: 'YAU Practice Jersey',
    description: 'Official YAU practice jersey - breathable performance fabric',
    price: 35,
    icon: <FaTshirt className="text-4xl" />,
    comingSoon: false
  },
  {
    id: 2,
    name: 'YAU Game Shorts',
    description: 'Official YAU game shorts - comfortable and durable',
    price: 25,
    icon: <FaShoppingBag className="text-4xl" />,
    comingSoon: false
  },
  {
    id: 3,
    name: 'YAU Training Bag',
    description: 'Large capacity training bag with YAU logo',
    price: 45,
    icon: <FaShoppingBag className="text-4xl" />,
    comingSoon: true
  },
  {
    id: 4,
    name: 'YAU Cap',
    description: 'Official YAU baseball cap',
    price: 20,
    icon: <FaHatCowboy className="text-4xl" />,
    comingSoon: true
  },
  {
    id: 5,
    name: 'YAU Medal',
    description: 'Commemorative YAU participation medal',
    price: 15,
    icon: <FaMedal className="text-4xl" />,
    comingSoon: true
  },
];

export default function Shop() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">YAU Shop</h1>
        <p className="text-gray-600">Official YAU merchandise and apparel</p>
      </div>

      <div className="bg-blue-600 text-white rounded-lg p-6 mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Buy Uniforms</h2>
        <p className="mb-4">Order official YAU uniforms for your child</p>
        <button
          onClick={() => navigate('/uniform')}
          className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
        >
          Buy Uniform
        </button>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Merchandise</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shopItems.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-lg shadow-md p-6 border-2 ${item.comingSoon ? 'border-gray-200 opacity-75' : 'border-yellow-400'}`}
          >
            <div className="text-blue-600 mb-4 flex justify-center">
              {item.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">${item.price}</span>
              {item.comingSoon ? (
                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">Coming Soon</span>
              ) : (
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                  Coming Soon
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

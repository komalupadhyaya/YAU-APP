// PaymentPlanSelector.jsx
import { memo } from "react";
import { FaMoneyBillWave, FaCheckCircle } from "react-icons/fa";
import BackgroundSlideshow from "./BackgroundSlideshow";

import image1 from "../../../assets/image_1.jpeg";
import image2 from "../../../assets/image_2.jpeg";
import image3 from "../../../assets/image_3.jpeg";
import image4 from "../../../assets/image_4.jpeg";
import image5 from "../../../assets/image_5.jpeg";
import image6 from "../../../assets/image_6.jpeg";
import image7 from "../../../assets/image_7.jpeg";
import image8 from "../../../assets/image_8.jpeg";
import image9 from "../../../assets/image_9.jpeg";

const images = [
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
  image7,
  image8,
  image9,
];

const PaymentPlanSelector = memo(({ plan, setPlan, childrenCount = 1, inFormAddStudent = false }) => {
  // Calculate pricing based on children count
  const calculatePrice = (basePrice, children) => {
    if (children <= 1) return basePrice;
    if (children === 2) return basePrice * 2; // 2 children = 2x price
    // Family discount for 3+ children
    return Math.floor(basePrice * children * 0.85); // 15% discount for 3+ children
  };

  const monthlyBasePrice = 50; // $50 per child per month
  const oneTimeBasePrice = 200; // $200 per child one-time

  const monthlyTotal = calculatePrice(monthlyBasePrice, childrenCount);
  const oneTimeTotal = calculatePrice(oneTimeBasePrice, childrenCount);
  console.log("inFormAddStudent",inFormAddStudent)
  return (
    <div className="relative mb-8">
      <div className=" text-right px-1 align-baseline ">
        {inFormAddStudent !== true && (
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            Sign In
          </a>
        </p>
        )}

      </div>

      <div className="relative mb-6 sm:mb-8 rounded-xl overflow-hidden text-white">
        {/* Background Slideshow */}
        <BackgroundSlideshow images={images} interval={4000} />

        {/* Content Overlay */}
        <div className="relative z-8 p-6 sm:p-10 flex flex-col items-start text-center">
          <h1 className="text-3xl sm:text-3xl font-bold mb-2">YAU</h1>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Choose Your Plan</h2> 
          { inFormAddStudent !== true && (<h2 className="text-2xl sm:text-3xl font-bold mb-2">For Your Child</h2>)}
          
          <p className="text-sm sm:text-base mb-6 text-left">
            Please select only one of our family-oriented athlete membership options.
          </p>
        </div>
      </div>

      {/* Pricing Info for Multiple Children */}
      {childrenCount > 1 && (
        <div className="mb-4 mx-auto max-w-lg bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h3 className="font-semibold text-blue-800 mb-2 text-center">
            Pricing for {childrenCount} Students
          </h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p className="text-center">Base: ${monthlyBasePrice}/month or ${oneTimeBasePrice} one-time per student</p>
            {childrenCount >= 3 && (
              <p className="font-medium text-green-700 text-center">
                3+ students: 15% family discount applied!
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="sm:absolute -bottom-10 left-0 w-full">
        <div className="flex flex-wrap gap-6 justify-center z-12">
          {/* Monthly Plan */}
          <label
            onClick={() => setPlan("monthly")}
            className={`relative w-72 cursor-pointer rounded-xl border p-5 shadow-md transition-all 
              ${plan === "monthly"
                ? "bg-blue-600 text-white border-blue-700 shadow-lg scale-[1.02]"
                : "bg-blue-50 text-gray-700 border-gray-200 hover:bg-blue-100"
              }`}
          >
            {/* Hidden radio (real input for accessibility & form) */}
            <input
              type="radio"
              name="plan"
              value="monthly"
              checked={plan === "monthly"}
              onChange={() => setPlan("monthly")}
              className="hidden"
            />

            {/* Custom checkmark top-right */}
            <div
              className={`absolute right-4 top-4 h-6 w-6 rounded-full border-2 flex items-center justify-center
                ${plan === "monthly" ? "border-white bg-blue-600" : "border-blue-500 bg-white"}`}
            >
              {plan === "monthly" && (
                <svg 
                  className="h-4 w-4 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-base">Monthly Plan</span>
                <p className="text-sm">
                  ${monthlyTotal} - Per Month
                  {childrenCount > 1 && (
                    <span className="opacity-80">
                      {' '}(${monthlyBasePrice} per student{childrenCount >= 3 ? ' - 15% discount' : ''})
                    </span>
                  )}
                  {' '}
                  {/* <span className="text-xs opacity-80">(+Optional Uniform)</span> */}
                </p>
              </div>
            </div>
          </label>

          {/* One-time Plan */}
          <label
            onClick={() => setPlan("oneTime")}
            className={`relative w-72 cursor-pointer rounded-xl border p-5 shadow-md transition-all 
              ${plan === "oneTime"
                ? "bg-blue-600 text-white border-blue-700 shadow-lg scale-[1.02]"
                : "bg-blue-50 text-gray-700 border-gray-200 hover:bg-blue-100"
              }`}
          >
            {/* Hidden radio */}
            <input
              type="radio"
              name="plan"
              value="oneTime"
              checked={plan === "oneTime"}
              onChange={() => setPlan("oneTime")}
              className="hidden"
            />

            {/* Custom checkmark top-right */}
            <div
              className={`absolute right-4 top-4 h-6 w-6 rounded-full border-2 flex items-center justify-center
                ${plan === "oneTime" ? "border-white bg-blue-600" : "border-blue-500 bg-white"}`}
            >
              {plan === "oneTime" && (
                <svg 
                  className="h-4 w-4 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className="flex flex-col">
                <span className="font-semibold text-base">One-time Payment</span>
                <p className="text-sm">
                  ${oneTimeTotal}
                  {childrenCount > 1 && (
                    <span className="opacity-80">
                      {' '}(${oneTimeBasePrice} per student{childrenCount >= 3 ? ' - 15% discount' : ''})
                    </span>
                  )}
                  {' '}<span className="text-xs opacity-80">Seasonal Plan (3–4 months, includes uniform)</span>
                </p>
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
});

export default PaymentPlanSelector;
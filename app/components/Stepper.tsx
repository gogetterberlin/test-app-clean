import React from 'react';

const steps = [
  { label: 'Upload', icon: '⬆️' },
  { label: 'Analyse', icon: '🧠' },
  { label: 'Ergebnis', icon: '✅' },
];

export function Stepper({ currentStep = 0 }: { currentStep: number }) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-center gap-6 md:gap-12">
        {steps.map((step, idx) => (
          <li key={step.label} className="flex flex-col items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
              ${idx === currentStep ? 'bg-gradient-to-br from-indigo-500 to-pink-500 text-white border-indigo-500 shadow-lg scale-110' :
                'bg-white border-gray-300 text-gray-400'}
            `}>
              <span className="text-xl">{step.icon}</span>
            </div>
            <span className={`mt-2 text-xs md:text-sm font-medium tracking-wide
              ${idx === currentStep ? 'text-indigo-600' : 'text-gray-400'}`}>{step.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
} 
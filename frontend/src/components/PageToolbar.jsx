import React from 'react';

const PageToolbar = ({ left, right, className = '' }) => {
  return (
    <div className={`flex flex-col xl:flex-row justify-between items-center gap-4 shrink-0 w-full ${className}`}>
      <div className="w-full xl:w-auto">{left}</div>
      <div className="w-full xl:w-auto">{right}</div>
    </div>
  );
};

export default PageToolbar;

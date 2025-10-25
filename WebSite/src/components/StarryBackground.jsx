// src/components/StarryBackground.jsx
import React from 'react';
import './StarryBackground.css'; // Мы создадим этот CSS-файл следующим

const StarryBackground = () => {
  return (
    <div className="starry-background">
      <div id="stars1"></div>
      <div id="stars2"></div>
      <div id="stars3"></div>
    </div>
  );
};

export default StarryBackground;
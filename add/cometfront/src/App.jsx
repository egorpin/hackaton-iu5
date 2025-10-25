// src/App.jsx

import React from 'react';
import CometOrbitScene from './CometOrbitScene'; // Импортируем наш компонент
import './App.css'; // Можно оставить для общих стилей

function App() {
  // Возвращаем только наш компонент 3D-сцены
  return (
    <div className="App">
      <CometOrbitScene />
    </div>
  );
}

export default App;

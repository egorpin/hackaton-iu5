import React, { useState } from 'react';
import CometOrbitScene from './components/CometOrbitScene';
import ObservationForm from './components/ObservationForm';
import ResultsDisplay from './components/ResultsDisplay';
import './styles/App.css'; // Убедитесь что путь правильный

function App() {
  const [orbitParams, setOrbitParams] = useState(null);
  const [closeApproach, setCloseApproach] = useState(null);
  const [observations, setObservations] = useState([]);

  const handleOrbitCalculated = (params, approach, obs) => {
    setOrbitParams(params);
    setCloseApproach(approach);
    setObservations(obs);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌠 Comet Orbit Determinator</h1>
        <p>Определение орбиты кометы по астрометрическим наблюдениям</p>
      </header>

      <div className="app-container">
        <div className="control-panel">
          <ObservationForm onOrbitCalculated={handleOrbitCalculated} />
          {orbitParams && (
            <ResultsDisplay
              orbitParams={orbitParams}
              closeApproach={closeApproach}
              observations={observations}
            />
          )}
        </div>

        <div className="visualization-panel">
          <CometOrbitScene orbitParams={orbitParams} />
        </div>
      </div>
    </div>
  );
}

export default App;

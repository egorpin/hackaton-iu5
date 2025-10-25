// src/utils/orbitalCalculations.js

export function calculateOrbitFromObservations(observations, cometId = null, cometName = 'Неизвестная комета') {
  if (observations.length < 3) {
    throw new Error('Недостаточно наблюдений для расчета орбиты');
  }

  console.log(`Расчет орбиты для кометы: ${cometName} (ID: ${cometId})`);
  console.log('Наблюдения:', observations);

  const photosCount = observations.filter(obs => obs.photo).length;
  console.log(`Наблюдений с фото: ${photosCount}`);

  // Имитация параметров кометы
  return {
    semiMajorAxis: 15.8 + Math.random() * 4,
    eccentricity: 0.95 + Math.random() * 0.04,
    inclination: 120 + Math.random() * 40,
    longitudeOfAscNode: 45 + Math.random() * 30,
    argOfPeriapsis: 90 + Math.random() * 40,
    period: calculateOrbitalPeriod(15.8),
    photosCount: photosCount,
    observationsCount: observations.length,
    cometId: cometId,
    cometName: cometName
  };
}

export function calculateOrbitalPeriod(semiMajorAxis) {
  return Math.sqrt(Math.pow(semiMajorAxis, 3)) * 365.25;
}

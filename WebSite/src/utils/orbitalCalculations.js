// src/utils/orbitalCalculations.js
// Заглушка - расчеты будут на Django бэкенде

export function calculateOrbitFromObservations(observations) {
  if (observations.length < 3) {
    throw new Error('Недостаточно наблюдений для расчета орбиты');
  }

  // Временная заглушка - в реальности будет запрос к Django API
  console.log('Отправка наблюдений на бэкенд:', observations);

  // Логируем информацию о фото и формате координат
  const photosCount = observations.filter(obs => obs.photo).length;
  const coordFormat = observations[0].raString ? 'string' : 'decimal';
  console.log(`Наблюдений с фото: ${photosCount}, Формат координат: ${coordFormat}`);

  // Имитация параметров кометы (как в Don't Look Up)
  return {
    semiMajorAxis: 15.8 + Math.random() * 4,
    eccentricity: 0.95 + Math.random() * 0.04,
    inclination: 120 + Math.random() * 40,
    longitudeOfAscNode: 45 + Math.random() * 30,
    argOfPeriapsis: 90 + Math.random() * 40,
    period: calculateOrbitalPeriod(15.8),
    photosCount: photosCount,
    observationsCount: observations.length
  };
}

export function calculateOrbitalPeriod(semiMajorAxis) {
  return Math.sqrt(Math.pow(semiMajorAxis, 3)) * 365.25;
}

// Вспомогательная функция для парсинга координат (может пригодиться на бэкенде)
export function parseCoordinateString(coordString, isRA = false) {
  if (!coordString) return 0;

  const parts = coordString.trim().split(/\s+/);
  if (parts.length !== 3) {
    throw new Error(`Некорректный формат координат: ${coordString}`);
  }

  if (isRA) {
    // Прямое восхождение: HH MM SS
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);

    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Некорректный формат прямого восхождения');
    }

    return (hours + minutes/60 + seconds/3600) * 15;
  } else {
    // Склонение: ±DD MM SS
    const sign = parts[0].startsWith('-') ? -1 : 1;
    const degrees = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);

    if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
      throw new Error('Некорректный формат склонения');
    }

    return sign * (Math.abs(degrees) + minutes/60 + seconds/3600);
  }
}

// src/utils/orbitalCalculations.js
// Упрощенные расчеты для демонстрации
// В реальной системе здесь была бы сложная математика

export function calculateOrbitFromObservations(observations) {
  if (observations.length < 3) {
    throw new Error('Недостаточно наблюдений для расчета орбиты');
  }

  // Упрощенный расчет - в реальности здесь метод Гаусса/наименьших квадратов
  // Для демонстрации возвращаем параметры кометы Галлея с небольшими вариациями

  const baseParams = {
    semiMajorAxis: 17.8,
    eccentricity: 0.967,
    inclination: 162.26,
    longitudeOfAscNode: 58.42,
    argOfPeriapsis: 111.33
  };

  // Добавляем небольшие случайные вариации на основе наблюдений
  const variation = observations.length * 0.01;

  return {
    semiMajorAxis: baseParams.semiMajorAxis + (Math.random() - 0.5) * variation,
    eccentricity: Math.max(0.1, baseParams.eccentricity + (Math.random() - 0.5) * variation * 0.1),
    inclination: baseParams.inclination + (Math.random() - 0.5) * variation * 10,
    longitudeOfAscNode: baseParams.longitudeOfAscNode + (Math.random() - 0.5) * variation * 10,
    argOfPeriapsis: baseParams.argOfPeriapsis + (Math.random() - 0.5) * variation * 10,
    period: calculateOrbitalPeriod(baseParams.semiMajorAxis)
  };
}

export function calculateOrbitalPeriod(semiMajorAxis) {
  // Третий закон Кеплера: T² ∝ a³
  // Для Земли: a = 1 а.е., T = 365.25 дней
  return Math.sqrt(Math.pow(semiMajorAxis, 3)) * 365.25;
}

export function findCloseApproach(orbitParams) {
  // Упрощенный расчет сближения
  // В реальности здесь был бы поиск минимума расстояния

  const now = new Date();
  const daysFromNow = 180 + Math.random() * 180; // Случайная дата в ближайшие 6-12 месяцев

  const approachDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);

  return {
    time: approachDate.getTime(),
    distance_au: 0.1 + Math.random() * 0.5, // Случайное расстояние 0.1-0.6 а.е.
    distance_km: (0.1 + Math.random() * 0.5) * 149597870.7,
    relative_velocity: 20 + Math.random() * 30 // км/с
  };
}

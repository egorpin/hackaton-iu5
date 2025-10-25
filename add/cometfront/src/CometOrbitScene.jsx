import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// --- Функция для расчета точек орбиты ---
// Принимает кеплеровы элементы и возвращает массив точек THREE.Vector3
function calculateOrbitPoints(
  semiMajorAxis,      // большая полуось (a)
  eccentricity,       // эксцентриситет (e)
  inclination,        // наклонение (i) в градусах
  longitudeOfAscNode, // долгота восходящего узла (Ω) в градусах
  argOfPeriapsis,     // аргумент перицентра (ω) в градусах
  pointsCount = 360   // количество точек для отрисовки эллипса
) {
  const points = [];
  const a = semiMajorAxis;
  const e = eccentricity;

  // Конвертируем углы в радианы
  const iRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscNode);
  const wRad = THREE.MathUtils.degToRad(argOfPeriapsis);

  for (let angle = 0; angle <= 360; angle += 360 / pointsCount) {
    const E = THREE.MathUtils.degToRad(angle); // E - эксцентрическая аномалия

    // Расчет координат в плоскости орбиты (2D)
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // Преобразование в 3D координаты с учетом ориентации орбиты
    // Это самая важная часть - три поворота по углам Эйлера
    const vec = new THREE.Vector3(x, y, 0);

    // 1. Поворот на аргумент перицентра (ω) вокруг оси Z
    vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), wRad);
    // 2. Поворот на наклонение (i) вокруг оси X
    vec.applyAxisAngle(new THREE.Vector3(1, 0, 0), iRad);
    // 3. Поворот на долготу восходящего узла (Ω) вокруг оси Z
    vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), omegaRad);

    points.push(vec);
  }

  return points;
}


// --- Компонент для отрисовки орбиты ---
const CometOrbit = (props) => {
  // useMemo кэширует результат вычислений, чтобы они не повторялись при каждом рендере
  const points = useMemo(() => calculateOrbitPoints(
    props.semiMajorAxis,
    props.eccentricity,
    props.inclination,
    props.longitudeOfAscNode,
    props.argOfPeriapsis
  ), [props]);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial attach="material" color="#FFD700" linewidth={2} />
    </line>
  );
};

// --- Основной компонент сцены ---
export default function CometOrbitScene() {
  // Пример параметров орбиты (похоже на комету Галлея, но упрощенно)
  const orbitParams = {
    semiMajorAxis: 17.8,       // в а.е.
    eccentricity: 0.967,
    inclination: 162.26,
    longitudeOfAscNode: 58.42,
    argOfPeriapsis: 111.33,
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
        {/* Освещение */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        {/* Фон со звездами */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

        {/* Земля в центре (0,0,0) */}
        <mesh>
          <sphereGeometry args={[1, 32, 32]} /> {/* Радиус 1 условная единица */}
          <meshStandardMaterial color="#4f86f7" emissive="#1f3f7a" />
        </mesh>

        {/* Орбита кометы */}
        <CometOrbit {...orbitParams} />

        {/* Управление камерой мышкой */}
        <OrbitControls />

        {/* Вспомогательные оси координат */}
        <axesHelper args={[25]} />
      </Canvas>
    </div>
  );
}

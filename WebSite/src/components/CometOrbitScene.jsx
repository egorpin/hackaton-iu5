// src/components/CometOrbitScene.jsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Вспомогательная функция для решения уравнения Кеплера M = E - e*sin(E)
// Находит E (эксцентрическую аномалию) по M (средней аномалии) и e (эксцентриситету)
function solveKepler(M, e) {
  let E = M; // Начальное приближение
  const tolerance = 1e-6; // Точность
  for (let i = 0; i < 100; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) {
      break;
    }
  }
  return E;
}


// Обновленная функция для расчета точек орбиты
function calculateOrbitPoints(
  semiMajorAxis,
  eccentricity,
  inclination,
  longitudeOfAscNode,
  argOfPeriapsis,
  pointsCount = 360
) {
  const points = [];
  const a = semiMajorAxis;
  const e = eccentricity;

  // Конвертируем углы в радианы
  const iRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscNode);
  const wRad = THREE.MathUtils.degToRad(argOfPeriapsis);

  // Матрицы поворота для преобразования координат
  const rotationW = new THREE.Matrix4().makeRotationZ(wRad);
  const rotationI = new THREE.Matrix4().makeRotationX(iRad);
  const rotationOmega = new THREE.Matrix4().makeRotationZ(omegaRad);
  const transformMatrix = new THREE.Matrix4().multiply(rotationOmega).multiply(rotationI).multiply(rotationW);


  for (let i = 0; i <= pointsCount; i++) {
    const trueAnomaly = (i / pointsCount) * 2 * Math.PI; // Истинная аномалия (ν)

    // Полярное уравнение эллипса
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

    // Координаты в плоскости орбиты (Солнце в фокусе)
    const x = r * Math.cos(trueAnomaly);
    const y = r * Math.sin(trueAnomaly);

    const vec = new THREE.Vector3(x, y, 0);

    // Переносим вектор из плоскости орбиты в плоскость эклиптики
    vec.applyMatrix4(transformMatrix);

    points.push(vec);
  }

  return points;
}


// Компонент орбиты (без изменений)
const CometOrbit = ({ orbitParams }) => {
  const points = useMemo(() => calculateOrbitPoints(
    orbitParams?.semimajor_axis,
    orbitParams?.eccentricity,
    orbitParams?.inclination,
    orbitParams?.ra_of_node,
    orbitParams?.arg_of_pericenter
  ), [orbitParams]);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        attach="material"
        color="#FFD700"
        linewidth={1}
        transparent
        opacity={0.6}
      />
    </line>
  );
};

// Компонент кометы с физически корректной анимацией
const Comet = ({ orbitParams }) => {
  const cometRef = useRef();

  // Вычисляем параметры, необходимые для анимации, один раз
  const animationParams = useMemo(() => {
    if (!orbitParams) return null;

    const a = orbitParams.semimajor_axis; // в а.е.
    const e = orbitParams.eccentricity;
    const timeOfPericenter = new Date(orbitParams.time_of_pericenter).getTime();

    // Период в годах (по 3-му закону Кеплера для а.е.)
    const periodYears = Math.sqrt(a * a * a);
    const periodMs = periodYears * 365.25 * 24 * 60 * 60 * 1000;

    // Среднее движение (радианы в миллисекунду)
    const meanMotion = (2 * Math.PI) / periodMs;

    // Матрица трансформации (чтобы не считать ее в каждом кадре)
    const iRad = THREE.MathUtils.degToRad(orbitParams.inclination);
    const omegaRad = THREE.MathUtils.degToRad(orbitParams.ra_of_node);
    const wRad = THREE.MathUtils.degToRad(orbitParams.arg_of_pericenter);

    const rotationW = new THREE.Matrix4().makeRotationZ(wRad);
    const rotationI = new THREE.Matrix4().makeRotationX(iRad);
    const rotationOmega = new THREE.Matrix4().makeRotationZ(omegaRad);
    const transformMatrix = new THREE.Matrix4().multiply(rotationOmega).multiply(rotationI).multiply(rotationW);

    return { a, e, timeOfPericenter, meanMotion, transformMatrix };
  }, [orbitParams]);

  useFrame(({ clock }) => {
    if (!cometRef.current || !animationParams) return;

    // Моделируем течение времени. Умножим на 100000 для наглядности
    const elapsedTime = clock.getElapsedTime() * 1000000;
    const currentTime = animationParams.timeOfPericenter + elapsedTime;

    // 1. Средняя аномалия (M)
    const M = animationParams.meanMotion * (currentTime - animationParams.timeOfPericenter);

    // 2. Эксцентрическая аномалия (E) - решаем уравнение Кеплера
    const E = solveKepler(M, animationParams.e);

    // 3. Координаты в плоскости орбиты
    const x = animationParams.a * (Math.cos(E) - animationParams.e);
    const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);

    const newPos = new THREE.Vector3(x, y, 0);

    // 4. Применяем трансформацию, как при построении орбиты
    newPos.applyMatrix4(animationParams.transformMatrix);

    cometRef.current.position.copy(newPos);

    // Вращение для эффекта
    cometRef.current.rotation.y += 0.01;
  });

  if (!orbitParams) return null;

  return (
    <group ref={cometRef}>
      <Sphere args={[0.2, 16, 16]}>
        <meshBasicMaterial color="#FF6B6B" />
      </Sphere>
      {/* Упрощенный хвост кометы */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[1, 0, 0]}>
        <coneGeometry args={[0.15, 2, 12]} />
        <meshBasicMaterial color="#4ECDC4" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};


// Компонент Земли (можно будет добавить орбиту и движение)
const Earth = () => {
  return (
    <group position={[10, 0, 0]}> {/* Примерное положение */}
      <Sphere args={[0.5, 32, 32]}>
        <meshPhongMaterial color="#4f86f7" />
      </Sphere>
    </group>
  );
};

// Компонент Солнца
const Sun = () => {
  return (
    <group>
      <Sphere args={[1.5, 32, 32]}>
        <meshBasicMaterial color="#FFD700" />
      </Sphere>
      <pointLight position={[0, 0, 0]} intensity={150} distance={1000} color="#FFD700" />
    </group>
  );
};


// Основной компонент сцены
export default function CometOrbitScene({ orbitParams }) {
  // Адаптируем камеру к размеру орбиты
  const cameraPosition = useMemo(() => {
    const distance = orbitParams ? orbitParams.semimajor_axis * 2 : 20;
    return [distance, distance * 0.8, distance];
  }, [orbitParams]);

  return (
    <div style={{ width: '100%', height: '100%', background: 'black' }}>
      <Canvas camera={{ position: cameraPosition, fov: 45 }}>
        {/* Освещение */}
        <ambientLight intensity={0.1} />
        <Sun />

        {/* Фон */}
        <Stars
          radius={200}
          depth={100}
          count={5000}
          factor={6}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Земля (пока статична) */}
        <Earth />

        {/* Орбита и комета */}
        {orbitParams && (
          <>
            <CometOrbit orbitParams={orbitParams.elements} />
            <Comet orbitParams={orbitParams.elements} />
          </>
        )}

        {/* Вспомогательные элементы */}
        <axesHelper args={[20]} />
        <gridHelper args={[100, 100, '#303050', '#202040']} />

        {/* Управление */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={500}
        />
      </Canvas>
    </div>
  );
}

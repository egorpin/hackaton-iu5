// src/components/CometOrbitScene.jsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Компонент для расчета точек орбиты
function calculateOrbitPoints(
  semiMajorAxis = 17.8,
  eccentricity = 0.967,
  inclination = 162.26,
  longitudeOfAscNode = 58.42,
  argOfPeriapsis = 111.33,
  pointsCount = 360
) {
  const points = [];
  const a = semiMajorAxis;
  const e = eccentricity;

  // Конвертируем углы в радианы
  const iRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscNode);
  const wRad = THREE.MathUtils.degToRad(argOfPeriapsis);

  for (let angle = 0; angle <= 360; angle += 360 / pointsCount) {
    const E = THREE.MathUtils.degToRad(angle);

    // Расчет координат в плоскости орбиты
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const vec = new THREE.Vector3(x, y, 0);

    // Применяем преобразования для ориентации орбиты
    vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), wRad);
    vec.applyAxisAngle(new THREE.Vector3(1, 0, 0), iRad);
    vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), omegaRad);

    points.push(vec);
  }

  return points;
}

// Компонент орбиты
const CometOrbit = ({ orbitParams }) => {
  const points = useMemo(() => calculateOrbitPoints(
    orbitParams?.semiMajorAxis,
    orbitParams?.eccentricity,
    orbitParams?.inclination,
    orbitParams?.longitudeOfAscNode,
    orbitParams?.argOfPeriapsis
  ), [orbitParams]);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial
        attach="material"
        color="#FFD700"
        linewidth={2}
        transparent
        opacity={0.8}
      />
    </line>
  );
};

// Компонент кометы
const Comet = ({ orbitParams }) => {
  const cometRef = useRef();
  const [points, setPoints] = useState([]);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);

  useEffect(() => {
    if (orbitParams) {
      const orbitPoints = calculateOrbitPoints(
        orbitParams.semiMajorAxis,
        orbitParams.eccentricity,
        orbitParams.inclination,
        orbitParams.longitudeOfAscNode,
        orbitParams.argOfPeriapsis,
        360
      );
      setPoints(orbitPoints);
      setCurrentPointIndex(0);
    }
  }, [orbitParams]);

  useFrame((state, delta) => {
    if (cometRef.current && points.length > 0) {
      // Анимация движения кометы по орбите
      setCurrentPointIndex(prev => (prev + 1) % points.length);
      cometRef.current.position.copy(points[currentPointIndex]);

      // Добавляем небольшое вращение для эффекта
      cometRef.current.rotation.x += delta;
      cometRef.current.rotation.y += delta;
    }
  });

  if (!orbitParams) return null;

  return (
    <group ref={cometRef}>
      <Sphere args={[0.3, 8, 8]}>
        <meshBasicMaterial color="#FF6B6B" />
      </Sphere>
      {/* Хвост кометы */}
      <mesh position={[-1, 0, 0]}>
        <coneGeometry args={[0.5, 2, 8]} />
        <meshBasicMaterial color="#4ECDC4" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// Компонент Земли
const Earth = () => {
  return (
    <group>
      <Sphere args={[1, 32, 32]}>
        <meshPhongMaterial
          color="#4f86f7"
          emissive="#1f3f7a"
          specular="#ffffff"
          shininess={30}
        />
      </Sphere>

      {/* Облака */}
      <Sphere args={[1.02, 32, 32]}>
        <meshPhongMaterial
          color="#ffffff"
          transparent
          opacity={0.3}
        />
      </Sphere>
    </group>
  );
};

// Компонент Солнца
const Sun = () => {
  return (
    <pointLight position={[30, 0, 0]} intensity={2} color="#FFD700" />
  );
};

// Основной компонент сцены
export default function CometOrbitScene({ orbitParams }) {
  const cameraPosition = orbitParams ? [25, 15, 25] : [10, 10, 10];

  return (
    <div style={{ width: '100%', height: '100%', background: 'black' }}>
      <Canvas camera={{ position: cameraPosition, fov: 45 }}>
        {/* Освещение */}
        <ambientLight intensity={0.3} />
        <Sun />

        {/* Фон */}
        <Stars
          radius={100}
          depth={50}
          count={2000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Земля */}
        <Earth />

        {/* Орбита и комета */}
        {orbitParams && (
          <>
            <CometOrbit orbitParams={orbitParams} />
            <Comet orbitParams={orbitParams} />
          </>
        )}

        {/* Вспомогательные элементы */}
        <axesHelper args={[15]} />
        <gridHelper args={[50, 50, '#303050', '#202040']} />

        {/* Управление */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={100}
        />

        {/* Подписи */}
        {orbitParams && (
          <Text
            position={[0, -2, 0]}
            color="#ffffff"
            fontSize={0.8}
            anchorX="center"
            anchorY="middle"
          >
            Земля
          </Text>
        )}
      </Canvas>
    </div>
  );
}

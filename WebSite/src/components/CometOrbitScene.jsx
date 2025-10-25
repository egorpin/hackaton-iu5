// src/components/CometOrbitScene.jsx
import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Функция для расчета точек орбиты
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

  const iRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscNode);
  const wRad = THREE.MathUtils.degToRad(argOfPeriapsis);

  const rotationW = new THREE.Matrix4().makeRotationZ(wRad);
  const rotationI = new THREE.Matrix4().makeRotationX(iRad);
  const rotationOmega = new THREE.Matrix4().makeRotationZ(omegaRad);
  const transformMatrix = new THREE.Matrix4().multiply(rotationOmega).multiply(rotationI).multiply(rotationW);

  for (let i = 0; i <= pointsCount; i++) {
    const trueAnomaly = (i / pointsCount) * 2 * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

    const x = r * Math.cos(trueAnomaly);
    const y = r * Math.sin(trueAnomaly);

    const vec = new THREE.Vector3(x, y, 0);
    vec.applyMatrix4(transformMatrix);
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
        color="#4ECDC4"
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
  const tailRef = useRef();

  useFrame(({ clock }) => {
    if (!cometRef.current || !orbitParams) return;

    // Простая анимация по орбите
    const time = clock.getElapsedTime() * 0.2;
    const angle = time % (2 * Math.PI);

    const a = orbitParams.semiMajorAxis;
    const e = orbitParams.eccentricity;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(angle));

    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);

    cometRef.current.position.set(x, y, 0);
    cometRef.current.rotation.y += 0.05;

    // Анимация хвоста
    if (tailRef.current) {
      tailRef.current.scale.x = 1 + Math.sin(time * 3) * 0.3;
    }
  });

  if (!orbitParams) return null;

  return (
    <group ref={cometRef}>
      <Sphere args={[0.3, 16, 16]}>
        <meshBasicMaterial color="#FF6B6B" />
      </Sphere>
      {/* Хвост кометы */}
      <mesh ref={tailRef} rotation={[0, Math.PI / 2, 0]} position={[1.5, 0, 0]}>
        <coneGeometry args={[0.2, 3, 8]} />
        <meshBasicMaterial color="#82C8E5" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

// Компонент Земли
const Earth = () => {
  const earthRef = useRef();

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={[10, 0, 0]}>
      <Sphere ref={earthRef} args={[0.8, 32, 32]}>
        <meshPhongMaterial color="#3b8ab5" />
      </Sphere>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        Земля
      </Text>
    </group>
  );
};

// Компонент Солнца
const Sun = () => {
  const sunRef = useRef();

  useFrame(() => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group>
      <Sphere ref={sunRef} args={[2, 32, 32]}>
        <meshBasicMaterial color="#FFD700" />
      </Sphere>
      <pointLight position={[0, 0, 0]} intensity={2} distance={100} color="#FFD700" />
      <Text
        position={[0, 3, 0]}
        fontSize={0.6}
        color="#FFD700"
        anchorX="center"
        anchorY="middle"
      >
        Солнце
      </Text>
    </group>
  );
};

// Основной компонент сцены
export default function CometOrbitScene({ orbitParams }) {
  const cameraPosition = useMemo(() => {
    const distance = orbitParams ? orbitParams.semiMajorAxis * 1.5 : 30;
    return [distance, distance * 0.5, distance];
  }, [orbitParams]);

  return (
    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 100%)' }}>
      <Canvas camera={{ position: cameraPosition, fov: 50 }}>
        <color attach="background" args={['#0a0a1a']} />

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
          speed={1}
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
          maxDistance={200}
        />
      </Canvas>
    </div>
  );
}

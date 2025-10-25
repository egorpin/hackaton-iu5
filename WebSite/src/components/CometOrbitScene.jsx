import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// --- ДАННЫЕ О ПЛАНЕТАХ ---
const planetData = [
  { name: 'Mercury', a: 0.3871, e: 0.2056, i: 7.005, a_node: 48.331, a_peri: 29.124, M_epoch: 174.795, size: 0.38, color: '#9f9f9f' },
  { name: 'Venus', a: 0.7233, e: 0.0068, i: 3.395, a_node: 76.680, a_peri: 54.884, M_epoch: 50.416, size: 0.95, color: '#d8a050' },
  { name: 'Earth', a: 1.0000, e: 0.0167, i: 0.000, a_node: -11.261, a_peri: 114.208, M_epoch: 357.517, size: 1.0, color: '#4f86f7' },
  { name: 'Mars', a: 1.5237, e: 0.0934, i: 1.850, a_node: 49.579, a_peri: 286.537, M_epoch: 19.390, size: 0.53, color: '#c1440e' },
  { name: 'Jupiter', a: 5.2034, e: 0.0484, i: 1.305, a_node: 100.556, a_peri: 274.256, M_epoch: 19.668, size: 11.2, color: '#c8a379' },
];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function solveKepler(M, e) {
  let E = M;
  const tolerance = 1e-6;
  for (let i = 0; i < 100; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < tolerance) break;
  }
  return E;
}

function calculateOrbitPoints(semiMajorAxis, eccentricity, inclination, longitudeOfAscNode, argOfPeriapsis, pointsCount = 360) {
  const points = [];
  const a = semiMajorAxis;
  const e = eccentricity;

  const iRad = THREE.MathUtils.degToRad(inclination);
  const omegaRad = THREE.MathUtils.degToRad(longitudeOfAscNode);
  const wRad = THREE.MathUtils.degToRad(argOfPeriapsis);

  const rotZ_omega = new THREE.Matrix4().makeRotationZ(omegaRad);
  const rotX_i = new THREE.Matrix4().makeRotationX(iRad);
  const rotZ_w = new THREE.Matrix4().makeRotationZ(wRad);

  const transformMatrix = new THREE.Matrix4().multiply(rotZ_omega).multiply(rotX_i).multiply(rotZ_w);

  for (let i = 0; i <= pointsCount; i++) {
    const trueAnomaly = (i / pointsCount) * 2 * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));
    const vec = new THREE.Vector3(r * Math.cos(trueAnomaly), r * Math.sin(trueAnomaly), 0);
    vec.applyMatrix4(transformMatrix);
    points.push(vec);
  }
  return points;
}

// --- КОМПОНЕНТЫ СЦЕНЫ ---
const CelestialOrbit = ({ elements, color = "#FFD700", opacity = 0.4 }) => {
    if (!elements) return null;
    const points = useMemo(() => calculateOrbitPoints(
        elements.semiMajorAxis,
        elements.eccentricity,
        elements.inclination,
        elements.longitudeOfAscNode,
        elements.argOfPeriapsis
    ), [elements]);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    return (
        <line geometry={lineGeometry}>
            <lineBasicMaterial attach="material" color={color} linewidth={1} transparent opacity={opacity} />
        </line>
    );
};

const Comet = ({ orbitParams }) => {
    const cometRef = useRef();
    const animationParams = useMemo(() => {
        if (!orbitParams) return null;
        const a = orbitParams.semiMajorAxis;
        const e = orbitParams.eccentricity;
        const periodYears = Math.sqrt(a * a * a);
        const meanMotion = (2 * Math.PI) / periodYears;

        const iRad = THREE.MathUtils.degToRad(orbitParams.inclination);
        const omegaRad = THREE.MathUtils.degToRad(orbitParams.longitudeOfAscNode);
        const wRad = THREE.MathUtils.degToRad(orbitParams.argOfPeriapsis);

        const rotZ_omega = new THREE.Matrix4().makeRotationZ(omegaRad);
        const rotX_i = new THREE.Matrix4().makeRotationX(iRad);
        const rotZ_w = new THREE.Matrix4().makeRotationZ(wRad);
        const transformMatrix = new THREE.Matrix4().multiply(rotZ_omega).multiply(rotX_i).multiply(rotZ_w);

        return { a, e, meanMotion, transformMatrix };
    }, [orbitParams]); // ИСПРАВЛЕНО: Добавлены недостающие `)` и массив зависимостей

    useFrame(({ clock }) => {
        if (!cometRef.current || !animationParams) return;
        const timeYears = clock.getElapsedTime() / 15; // Замедлил анимацию для наглядности
        const M = animationParams.meanMotion * timeYears;
        const E = solveKepler(M, animationParams.e);

        const x = animationParams.a * (Math.cos(E) - animationParams.e);
        const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);

        const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
        cometRef.current.position.copy(newPos);
    });

    if (!orbitParams) return null;

    return (
        <group ref={cometRef}>
            <Sphere args={[0.05, 16, 16]}>
                <meshBasicMaterial color="#FF6B6B" />
            </Sphere>
            <mesh rotation={[0, Math.PI / 2, 0]} position={[0.2, 0, 0]}>
                <coneGeometry args={[0.03, 0.4, 12]} />
                <meshBasicMaterial color="#4ECDC4" transparent opacity={0.7} />
            </mesh>
        </group>
    );

    return { a, e, meanMotion, transformMatrix };
  }, [orbitParams]);

  useFrame(({ clock }) => {
    if (!cometRef.current || !animationParams) return;

    // Замедлим анимацию, чтобы было нагляднее
    const timeYears = clock.getElapsedTime() / 20;
    const M = animationParams.meanMotion * timeYears;
    const E = solveKepler(M, animationParams.e);

    const x = animationParams.a * (Math.cos(E) - animationParams.e);
    const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);

    const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
    cometRef.current.position.copy(newPos);
  });

  if (!orbitParams) return null;

  return (
    <group ref={cometRef}>
      <Sphere args={[0.08, 16, 16]}>
        <meshBasicMaterial color="#FF6B6B" />
      </Sphere>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.2, 0, 0]}>
        <coneGeometry args={[0.04, 0.5, 12]} />
        <meshBasicMaterial color="#4ECDC4" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};


// Компонент для Планет
const Planet = ({ planetInfo }) => {
    const planetRef = useRef();
    const animationParams = useMemo(() => {
        const a = planetInfo.a;
        const e = planetInfo.e;
        const periodYears = Math.sqrt(a * a * a);
        const meanMotion = (2 * Math.PI) / periodYears;
        const meanAnomalyEpochRad = THREE.MathUtils.degToRad(planetInfo.M_epoch);

        const iRad = THREE.MathUtils.degToRad(planetInfo.i);
        const omegaRad = THREE.MathUtils.degToRad(planetInfo.a_node);
        const wRad = THREE.MathUtils.degToRad(planetInfo.a_peri);

        const rotZ_omega = new THREE.Matrix4().makeRotationZ(omegaRad);
        const rotX_i = new THREE.Matrix4().makeRotationX(iRad);
        const rotZ_w = new THREE.Matrix4().makeRotationZ(wRad);
        const transformMatrix = new THREE.Matrix4().multiply(rotZ_omega).multiply(rotX_i).multiply(rotZ_w);

        return { a, e, meanMotion, meanAnomalyEpochRad, transformMatrix };
    }, [planetInfo]);

    useFrame(({ clock }) => {
        if (!planetRef.current || !animationParams) return;

        const timeYears = clock.getElapsedTime() / 20;
        const M = animationParams.meanAnomalyEpochRad + animationParams.meanMotion * timeYears;
        const E = solveKepler(M, animationParams.e);

        const x = animationParams.a * (Math.cos(E) - animationParams.e);
        const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);

        const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
        planetRef.current.position.copy(newPos);
        planetRef.current.rotation.y += 0.01;
    });

    const orbitElements = {
        semiMajorAxis: planetInfo.a, eccentricity: planetInfo.e,
        inclination: planetInfo.i, longitudeOfAscNode: planetInfo.a_node,
        argOfPeriapsis: planetInfo.a_peri,
    };
    const visualRadius = planetInfo.size * 0.05;

    return (
        <group>
            <CelestialOrbit elements={orbitElements} color="#ffffff" opacity={0.2} />
            <group ref={planetRef}>
                 <Sphere args={[visualRadius, 32, 32]}>
                    <meshPhongMaterial color={planetInfo.color} />
                </Sphere>
            </group>
        </group>
    );
}

const Sun = () => (
    <group>
        <Sphere args={[0.3, 32, 32]}>
            <meshBasicMaterial color="#FFD700" />
        </Sphere>
        <pointLight position={[0, 0, 0]} intensity={300} distance={1000} color="#FFD700" />
    </group>
);

// --- Основной компонент сцены ---
export default function CometOrbitScene({ orbitParams }) { // ИСПРАВЛЕНО: Принимаем orbitParams
  return (
    // ИСПРАВЛЕНО: Убран черный фон, чтобы не было "черного экрана"
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 15, 15], fov: 45, near: 0.1, far: 5000 }}>
        <ambientLight intensity={0.2} />
        <Sun />
        <Stars radius={200} depth={50} count={5000} factor={6} saturation={0} fade speed={0.5} />
        {planetData.map(planet => <Planet key={planet.name} planetInfo={planet} />)}

        {/* Рендерим комету и ее орбиту только если есть данные */}
        {hasCometData && (
          <>
            <CelestialOrbit elements={orbitParams} color="#4ECDC4" opacity={0.7} />
            <Comet orbitParams={orbitParams} />
          </>
        )}

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={50} />
      </Canvas>
    </div>
  );
}

// --- START OF FILE CometOrbitScene.jsx ---

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, useTexture, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// --- ИЗМЕНЕНИЕ: ДОБАВЛЕНЫ НЕДОСТАЮЩИЕ ПЛАНЕТЫ И ПУТИ К ТЕКСТУРАМ ---
const planetData = [
  // Данные: a (а.е.), e (эксц.), i (накл.), a_node (долгота узла), a_peri (арг. перицентра), M_epoch (ср. аномалия), size (отн. Земли)
  { name: 'Mercury', a: 0.3871, e: 0.2056, i: 7.005, a_node: 48.331, a_peri: 29.124, M_epoch: 174.795, size: 0.38, texture: '/assets/textures/mercury.jpeg' },
  { name: 'Venus', a: 0.7233, e: 0.0068, i: 3.395, a_node: 76.680, a_peri: 54.884, M_epoch: 50.416, size: 0.95, texture: '/assets/textures/2k_venus_atmosphere.jpg' },
  { name: 'Earth', a: 1.0000, e: 0.0167, i: 0.000, a_node: -11.261, a_peri: 114.208, M_epoch: 357.517, size: 1.0, texture: '/assets/textures/earth.jpg' },
  { name: 'Mars', a: 1.5237, e: 0.0934, i: 1.850, a_node: 49.579, a_peri: 286.537, M_epoch: 19.390, size: 0.53, texture: '/assets/textures/2k_mars.jpg' },
  { name: 'Jupiter', a: 5.2034, e: 0.0484, i: 1.305, a_node: 100.556, a_peri: 274.256, M_epoch: 19.668, size: 11.2, texture: '/assets/textures/2k_jupiter.jpg' },
  { name: 'Saturn', a: 9.5371, e: 0.0542, i: 2.484, a_node: 113.715, a_peri: 336.014, M_epoch: 317.02, size: 9.45, texture: '/assets/textures/2k_saturn.jpg' },
  { name: 'Uranus', a: 19.1913, e: 0.0472, i: 0.770, a_node: 74.230, a_peri: 96.734, M_epoch: 141.05, size: 4.01, texture: '/assets/textures/2k_uranus.jpg' },
  { name: 'Neptune', a: 30.0690, e: 0.0086, i: 1.769, a_node: 131.722, a_peri: 265.647, M_epoch: 259.9, size: 3.88, texture: '/assets/textures/2k_neptune.jpg' },
];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ПОЛНЫЕ ВЕРСИИ) ---
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

  const transformMatrix = new THREE.Matrix4().multiplyMatrices(
    new THREE.Matrix4().makeRotationZ(omegaRad),
    new THREE.Matrix4().makeRotationZ(wRad).premultiply(new THREE.Matrix4().makeRotationX(iRad))
  );

  // Адаптация для гиперболических орбит, чтобы избежать разрыва
  const maxAngle = e > 1 ? Math.acos(-1 / e) * 0.95 : Math.PI;

  for (let i = 0; i <= pointsCount; i++) {
    const trueAnomaly = -maxAngle + (i / pointsCount) * 2 * maxAngle;
    let r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));

    if (r > 0 && r < 200) { // Ограничиваем отрисовку очень далеких точек
      const vec = new THREE.Vector3(r * Math.cos(trueAnomaly), r * Math.sin(trueAnomaly), 0);
      vec.applyMatrix4(transformMatrix);
      points.push(vec);
    }
  }
  return points;
}

// --- КОМПОНЕНТЫ СЦЕНЫ ---

const CelestialOrbit = ({ elements, color = "#FFD700", opacity = 0.4 }) => {
    if (!elements) return null;
    const points = useMemo(() => calculateOrbitPoints(
        elements.semimajor_axis,
        elements.eccentricity,
        elements.inclination,
        elements.ra_of_node,
        elements.arg_of_pericenter
    ), [elements]);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    return (
        <line geometry={lineGeometry}>
            <lineBasicMaterial attach="material" color={color} linewidth={1} transparent opacity={opacity} />
        </line>
    );
};

function CometModel({ orbitParams }) {
  const group = useRef();
  const { scene } = useGLTF('/assets/models/comet.glb');
  const model = useMemo(() => scene.clone(), [scene]);

  const animationParams = useMemo(() => {
    if (!orbitParams || orbitParams.eccentricity >= 1) return null;
    const a = orbitParams.semimajor_axis;
    const e = orbitParams.eccentricity;
    const periodYears = Math.sqrt(a * a * a);
    const meanMotion = (2 * Math.PI) / periodYears;
    const iRad = THREE.MathUtils.degToRad(orbitParams.inclination);
    const omegaRad = THREE.MathUtils.degToRad(orbitParams.ra_of_node);
    const wRad = THREE.MathUtils.degToRad(orbitParams.arg_of_pericenter);
    const transformMatrix = new THREE.Matrix4().multiplyMatrices(
        new THREE.Matrix4().makeRotationZ(omegaRad),
        new THREE.Matrix4().makeRotationZ(wRad).premultiply(new THREE.Matrix4().makeRotationX(iRad))
    );
    return { a, e, meanMotion, transformMatrix };
  }, [orbitParams]);

  useFrame(({ clock }) => {
    if (!group.current || !animationParams) return;
    const timeYears = clock.getElapsedTime() / 15;
    const M = animationParams.meanMotion * timeYears;
    const E = solveKepler(M, animationParams.e);
    const x = animationParams.a * (Math.cos(E) - animationParams.e);
    const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);
    const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
    group.current.position.copy(newPos);
    group.current.lookAt(0,0,0);
  });

  if (!orbitParams) return null;

  return (
    <group ref={group}>
      <primitive object={model} scale={0.03} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

const Planet = ({ planetInfo }) => {
    const planetRef = useRef();
    const texture = useTexture(planetInfo.texture);
    const ringTexture = useTexture(planetInfo.name === 'Saturn' ? '/assets/textures/saturn_ring.png' : '/assets/textures/saturn_ring.png');

    const animationParams = useMemo(() => {
        const a = planetInfo.a; const e = planetInfo.e;
        const periodYears = Math.sqrt(a * a * a);
        const meanMotion = (2 * Math.PI) / periodYears;
        const meanAnomalyEpochRad = THREE.MathUtils.degToRad(planetInfo.M_epoch);
        const iRad = THREE.MathUtils.degToRad(planetInfo.i);
        const omegaRad = THREE.MathUtils.degToRad(planetInfo.a_node);
        const wRad = THREE.MathUtils.degToRad(planetInfo.a_peri);
        const transformMatrix = new THREE.Matrix4().multiplyMatrices(
            new THREE.Matrix4().makeRotationZ(omegaRad),
            new THREE.Matrix4().makeRotationZ(wRad).premultiply(new THREE.Matrix4().makeRotationX(iRad))
        );
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
        semimajor_axis: planetInfo.a, eccentricity: planetInfo.e,
        inclination: planetInfo.i, ra_of_node: planetInfo.a_node,
        arg_of_pericenter: planetInfo.a_peri,
    };
    const visualRadius = planetInfo.size * 0.05;

    return (
        <group>
            <CelestialOrbit
                elements={orbitElements}
                color={planetInfo.name === 'Earth' ? '#33aaff' : "#ffffff"}
                opacity={planetInfo.name === 'Earth' ? 0.8 : 0.2}
            />
            <group ref={planetRef}>
                 <Sphere args={[visualRadius, 32, 32]}>
                    <meshStandardMaterial map={texture} />
                </Sphere>
                {planetInfo.name === 'Saturn' && (
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[visualRadius * 1.5, visualRadius * 2.5, 64]} />
                      <meshBasicMaterial map={ringTexture} side={THREE.DoubleSide} transparent />
                  </mesh>
                )}
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
export default function CometOrbitScene({ orbitParams }) {
  const hasCometData = orbitParams && orbitParams.semimajor_axis && orbitParams.eccentricity !== undefined;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas camera={{ position: [0, 20, 20], fov: 45, near: 0.1, far: 5000 }}>
        <ambientLight intensity={0.5} />
        <Sun />
        <Stars radius={300} depth={50} count={5000} factor={6} saturation={0} fade speed={1} />

        {planetData.map(planet => <Planet key={planet.name} planetInfo={planet} />)}

        {hasCometData && (
          <>
            <CelestialOrbit elements={orbitParams} color="#4ECDC4" opacity={0.7} />
            <CometModel orbitParams={orbitParams} />
          </>
        )}

        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={100} />
      </Canvas>
    </div>
  );
}
// --- END OF FILE CometOrbitScene.jsx ---

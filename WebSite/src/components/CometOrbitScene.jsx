// --- START OF FILE CometOrbitScene.jsx ---

import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const planetData = [
  { name: 'Mercury', a: 0.3871, e: 0.2056, i: 7.005, a_node: 48.331, a_peri: 29.124, M_epoch: 174.795, texturePath: '/textures/mercury.jpeg', radius: 0.08 },
  { name: 'Venus', a: 0.7233, e: 0.0068, i: 3.395, a_node: 76.680, a_peri: 54.884, M_epoch: 50.416, texturePath: '/textures/venus.jpeg', radius: 0.12 },
  { name: 'Earth', a: 1.0000, e: 0.0167, i: 0.000, a_node: -11.261, a_peri: 114.208, M_epoch: 357.517, texturePath: '/textures/earth.jpg', radius: 0.13 },
  { name: 'Mars', a: 1.5237, e: 0.0934, i: 1.850, a_node: 49.579, a_peri: 286.537, M_epoch: 19.390, texturePath: '/textures/mars.jpeg', radius: 0.1 },
  { name: 'Jupiter', a: 5.2034, e: 0.0484, i: 1.305, a_node: 100.556, a_peri: 274.256, M_epoch: 19.668, texturePath: '/textures/jupiter.jpg', radius: 0.5 },
];

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
  if (!semiMajorAxis) return []; // Защита от отсутствия данных
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
  for (let i = 0; i <= pointsCount; i++) {
    const trueAnomaly = (i / pointsCount) * 2 * Math.PI;
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(trueAnomaly));
    const vec = new THREE.Vector3(r * Math.cos(trueAnomaly), r * Math.sin(trueAnomaly), 0);
    vec.applyMatrix4(transformMatrix);
    points.push(vec);
  }
  return points;
}

const CelestialOrbit = ({ elements, color = "#FFD700", opacity = 0.4 }) => {
  const points = useMemo(() => calculateOrbitPoints(
    elements.semimajor_axis, elements.eccentricity, elements.inclination,
    elements.ra_of_node, elements.arg_of_pericenter
  ), [elements]);
  if (points.length === 0) return null;
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  return <line geometry={lineGeometry}><lineBasicMaterial color={color} transparent opacity={opacity} /></line>;
};

const Comet = ({ orbitParams }) => {
  const cometRef = useRef();
  const animationParams = useMemo(() => {
    if (!orbitParams?.semimajor_axis) return null;
    const a = orbitParams.semimajor_axis, e = orbitParams.eccentricity;
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
    if (!cometRef.current || !animationParams) return;
    const timeYears = clock.getElapsedTime() / 5;
    const M = animationParams.meanMotion * timeYears;
    const E = solveKepler(M, animationParams.e);
    const x = animationParams.a * (Math.cos(E) - animationParams.e);
    const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);
    const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
    cometRef.current.position.copy(newPos);
  });

  if (!orbitParams) return null;
  return <group ref={cometRef}><Sphere args={[0.05, 16, 16]}><meshBasicMaterial color="#FF6B6B" /></Sphere></group>;
};

const Planet = ({ planetInfo }) => {
    const planetRef = useRef();
    const texture = useTexture(planetInfo.texturePath);
    const animationParams = useMemo(() => {
        const a = planetInfo.a, e = planetInfo.e;
        const periodYears = Math.sqrt(a * a * a);
        const meanMotion = (2 * Math.PI) / periodYears;
        const meanAnomalyEpochRad = THREE.MathUtils.degToRad(planetInfo.M_epoch);
        const iRad = THREE.MathUtils.degToRad(planetInfo.i);
        const omegaRad = THREE.MathUtils.degToRad(planetInfo.a_node);
        const wRad = THREE.MathUtils.degToRad(planetInfo.a_peri);
        const transformMatrix = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().makeRotationZ(omegaRad), new THREE.Matrix4().makeRotationZ(wRad).premultiply(new THREE.Matrix4().makeRotationX(iRad)));
        return { a, e, meanMotion, meanAnomalyEpochRad, transformMatrix };
    }, [planetInfo]);

    useFrame(({ clock }) => {
        if (!planetRef.current || !animationParams) return;
        const timeYears = clock.getElapsedTime() / 10;
        const M = animationParams.meanAnomalyEpochRad + animationParams.meanMotion * timeYears;
        const E = solveKepler(M, animationParams.e);
        const x = animationParams.a * (Math.cos(E) - animationParams.e);
        const y = animationParams.a * Math.sqrt(1 - animationParams.e * animationParams.e) * Math.sin(E);
        const newPos = new THREE.Vector3(x, y, 0).applyMatrix4(animationParams.transformMatrix);
        planetRef.current.position.copy(newPos);
        planetRef.current.rotation.y += 0.005;
    });

    const orbitElements = { semimajor_axis: planetInfo.a, eccentricity: planetInfo.e, inclination: planetInfo.i, ra_of_node: planetInfo.a_node, arg_of_pericenter: planetInfo.a_peri };
    return <group><CelestialOrbit elements={orbitElements} color="#ffffff" opacity={0.2} /><group ref={planetRef}><Sphere args={[planetInfo.radius, 32, 32]}><meshStandardMaterial map={texture} /></Sphere></group></group>;
}

const Sun = () => <group><Sphere args={[0.3, 32, 32]}><meshBasicMaterial color="#FFD700" /></Sphere><pointLight position={[0, 0, 0]} intensity={300} distance={1000} color="#FFD700" /></group>;

export default function CometOrbitScene({ orbitParams }) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'black' }}>
      <Canvas camera={{ position: [0, 15, 15], fov: 45, near: 0.1, far: 5000 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} />
          <Sun />
          <Stars radius={200} depth={50} count={5000} factor={6} saturation={0} fade speed={0.5} />
          {planetData.map(planet => <Planet key={planet.name} planetInfo={planet} />)}
          {orbitParams && (
            <>
              <CelestialOrbit elements={orbitParams} color="#4ECDC4" opacity={0.7} />
              <Comet orbitParams={orbitParams} />
            </>
          )}
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} minDistance={2} maxDistance={50} />
      </Canvas>
    </div>
  );
}

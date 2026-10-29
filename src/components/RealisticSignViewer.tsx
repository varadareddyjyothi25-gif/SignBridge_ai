import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { getSignKinematics, type HandKinematicPose, type FingerAngles } from './RealisticHand3D';
import { AlertCircle, Sparkles } from 'lucide-react';

import {
  SKIN_TONES,
  type SkinToneId,
  type SkinToneDefinition,
  isWebGLAvailable,
} from '../types/sign3d';

export interface RealisticSignViewerProps {
  signLabel: string;
  progress: number; // 0 to 100
  isTwoHanded?: boolean;
  className?: string;
}

// Procedural 3D hand mesh generator with anatomical bones, joint capsules, and nails
interface Hand3DRig {
  root: THREE.Group;
  wrist: THREE.Group;
  palmMesh: THREE.Mesh;
  joints: {
    thumb: [THREE.Group, THREE.Group, THREE.Group]; // CMC, MCP, IP
    index: [THREE.Group, THREE.Group, THREE.Group]; // MCP, PIP, DIP
    middle: [THREE.Group, THREE.Group, THREE.Group];
    ring: [THREE.Group, THREE.Group, THREE.Group];
    pinky: [THREE.Group, THREE.Group, THREE.Group];
  };
  materials: {
    skin: THREE.MeshPhysicalMaterial;
    crease: THREE.MeshStandardMaterial;
    nail: THREE.MeshPhysicalMaterial;
  };
}

function createRealisticHandRig(isLeft = false, skinDef: SkinToneDefinition): Hand3DRig {
  const root = new THREE.Group();
  const wrist = new THREE.Group();
  root.add(wrist);

  const handScale = 0.055;
  const flip = isLeft ? -1 : 1;

  // Materials with PBR epidermal response & realistic specularity
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: skinDef.skinColor,
    roughness: 0.52,
    metalness: 0.02,
    clearcoat: 0.18,
    clearcoatRoughness: 0.35,
    sheen: 0.35,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color(skinDef.specularColor),
  });

  const creaseMat = new THREE.MeshStandardMaterial({
    color: skinDef.creaseColor,
    roughness: 0.75,
    metalness: 0.0,
  });

  const nailMat = new THREE.MeshPhysicalMaterial({
    color: skinDef.nailColor,
    roughness: 0.15,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.1,
    transmission: 0.2,
    thickness: 0.4,
  });

  // 1. Forearm & Wrist base
  const forearmGeo = new THREE.CylinderGeometry(0.78, 0.9, 2.0, 16);
  forearmGeo.translate(0, 1.0, 0);
  const forearmMesh = new THREE.Mesh(forearmGeo, skinMat);
  forearmMesh.castShadow = true;
  forearmMesh.receiveShadow = true;
  wrist.add(forearmMesh);

  // 2. Sculpted Anatomical Palm
  // Palm body with carpal arch, thenar eminence, and hypothenar pads
  const palmGroup = new THREE.Group();
  const palmGeo = new THREE.CylinderGeometry(1.05, 0.9, 2.2, 16);
  palmGeo.scale(1.05, 1.0, 0.55);
  palmGeo.translate(0, -1.0, 0);
  const palmMesh = new THREE.Mesh(palmGeo, skinMat);
  palmMesh.castShadow = true;
  palmMesh.receiveShadow = true;
  palmGroup.add(palmMesh);

  // Thenar mound (muscular base of the thumb)
  const thenarGeo = new THREE.SphereGeometry(0.55, 12, 10);
  thenarGeo.scale(1.1, 1.3, 0.7);
  const thenarMesh = new THREE.Mesh(thenarGeo, skinMat);
  thenarMesh.position.set(-0.75 * flip, -0.6, 0.15);
  thenarMesh.rotation.z = 0.35 * flip;
  thenarMesh.castShadow = true;
  palmGroup.add(thenarMesh);

  // Hypothenar mound (ulnar edge muscle pad)
  const hypothenarGeo = new THREE.SphereGeometry(0.48, 12, 10);
  hypothenarGeo.scale(0.85, 1.3, 0.65);
  const hypothenarMesh = new THREE.Mesh(hypothenarGeo, skinMat);
  hypothenarMesh.position.set(0.7 * flip, -0.85, 0.1);
  hypothenarMesh.castShadow = true;
  palmGroup.add(hypothenarMesh);

  // Palmar knuckle fold crease line indicator
  const creaseGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 16, Math.PI * 0.7);
  const creaseMesh = new THREE.Mesh(creaseGeo, creaseMat);
  creaseMesh.position.set(0, -1.2, 0.28);
  creaseMesh.rotation.z = Math.PI * 0.15 * flip;
  palmGroup.add(creaseMesh);

  wrist.add(palmGroup);

  // Helper to construct articulated finger with 3 phalanx bones, knuckle condyles, and dorsal nail
  function buildArticulatedFinger(
    mcpX: number,
    mcpY: number,
    mcpZ: number,
    lens: [number, number, number],
    radii: [number, number, number],
    isThumb = false
  ): [THREE.Group, THREE.Group, THREE.Group] {
    const mcpGroup = new THREE.Group();
    mcpGroup.position.set(mcpX * flip, mcpY, mcpZ);

    const pipGroup = new THREE.Group();
    const dipGroup = new THREE.Group();

    // Segment 1 (Proximal Phalanx)
    const p1Geo = new THREE.CylinderGeometry(radii[0] * 0.9, radii[0], lens[0], 12);
    p1Geo.scale(1.0, 1.0, 0.85); // anatomically flatter on palmar surface
    p1Geo.translate(0, -lens[0] / 2, 0);
    const p1Mesh = new THREE.Mesh(p1Geo, skinMat);
    p1Mesh.castShadow = true;
    p1Mesh.receiveShadow = true;
    mcpGroup.add(p1Mesh);

    // Knuckle head capsule (MCP joint)
    const k1Geo = new THREE.SphereGeometry(radii[0] * 1.08, 10, 8);
    k1Geo.scale(1.05, 0.9, 1.15);
    const k1Mesh = new THREE.Mesh(k1Geo, skinMat);
    k1Mesh.castShadow = true;
    mcpGroup.add(k1Mesh);

    // Segment 2 (Intermediate Phalanx)
    pipGroup.position.set(0, -lens[0], 0);
    mcpGroup.add(pipGroup);

    const p2Geo = new THREE.CylinderGeometry(radii[1] * 0.9, radii[1], lens[1], 12);
    p2Geo.scale(1.0, 1.0, 0.85);
    p2Geo.translate(0, -lens[1] / 2, 0);
    const p2Mesh = new THREE.Mesh(p2Geo, skinMat);
    p2Mesh.castShadow = true;
    p2Mesh.receiveShadow = true;
    pipGroup.add(p2Mesh);

    // Knuckle PIP condyle
    const k2Geo = new THREE.SphereGeometry(radii[1] * 1.05, 10, 8);
    const k2Mesh = new THREE.Mesh(k2Geo, skinMat);
    pipGroup.add(k2Mesh);

    // Segment 3 (Distal Phalanx with Fingernail)
    dipGroup.position.set(0, -lens[1], 0);
    pipGroup.add(dipGroup);

    const p3Geo = new THREE.CylinderGeometry(radii[2] * 0.75, radii[2], lens[2], 12);
    p3Geo.scale(1.1, 1.0, 0.82);
    p3Geo.translate(0, -lens[2] / 2, 0);
    const p3Mesh = new THREE.Mesh(p3Geo, skinMat);
    p3Mesh.castShadow = true;
    p3Mesh.receiveShadow = true;
    dipGroup.add(p3Mesh);

    // Rounded anatomical fingertip pad
    const tipPadGeo = new THREE.SphereGeometry(radii[2] * 0.8, 10, 8);
    tipPadGeo.scale(1.1, 0.9, 0.85);
    const tipPadMesh = new THREE.Mesh(tipPadGeo, skinMat);
    tipPadMesh.position.set(0, -lens[2], 0);
    tipPadMesh.castShadow = true;
    dipGroup.add(tipPadMesh);

    // Curved Glossy Fingernail on dorsal aspect
    const nailLength = lens[2] * 0.65;
    const nailWidth = radii[2] * 1.05;
    const nailGeo = new THREE.CylinderGeometry(nailWidth, nailWidth * 0.95, nailLength, 10, 1, false, -Math.PI * 0.45, Math.PI * 0.9);
    nailGeo.scale(1.0, 1.0, 0.35);
    nailGeo.translate(0, -nailLength * 0.75, 0);
    const nailMesh = new THREE.Mesh(nailGeo, nailMat);
    nailMesh.position.set(0, -lens[2] * 0.3, isThumb ? 0.22 : -radii[2] * 0.72);
    if (!isThumb) {
      nailMesh.rotation.y = Math.PI; // dorsal side of standard finger
    }
    dipGroup.add(nailMesh);

    return [mcpGroup, pipGroup, dipGroup];
  }

  // MCP attachment positions on palm distal boundary
  // Finger length scaling: Middle (1.0), Index (0.92), Ring (0.90), Pinky (0.74), Thumb (0.72)
  const indexJoints = buildArticulatedFinger(-0.62, -2.15, 0.05, [1.25, 0.85, 0.65], [0.26, 0.23, 0.2]);
  const middleJoints = buildArticulatedFinger(0.0, -2.25, 0.02, [1.38, 0.95, 0.7], [0.27, 0.24, 0.21]);
  const ringJoints = buildArticulatedFinger(0.58, -2.15, 0.0, [1.24, 0.84, 0.64], [0.25, 0.22, 0.19]);
  const pinkyJoints = buildArticulatedFinger(1.05, -1.95, -0.05, [0.95, 0.65, 0.52], [0.22, 0.19, 0.16]);

  // Thumb Saddle Joint (CMC) positioned laterally on thenar mound
  const thumbJoints = buildArticulatedFinger(-1.05, -0.85, 0.25, [0.95, 0.78, 0.6], [0.32, 0.28, 0.24], true);
  thumbJoints[0].rotation.y = -0.45 * flip;
  thumbJoints[0].rotation.z = 0.55 * flip;

  wrist.add(indexJoints[0]);
  wrist.add(middleJoints[0]);
  wrist.add(ringJoints[0]);
  wrist.add(pinkyJoints[0]);
  wrist.add(thumbJoints[0]);

  root.scale.set(handScale, handScale, handScale);

  return {
    root,
    wrist,
    palmMesh,
    joints: {
      thumb: thumbJoints,
      index: indexJoints,
      middle: middleJoints,
      ring: ringJoints,
      pinky: pinkyJoints,
    },
    materials: {
      skin: skinMat,
      crease: creaseMat,
      nail: nailMat,
    },
  };
}

// Apply forward kinematic angles to a hand rig
function applyPoseToRig(rig: Hand3DRig, pose: HandKinematicPose, isLeft = false) {
  const flip = isLeft ? -1 : 1;

  // Wrist Translation and Rotation
  rig.wrist.position.set(
    pose.wristPos.x * 0.025,
    -pose.wristPos.y * 0.025 + 0.4,
    pose.wristPos.z * 0.025
  );

  rig.wrist.rotation.set(
    pose.wristRot[0],
    pose.wristRot[1],
    pose.wristRot[2]
  );

  // Thumb Joints: CMC, MCP, IP
  const [tCMC, tMCP, tIP] = rig.joints.thumb;
  const tAbd = pose.thumb.abduction;
  const [t1, t2, t3] = pose.thumb.bend;

  tCMC.rotation.x = t1 * 0.85;
  tCMC.rotation.y = (-0.45 - tAbd * 0.7) * flip;
  tCMC.rotation.z = (0.55 - t1 * 0.35) * flip;

  tMCP.rotation.x = t2 * 0.95;
  tIP.rotation.x = t3 * 0.95;

  // Helper for 4 standard fingers
  function setFingerJoints(
    joints: [THREE.Group, THREE.Group, THREE.Group],
    angles: FingerAngles
  ) {
    const [mcp, pip, dip] = joints;
    const [b1, b2, b3] = angles.bend;
    const spread = angles.spread * flip;

    mcp.rotation.x = b1 * 1.55;
    mcp.rotation.z = spread;
    pip.rotation.x = b2 * 1.5;
    dip.rotation.x = b3 * 1.35;
  }

  setFingerJoints(rig.joints.index, pose.index);
  setFingerJoints(rig.joints.middle, pose.middle);
  setFingerJoints(rig.joints.ring, pose.ring);
  setFingerJoints(rig.joints.pinky, pose.pinky);
}

export const RealisticSignViewer: React.FC<RealisticSignViewerProps> = ({
  signLabel,
  progress,
  isTwoHanded,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(isWebGLAvailable);
  const [selectedSkinTone, setSelectedSkinTone] = useState<SkinToneId>('wheatish');
  const [cameraPreset, setCameraPreset] = useState<'front' | 'perspective' | 'top' | 'side'>('perspective');

  // Orbit rotation state
  const orbitRef = useRef<{ isDragging: boolean; startX: number; startY: number; rotX: number; rotY: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    rotX: 0.1,
    rotY: 0.15,
  });

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    dominantRig: Hand3DRig;
    secondaryRig: Hand3DRig;
    lights: { key: THREE.DirectionalLight; fill: THREE.DirectionalLight; rim: THREE.DirectionalLight };
    reqId?: number;
  } | null>(null);

  // Initialize Three.js scene once mounted
  useEffect(() => {
    if (!hasWebGL) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 480;
    const height = 320;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 0.3, 3.8);

    // 2. WebGL Renderer with Antialiasing & PBR Tone Mapping
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    } catch {
      queueMicrotask(() => setHasWebGL(false));
      return;
    }

    // 3. Three-Point Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffeedd, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(2.5, 4.0, 3.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcce5ff, 0.65);
    fillLight.position.set(-3.0, 1.5, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfffae8, 1.1);
    rimLight.position.set(0.0, 3.5, -3.0);
    scene.add(rimLight);

    // 4. Subtle contact shadow floor
    const floorGeo = new THREE.PlaneGeometry(8, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1.2;
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 5. Build Articulated Realistic Hands
    const dominantRig = createRealisticHandRig(false, SKIN_TONES.wheatish);
    scene.add(dominantRig.root);

    const secondaryRig = createRealisticHandRig(true, SKIN_TONES.wheatish);
    scene.add(secondaryRig.root);

    threeRef.current = {
      scene,
      camera,
      renderer,
      dominantRig,
      secondaryRig,
      lights: { key: keyLight, fill: fillLight, rim: rimLight },
    };

    // Render loop
    const render = () => {
      if (!threeRef.current) return;
      const { scene, camera, renderer } = threeRef.current;

      // Apply orbit rotation to camera
      const orbit = orbitRef.current;
      const radius = 3.6;
      camera.position.x = radius * Math.sin(orbit.rotY) * Math.cos(orbit.rotX);
      camera.position.y = radius * Math.sin(orbit.rotX) + 0.3;
      camera.position.z = radius * Math.cos(orbit.rotY) * Math.cos(orbit.rotX);
      camera.lookAt(0, 0.25, 0);

      renderer.render(scene, camera);
      threeRef.current.reqId = requestAnimationFrame(render);
    };

    render();

    // Handle Resize
    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const newWidth = container.clientWidth || 480;
      threeRef.current.camera.aspect = newWidth / height;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(newWidth, height, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (threeRef.current?.reqId) {
        cancelAnimationFrame(threeRef.current.reqId);
      }
      renderer.dispose();
      threeRef.current = null;
    };
  }, [hasWebGL]);

  // Update skin tone across materials
  useEffect(() => {
    if (!threeRef.current) return;
    const toneDef = SKIN_TONES[selectedSkinTone];
    const updateRigMaterials = (rig: Hand3DRig) => {
      rig.materials.skin.color.setHex(toneDef.skinColor);
      rig.materials.skin.sheenColor.setHex(toneDef.specularColor);
      rig.materials.crease.color.setHex(toneDef.creaseColor);
      rig.materials.nail.color.setHex(toneDef.nailColor);
    };

    updateRigMaterials(threeRef.current.dominantRig);
    updateRigMaterials(threeRef.current.secondaryRig);
  }, [selectedSkinTone]);

  // Update kinematics when signLabel or progress changes
  useEffect(() => {
    if (!threeRef.current) return;

    const { dominantRig, secondaryRig } = threeRef.current;
    const kinematics = getSignKinematics(signLabel, progress);

    // Apply Dominant Hand
    applyPoseToRig(dominantRig, kinematics.dominant, false);

    // Apply Secondary Hand if present or required
    if (kinematics.secondary) {
      secondaryRig.root.visible = true;
      applyPoseToRig(secondaryRig, kinematics.secondary, true);
    } else if (isTwoHanded) {
      secondaryRig.root.visible = true;
      // Default supportive relaxed posture for secondary hand
      const defaultSecondary: HandKinematicPose = {
        wristPos: { x: -28, y: -10, z: -10 },
        wristRot: [0, 0.4, 0],
        thumb: { bend: [0.1, 0.1, 0.1], abduction: 0.2 },
        index: { bend: [0.1, 0.1, 0.1], spread: 0 },
        middle: { bend: [0.1, 0.1, 0.1], spread: 0 },
        ring: { bend: [0.1, 0.1, 0.1], spread: 0 },
        pinky: { bend: [0.1, 0.1, 0.1], spread: 0 },
      };
      applyPoseToRig(secondaryRig, defaultSecondary, true);
    } else {
      secondaryRig.root.visible = false;
    }
  }, [signLabel, progress, isTwoHanded]);

  // Preset Camera Angle Handler
  const setPresetAngle = useCallback((preset: 'front' | 'perspective' | 'top' | 'side') => {
    setCameraPreset(preset);
    const orbit = orbitRef.current;
    switch (preset) {
      case 'front':
        orbit.rotX = 0.05;
        orbit.rotY = 0.0;
        break;
      case 'perspective':
        orbit.rotX = 0.2;
        orbit.rotY = 0.35;
        break;
      case 'top':
        orbit.rotX = 1.15;
        orbit.rotY = 0.0;
        break;
      case 'side':
        orbit.rotX = 0.1;
        orbit.rotY = 1.45;
        break;
    }
  }, []);

  // Mouse & Touch Orbit Event Handlers
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    orbitRef.current.isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    orbitRef.current.startX = clientX;
    orbitRef.current.startY = clientY;
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!orbitRef.current.isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - orbitRef.current.startX;
    const dy = clientY - orbitRef.current.startY;
    orbitRef.current.startX = clientX;
    orbitRef.current.startY = clientY;

    orbitRef.current.rotY += dx * 0.009;
    orbitRef.current.rotX = Math.max(-0.4, Math.min(1.2, orbitRef.current.rotX + dy * 0.009));
  };

  const handlePointerUp = () => {
    orbitRef.current.isDragging = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center select-none bg-gradient-to-b from-slate-900/5 via-slate-900/10 to-slate-900/20 rounded-2xl border border-slate-200 shadow-inner overflow-hidden ${className}`}
    >
      {/* WebGL 3D Canvas or Accessible Non-WebGL Fallback */}
      {hasWebGL ? (
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full h-80 cursor-grab active:cursor-grabbing block"
          aria-label={`Realistic 3D human hand sign animation for ${signLabel}`}
        />
      ) : (
        <div className="w-full h-80 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50 text-slate-700">
          <AlertCircle className="w-8 h-8 text-amber-600" />
          <h4 className="font-bold text-sm text-slate-900">3D WebGL Acceleration Unavailable</h4>
          <p className="text-xs text-slate-600 max-w-sm">
            Your current browser or system environment has WebGL hardware rendering disabled. You can continue studying the sign below using verified step instructions and visual diagrams.
          </p>
        </div>
      )}

      {/* Camera View Angle Presets */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-xs text-xs z-10">
        {(['front', 'perspective', 'side', 'top'] as const).map((angle) => (
          <button
            key={angle}
            onClick={() => setPresetAngle(angle)}
            className={`px-2 py-1 rounded-lg font-medium capitalize text-[11px] transition-colors ${
              cameraPreset === angle
                ? 'bg-brand-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {angle === 'perspective' ? '3D Angle' : angle}
          </button>
        ))}
      </div>

      {/* Skin Tone Selector */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-200/80 shadow-xs text-xs z-10">
        <span className="text-[10px] text-slate-500 font-semibold mr-0.5">Skin Tone:</span>
        {(Object.keys(SKIN_TONES) as SkinToneId[]).map((toneId) => (
          <button
            key={toneId}
            onClick={() => setSelectedSkinTone(toneId)}
            className={`w-4 h-4 rounded-full border transition-transform ${
              selectedSkinTone === toneId ? 'ring-2 ring-brand-600 scale-110' : 'hover:scale-105'
            }`}
            style={{ backgroundColor: `#${SKIN_TONES[toneId].skinColor.toString(16).padStart(6, '0')}` }}
            title={SKIN_TONES[toneId].label}
            aria-label={`Select ${SKIN_TONES[toneId].label} skin tone`}
          />
        ))}
      </div>

      {/* Anatomical Status Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none z-10">
        <div className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 shadow-xs">
          <Sparkles className="w-3 h-3 text-brand-600" />
          <span className="font-medium">Anatomically Rigged 3D Hand</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500">{isTwoHanded ? '2 Hands Coordinated' : '1 Hand Focused'}</span>
        </div>
      </div>

      {/* Interactive Orbit Drag Hint */}
      <div className="absolute bottom-3 right-3 text-[10px] text-slate-500 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md pointer-events-none border border-slate-200/50">
        Drag to rotate 360°
      </div>
    </div>
  );
};

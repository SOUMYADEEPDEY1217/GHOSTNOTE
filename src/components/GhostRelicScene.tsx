import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Cpu, HardDrive, ChevronRight } from 'lucide-react';
import { RelicLightingMood } from '../types/ghostnote';

export interface GhostRelicSceneProps {
  reducedMotion: boolean;
  lowEffectsMode: boolean;
  onToggleReducedMotion: () => void;
  onToggleLowEffects: () => void;
  onEnterArchive: () => void;
  onOpenWorkspace: () => void;
  onOpenSettings?: () => void;
  archiveCount: number;
  providerStatusLabel: string;
}

// Pre-allocated math helpers outside the render loop to prevent GC pressure
const _dummy = new THREE.Object3D();
const _targetCameraPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 122);
    grad.addColorStop(0, 'rgba(5, 6, 8, 0.88)');
    grad.addColorStop(0.5, 'rgba(8, 9, 12, 0.42)');
    grad.addColorStop(1, 'rgba(10, 11, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createDustParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(243, 244, 246, 0.95)');
    grad.addColorStop(0.4, 'rgba(220, 38, 38, 0.45)');
    grad.addColorStop(1, 'rgba(156, 163, 175, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createProceduralRuneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111317';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.65;

    for (let x = 8; x < 512; x += 16) {
      const h = x % 64 === 0 ? 42 : x % 32 === 0 ? 24 : 12;
      ctx.beginPath();
      ctx.moveTo(x, 64 - h / 2);
      ctx.lineTo(x, 64 + h / 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(512, 22);
    ctx.moveTo(0, 106);
    ctx.lineTo(512, 106);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createArchiveFragmentTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#16181d';
    ctx.fillRect(0, 0, 128, 192);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 120, 184);

    ctx.fillStyle = '#ef4444';
    ctx.globalAlpha = 0.55;
    ctx.fillRect(16, 20, 56, 4);
    ctx.fillStyle = '#d1d5db';
    ctx.globalAlpha = 0.3;
    for (let y = 38; y < 168; y += 10) {
      const lineW = 72 + ((y * 13) % 28);
      ctx.fillRect(16, y, lineW, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export const GhostRelicScene: React.FC<GhostRelicSceneProps> = ({
  reducedMotion,
  lowEffectsMode,
  onToggleReducedMotion,
  onToggleLowEffects,
  onEnterArchive,
  onOpenWorkspace,
  onOpenSettings,
  archiveCount,
  providerStatusLabel,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(true);
  const [lightingMood, setLightingMood] = useState<RelicLightingMood>('silver');
  const [explodedAmount, setExplodedAmount] = useState<number>(0.18);
  const [isArtifactHovered, setIsArtifactHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const reducedMotionRef = useRef(reducedMotion);
  const lowEffectsRef = useRef(lowEffectsMode);
  const lightingMoodRef = useRef<RelicLightingMood>(lightingMood);
  const explodedTargetRef = useRef(explodedAmount);
  const pointerRef = useRef({ x: 0, y: 0 });
  const hoverTargetRef = useRef(0);
  const pulseIntensityRef = useRef(0);
  const cameraDiveRef = useRef(0);
  const onOpenWorkspaceRef = useRef(onOpenWorkspace);
  const transitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    lowEffectsRef.current = lowEffectsMode;
  }, [lowEffectsMode]);

  useEffect(() => {
    lightingMoodRef.current = lightingMood;
  }, [lightingMood]);

  useEffect(() => {
    explodedTargetRef.current = explodedAmount;
  }, [explodedAmount]);

  useEffect(() => {
    onOpenWorkspaceRef.current = onOpenWorkspace;
  }, [onOpenWorkspace]);

  const triggerPortalTransition = useCallback(
    (destination: 'workspace' | 'archive') => {
      if (isTransitioning) return;
      pulseIntensityRef.current = 1.35;

      if (reducedMotionRef.current) {
        if (destination === 'workspace') onOpenWorkspace();
        else onEnterArchive();
        return;
      }

      setIsTransitioning(true);
      cameraDiveRef.current = 1;
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        if (destination === 'workspace') onOpenWorkspace();
        else onEnterArchive();
      }, 520);
    },
    [isTransitioning, onOpenWorkspace, onEnterArchive]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'h' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const isMobileViewport = window.innerWidth < 768;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && !isMobileViewport,
        alpha: true, // Transparent so the reference Ronin/Diagonal Slash background layers shine through
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, isMobileViewport ? 1.5 : 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

    // Scene & Studio Environment Reflection
    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Camera framed so the 3D Spectral Artifact sits harmoniously along the upper-right / center diagonal slash
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const initialXOffset = width >= 1024 ? -0.95 : 0;
    camera.position.set(initialXOffset, 1.85, 6.8);
    camera.lookAt(initialXOffset * 0.4, 1.5, 0);

    // Three-Point Studio & Crimson/Silver Rim Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xd1d5db, 0x090a0f, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf3f4f6, 2.4);
    keyLight.position.set(4.2, 6.8, 4.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.camera.left = -3.5;
      keyLight.shadow.camera.right = 3.5;
      keyLight.shadow.camera.top = 4.5;
      keyLight.shadow.camera.bottom = -1.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      keyLight.shadow.mapSize.set(1024, 1024);
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xdc2626, 3.8, 14, 1.5);
    rimLight.position.set(-2.6, 2.5, -2.8);
    scene.add(rimLight);

    const silverFillLight = new THREE.PointLight(0xe5e7eb, 2.1, 10, 1.6);
    silverFillLight.position.set(2.8, 1.4, 2.4);
    scene.add(silverFillLight);

    const coreLight = new THREE.PointLight(0xef4444, 3.0, 8, 1.7);
    coreLight.position.set(0, 1.64, 0);
    scene.add(coreLight);

    // Multi-Part Procedural Ghostly Reliquary & Spectral Artifact (THREE.Group)
    const relicGroup = new THREE.Group();
    relicGroup.position.set(0, 0, 0);
    scene.add(relicGroup);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const runeTexture = createProceduralRuneTexture(maxAniso);
    const shadowTexture = createContactShadowTexture();
    const fragmentTexture = createArchiveFragmentTexture(maxAniso);
    const dustTexture = createDustParticleTexture();

    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x121418,
      roughness: 0.68,
      metalness: 0.28,
    });

    const brushedSilverMat = new THREE.MeshPhysicalMaterial({
      color: 0xd1d5db,
      roughness: 0.2,
      metalness: 0.94,
      anisotropy: 0.8,
      clearcoat: 0.45,
    });

    const etchedRingMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.32,
      metalness: 0.88,
      map: runeTexture,
      emissive: 0xdc2626,
      emissiveMap: runeTexture,
      emissiveIntensity: 0.45,
    });

    const outerOrbGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe5e7eb,
      roughness: 0.1,
      metalness: 0.06,
      transmission: isSoftwareGl ? 0 : 0.92,
      transparent: true,
      opacity: isSoftwareGl ? 0.38 : 0.95,
      ior: 1.58,
      thickness: 1.6,
      attenuationColor: new THREE.Color(0x9ca3af),
      attenuationDistance: 2.0,
      clearcoat: 1.0,
      emissive: 0x991b1b,
      emissiveIntensity: 0.18,
      depthWrite: false,
    });

    const spectralCoreShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uPulse: { value: 0 },
        uCoreColor: { value: new THREE.Color(0x1f242d) },
        uRimColor: { value: new THREE.Color(0xef4444) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uHover;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vDisplacement;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          float wave = sin(position.x * 6.0 + uTime * 2.2) * cos(position.y * 6.0 - uTime * 1.8) * sin(position.z * 6.0 + uTime * 1.5);
          float amp = 0.035 + uHover * 0.03 + uPulse * 0.09;
          vDisplacement = wave;
          vec3 displaced = position + normal * (wave * amp);
          vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uCoreColor;
        uniform vec3 uRimColor;
        uniform float uHover;
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying float vDisplacement;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, vNormal)), 2.4);
          float pulseBoost = 1.0 + uHover * 0.45 + uPulse * 1.4;
          vec3 base = mix(uCoreColor, uRimColor, clamp(fresnel * 1.15 + vDisplacement * 0.5, 0.0, 1.0));
          vec3 finalColor = base * pulseBoost + uRimColor * fresnel * (0.65 + uPulse * 0.9);
          gl_FragColor = vec4(finalColor, 0.92);
        }
      `,
      transparent: true,
    });

    const archiveTabletMat = new THREE.MeshStandardMaterial({
      color: 0x1f232a,
      roughness: 0.34,
      metalness: 0.68,
      map: fragmentTexture,
      emissive: 0xdc2626,
      emissiveMap: fragmentTexture,
      emissiveIntensity: 0.38,
    });

    // Part 1: Ground Contact Shadow Plane
    const contactShadowGeo = new THREE.PlaneGeometry(4.8, 4.8);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
    });
    const contactShadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadowMesh.rotation.x = -Math.PI / 2;
    contactShadowMesh.position.y = 0.005;
    scene.add(contactShadowMesh);

    // Part 2: Stepped Pedestal
    const lathePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.24, 0.0),
      new THREE.Vector2(1.18, 0.11),
      new THREE.Vector2(0.96, 0.16),
      new THREE.Vector2(0.88, 0.34),
      new THREE.Vector2(0.7, 0.44),
      new THREE.Vector2(0.78, 0.54),
      new THREE.Vector2(0.0, 0.54),
    ];
    const pedestalGeo = new THREE.LatheGeometry(lathePoints, 48);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, obsidianMat);
    pedestalMesh.receiveShadow = !isSoftwareGl;
    pedestalMesh.castShadow = !isSoftwareGl;
    relicGroup.add(pedestalMesh);

    // Part 3: Etched Inscription Collar Ring
    const collarGeo = new THREE.CylinderGeometry(0.79, 0.83, 0.15, 48, 1, true);
    const collarMesh = new THREE.Mesh(collarGeo, etchedRingMat);
    collarMesh.position.y = 0.44;
    relicGroup.add(collarMesh);

    // Part 4: Four Architectural Reliquary Cage Columns
    const cageGroup = new THREE.Group();
    cageGroup.position.y = 0.54;
    relicGroup.add(cageGroup);

    const pillarGeo = new THREE.CylinderGeometry(0.03, 0.04, 2.18, 16);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(pillarGeo, brushedSilverMat);
      pillar.position.set(Math.cos(angle) * 0.7, 1.09, Math.sin(angle) * 0.7);
      pillar.castShadow = !isSoftwareGl;
      cageGroup.add(pillar);
    }

    // Part 5: Upper Reliquary Crown & Finial Spire
    const crownGroup = new THREE.Group();
    crownGroup.position.y = 2.72;
    relicGroup.add(crownGroup);

    const crownRingGeo = new THREE.TorusGeometry(0.7, 0.042, 20, 64);
    const crownRing = new THREE.Mesh(crownRingGeo, brushedSilverMat);
    crownRing.rotation.x = Math.PI / 2;
    crownGroup.add(crownRing);

    const spirePoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.52, 0.0),
      new THREE.Vector2(0.3, 0.18),
      new THREE.Vector2(0.11, 0.48),
      new THREE.Vector2(0.025, 0.8),
      new THREE.Vector2(0.0, 0.88),
    ];
    const spireGeo = new THREE.LatheGeometry(spirePoints, 32);
    const spireMesh = new THREE.Mesh(spireGeo, obsidianMat);
    spireMesh.position.y = 0.02;
    crownGroup.add(spireMesh);

    // Part 6: Outer Astrolabe Meridian Ring
    const outerRingGeo = new THREE.TorusGeometry(1.1, 0.026, 20, 72);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, etchedRingMat);
    outerRingMesh.position.y = 1.64;
    relicGroup.add(outerRingMesh);

    // Part 7: Inner Silver Gyroscopic Ring
    const innerRingGeo = new THREE.TorusGeometry(0.84, 0.02, 16, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, brushedSilverMat);
    innerRingMesh.position.y = 1.64;
    relicGroup.add(innerRingMesh);

    // Part 8: Translucent Ghostly Containment Orb & Shader-Driven Spectral Nucleus
    const coreVesselGeo = new THREE.IcosahedronGeometry(0.54, 2);
    const coreVesselMesh = new THREE.Mesh(coreVesselGeo, outerOrbGlassMat);
    coreVesselMesh.position.y = 1.64;
    coreVesselMesh.renderOrder = 2;
    relicGroup.add(coreVesselMesh);

    const soulNucleusGeo = new THREE.IcosahedronGeometry(0.31, 4);
    const soulNucleusMesh = new THREE.Mesh(soulNucleusGeo, spectralCoreShaderMat);
    soulNucleusMesh.position.y = 1.64;
    soulNucleusMesh.renderOrder = 1;
    relicGroup.add(soulNucleusMesh);

    // Invisible Raycast Proxy Sphere on Layer 1
    const hitProxyGeo = new THREE.SphereGeometry(1.18, 16, 16);
    const hitProxyMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitProxyMesh = new THREE.Mesh(hitProxyGeo, hitProxyMat);
    hitProxyMesh.position.y = 1.64;
    hitProxyMesh.layers.set(1);
    relicGroup.add(hitProxyMesh);

    // Part 9: 24 Floating Archive Fragments (InstancedMesh)
    const tabletGeo = new THREE.BoxGeometry(0.15, 0.23, 0.012);
    const tabletCount = isMobileViewport ? 14 : 24;
    const tabletInstanced = new THREE.InstancedMesh(
      tabletGeo,
      archiveTabletMat,
      tabletCount
    );
    tabletInstanced.frustumCulled = false;

    const tabletMeta: Array<{
      angle: number;
      radius: number;
      baseY: number;
      speed: number;
      scale: number;
      tiltX: number;
      tiltZ: number;
    }> = [];

    for (let i = 0; i < tabletCount; i++) {
      const angle = (i / tabletCount) * Math.PI * 2;
      const radius = 1.38 + (i % 4) * 0.4;
      const baseY = 0.75 + ((i * 7) % 13) * 0.18;
      const speed = 0.12 + (i % 5) * 0.035;
      const scale = 0.72 + (i % 4) * 0.14;
      const tiltX = (i % 2 === 0 ? 1 : -1) * 0.22;
      const tiltZ = ((i % 3) - 1) * 0.18;
      tabletMeta.push({ angle, radius, baseY, speed, scale, tiltX, tiltZ });
    }
    relicGroup.add(tabletInstanced);

    // Part 10: Drifting Spectral Ash & Ember Dust Particles
    const dustCount = isMobileViewport ? 55 : 120;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustSpeeds = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      const r = 0.8 + Math.random() * 4.2;
      const theta = Math.random() * Math.PI * 2;
      dustPositions[i * 3] = Math.cos(theta) * r;
      dustPositions[i * 3 + 1] = 0.2 + Math.random() * 3.6;
      dustPositions[i * 3 + 2] = Math.sin(theta) * r - 0.5;
      dustSpeeds[i] = 0.08 + Math.random() * 0.14;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      map: dustTexture,
      color: 0xe5e7eb,
      size: 0.085,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastRaycastTime = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      pointerRef.current.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointerRef.current.y = THREE.MathUtils.clamp(ny, -1, 1);

      const now = performance.now();
      if (now - lastRaycastTime < 45) return;
      lastRaycastTime = now;

      _pointerNdc.set(nx, ny);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObject(hitProxyMesh, false);
      const hit = hits.length > 0;
      hoverTargetRef.current = hit ? 1 : 0;
      setIsArtifactHovered(hit);
      renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
    };

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      const ny = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      _pointerNdc.set(nx, ny);
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObject(hitProxyMesh, false);

      if (hits.length > 0) {
        pulseIntensityRef.current = 1.5;
        if (reducedMotionRef.current) {
          onOpenWorkspaceRef.current();
        } else {
          setIsTransitioning(true);
          cameraDiveRef.current = 1;
          window.setTimeout(() => {
            onOpenWorkspaceRef.current();
          }, 520);
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    renderer.domElement.addEventListener('click', handleCanvasClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let currentExploded = explodedTargetRef.current;
    let currentHover = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function applyMoodLighting(mood: RelicLightingMood) {
      if (mood === 'silver') {
        // Default Reference Theme: Ash Silver & Crimson Ember
        coreLight.color.setHex(0xef4444);
        rimLight.color.setHex(0xdc2626);
        spectralCoreShaderMat.uniforms.uCoreColor.value.setHex(0x1f242d);
        spectralCoreShaderMat.uniforms.uRimColor.value.setHex(0xef4444);
        outerOrbGlassMat.attenuationColor.setHex(0x9ca3af);
      } else if (mood === 'emerald') {
        coreLight.color.setHex(0x34d399);
        rimLight.color.setHex(0x10b981);
        spectralCoreShaderMat.uniforms.uCoreColor.value.setHex(0x064e3b);
        spectralCoreShaderMat.uniforms.uRimColor.value.setHex(0x6ee7b7);
        outerOrbGlassMat.attenuationColor.setHex(0x10b981);
      } else {
        coreLight.color.setHex(0x9ca3af);
        rimLight.color.setHex(0x4b5563);
        spectralCoreShaderMat.uniforms.uCoreColor.value.setHex(0x0f1115);
        spectralCoreShaderMat.uniforms.uRimColor.value.setHex(0xd1d5db);
        outerOrbGlassMat.attenuationColor.setHex(0x4b5563);
      }
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const isPaused = reducedMotionRef.current;
      const isLowFx = lowEffectsRef.current;

      applyMoodLighting(lightingMoodRef.current);

      dustPoints.visible = !isLowFx;

      currentHover = THREE.MathUtils.damp(currentHover, hoverTargetRef.current, 6, delta);
      pulseIntensityRef.current = THREE.MathUtils.damp(pulseIntensityRef.current, 0, 3.2, delta);
      currentExploded = THREE.MathUtils.damp(
        currentExploded,
        explodedTargetRef.current + currentHover * 0.08 + pulseIntensityRef.current * 0.22,
        5.5,
        delta
      );

      spectralCoreShaderMat.uniforms.uTime.value = isPaused ? 0 : elapsed;
      spectralCoreShaderMat.uniforms.uHover.value = currentHover;
      spectralCoreShaderMat.uniforms.uPulse.value = pulseIntensityRef.current;
      coreLight.intensity = 3.0 + currentHover * 1.4 + pulseIntensityRef.current * 4.5;

      crownGroup.position.y = 2.72 + currentExploded * 0.65;
      cageGroup.position.y = 0.54 + currentExploded * 0.18;

      const floatWave = isPaused ? 0 : Math.sin(elapsed * 1.35) * 0.085;
      coreVesselMesh.position.y = 1.64 + floatWave + currentExploded * 0.32;
      soulNucleusMesh.position.y = coreVesselMesh.position.y;
      hitProxyMesh.position.y = coreVesselMesh.position.y;
      outerRingMesh.position.y = 1.64 + floatWave * 0.5 + currentExploded * 0.32;
      innerRingMesh.position.y = outerRingMesh.position.y;

      const coreScale = 1 + currentHover * 0.06 + pulseIntensityRef.current * 0.18;
      soulNucleusMesh.scale.setScalar(coreScale);
      coreVesselMesh.scale.setScalar(1 + currentHover * 0.03 + pulseIntensityRef.current * 0.1);

      if (!isPaused) {
        const speedMult = 1 + currentHover * 0.65;
        coreVesselMesh.rotation.y += delta * 0.38 * speedMult;
        coreVesselMesh.rotation.z = Math.sin(elapsed * 0.7) * 0.12;

        soulNucleusMesh.rotation.y -= delta * 0.75 * speedMult;
        soulNucleusMesh.rotation.x += delta * 0.45 * speedMult;

        outerRingMesh.rotation.y += delta * 0.32 * speedMult;
        outerRingMesh.rotation.x = Math.sin(elapsed * 0.6) * 0.48 + 0.35;

        innerRingMesh.rotation.z -= delta * 0.46 * speedMult;
        innerRingMesh.rotation.y = Math.cos(elapsed * 0.5) * 0.62;
      }

      const radialSpread = 1 + currentExploded * 0.48;
      for (let i = 0; i < tabletCount; i++) {
        const meta = tabletMeta[i];
        const currentAngle = isPaused ? meta.angle : meta.angle + elapsed * meta.speed;
        const r = meta.radius * radialSpread;
        const yBob = isPaused ? 0 : Math.sin(elapsed * 1.4 + i) * 0.07;

        _dummy.position.set(
          Math.cos(currentAngle) * r,
          meta.baseY + yBob + currentExploded * 0.24,
          Math.sin(currentAngle) * r
        );
        _dummy.rotation.set(
          meta.tiltX,
          -currentAngle + Math.PI / 2,
          meta.tiltZ + (isPaused ? 0 : Math.sin(elapsed * 0.9 + i) * 0.12)
        );
        _dummy.scale.setScalar(meta.scale);
        _dummy.updateMatrix();
        tabletInstanced.setMatrixAt(i, _dummy.matrix);
      }
      tabletInstanced.instanceMatrix.needsUpdate = true;

      if (!isPaused && !isLowFx) {
        const posAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < dustCount; i++) {
          let py = posAttr.getY(i) + delta * dustSpeeds[i];
          if (py > 3.9) py = 0.2;
          posAttr.setY(i, py);
        }
        posAttr.needsUpdate = true;
        dustPoints.rotation.y += delta * 0.035;
      }

      const w = container?.clientWidth || window.innerWidth;
      const baseCamX = w >= 1024 ? -0.95 : 0;
      const parallaxX = isPaused ? 0 : pointerRef.current.x * 0.38;
      const parallaxY = isPaused ? 0 : pointerRef.current.y * 0.24;

      const dive = cameraDiveRef.current;
      if (dive > 0) {
        _targetCameraPos.set(0, 1.64, 1.85);
        _targetLookAt.set(0, 1.64, 0);
        camera.position.lerp(_targetCameraPos, Math.min(1, delta * 5.2));
      } else {
        _targetCameraPos.set(baseCamX + parallaxX, 1.85 + parallaxY, 6.8);
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          _targetCameraPos.x,
          4.2,
          delta
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          _targetCameraPos.y,
          4.2,
          delta
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          _targetCameraPos.z,
          4.2,
          delta
        );
        _targetLookAt.set(baseCamX * 0.4, 1.5, 0);
      }

      camera.lookAt(_targetLookAt);
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      pedestalGeo.dispose();
      collarGeo.dispose();
      pillarGeo.dispose();
      crownRingGeo.dispose();
      spireGeo.dispose();
      outerRingGeo.dispose();
      innerRingGeo.dispose();
      coreVesselGeo.dispose();
      soulNucleusGeo.dispose();
      hitProxyGeo.dispose();
      tabletGeo.dispose();
      dustGeo.dispose();
      contactShadowGeo.dispose();

      obsidianMat.dispose();
      brushedSilverMat.dispose();
      etchedRingMat.dispose();
      outerOrbGlassMat.dispose();
      spectralCoreShaderMat.dispose();
      hitProxyMat.dispose();
      archiveTabletMat.dispose();
      dustMat.dispose();
      contactShadowMat.dispose();

      runeTexture.dispose();
      shadowTexture.dispose();
      fragmentTexture.dispose();
      dustTexture.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <section
      aria-label="GHOSTNOTE Sanctum Landing and Interactive 3D Spectral Artifact"
      className={`relative w-full min-h-[calc(100vh-65px)] flex flex-col justify-between overflow-hidden bg-[#0D0E11] transition-opacity duration-500 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Layer 1: Attached Reference Theme Backdrop (Ronin + Diagonal Ash-Silver Band + Ravens) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-85 pointer-events-none"
        style={{
          backgroundImage: 'url("/assets/aistudio/9f82b5a8075304166d684ed7fa56da8d_70c5112c.jpg")',
        }}
      />

      {/* Layer 2: Crisp Vector Diagonal Silver Slash & Raven Silhouettes Overlay (Resilient even if image is cached/loading) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          background:
            'linear-gradient(148deg, transparent 36%, rgba(168, 172, 178, 0.35) 36.2%, rgba(156, 163, 175, 0.5) 53%, transparent 53.2%)',
        }}
      />

      {/* Subtle Radial Vignette Scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 52% 45%, rgba(13, 14, 17, 0.18) 0%, rgba(10, 11, 14, 0.72) 90%)',
        }}
      />

      {/* Layer 3: Interactive 3D Spectral Artifact Canvas (Transparent alpha over the Ronin & Diagonal Slash) */}
      <div
        ref={canvasMountRef}
        data-artifact-hover={isArtifactHovered ? 'true' : 'false'}
        className="absolute inset-0 w-full h-full pointer-events-auto"
        aria-hidden="true"
      />

      {/* Fallback when WebGL is unavailable */}
      {!webglSupported && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-80 h-80 rounded-full border border-[#9CA3AF]/30 flex items-center justify-center">
            <div className="w-56 h-56 rotate-45 border border-[#DC2626]/40" />
          </div>
        </div>
      )}

      {/* Layer 4: Foreground Semantic UI matching the Reference Layout */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-6 sm:px-10 pt-10 pb-24 flex-1 flex flex-col justify-between pointer-events-none">
        {/* Top / Middle Row: Left Double-Layered Smoked Glass Prompt Card (Directly inspired by reference image) */}
        <div className="my-auto pt-6 pb-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 relative pointer-events-auto">
            {/* Offset Secondary Glass Frame Behind Primary Card (Signature Reference Detail) */}
            <div
              aria-hidden="true"
              className="absolute -left-3.5 top-3.5 w-full h-full rounded-[22px] bg-[#373A40]/35 border border-white/15 pointer-events-none"
            />

            {/* Primary Smoked Glass Card */}
            <div className="relative rounded-[22px] bg-[#32363C]/78 border border-white/25 p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.85)] space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#D1D5DB] font-mono-tabular">
                <span className="text-[#F87171]">GHOSTNOTE ARCHIVE</span>
                <span aria-hidden="true">·</span>
                <span>{providerStatusLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{archiveCount} Folios</span>
              </div>

              <p className="text-base sm:text-lg font-medium text-white leading-relaxed">
                Some memories refuse to stay buried. Are you ready to unearth your forgotten
                notes and transform nocturnal fragments into supernatural manuscripts?
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerPortalTransition('workspace')}
                  className="px-5 py-2.5 text-xs font-semibold tracking-[0.14em] uppercase text-white bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Story Console
                </button>

                <button
                  type="button"
                  onClick={() => triggerPortalTransition('archive')}
                  className="px-5 py-2.5 text-xs font-semibold tracking-[0.14em] uppercase text-[#E5E7EB] bg-[#16181D]/90 hover:bg-[#22262E] border border-white/20 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Browse Catalog
                </button>
              </div>

              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-[#D1D5DB] font-mono-tabular">
                <span>
                  {isArtifactHovered
                    ? '3D Artifact locked — click the orb to enter console'
                    : 'Click the 3D Spectral Artifact to awaken the console'}
                </span>
                <span className="text-[#F87171]">
                  {isArtifactHovered ? 'ACTIVE' : 'READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Large Weathered Stone "GHOSTNOTE" Display Title (Positioned like "LAST" in the reference) */}
          <div className="lg:col-span-7 flex flex-col items-start lg:items-end justify-end mt-12 lg:mt-48 pointer-events-none select-none">
            <h1 className="stone-textured-title font-monolith text-5xl sm:text-7xl xl:text-[5.5rem] font-extrabold tracking-[0.12em] uppercase leading-none">
              GHOSTNOTE
            </h1>
            <p className="mt-2 text-xs sm:text-sm font-mono-tabular tracking-[0.28em] uppercase text-[#9CA3AF]">
              SUPERNATURAL DIGITAL DIARY
            </p>
          </div>
        </div>

        {/* Bottom Bar matching the exact 3-zone Reference Footer (Left Platform Badges | Center Bracketed Button | Right Next >) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 pointer-events-auto">
          {/* Bottom-Left: Available Engines Badges (Styled after "Available Platforms: Windows | PlayStation") */}
          <div className="flex flex-col items-center sm:items-start gap-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#111317] bg-[#9CA3AF]/85 px-2 py-0.5 rounded-sm underline decoration-[#111317]/60">
              Available Engines
            </span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => (onOpenSettings ? onOpenSettings() : onOpenWorkspace())}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#6B7280]/80 hover:bg-[#4B5563] text-[#0D0E11] font-semibold text-xs border border-black/20 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>Local Ollama</span>
              </button>

              <button
                type="button"
                onClick={() => triggerPortalTransition('archive')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[#6B7280]/80 hover:bg-[#4B5563] text-[#0D0E11] font-semibold text-xs border border-black/20 shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <HardDrive className="w-4 h-4" />
                <span>Browser Vault</span>
              </button>
            </div>
          </div>

          {/* Bottom-Center: Bracketed Crimson Button (Matching the [ DOWNLOAD ] button in reference) */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => triggerPortalTransition('archive')}
              className="crimson-bracket-btn px-10 py-3.5 rounded-sm text-sm sm:text-base font-bold tracking-[0.2em] uppercase text-[#B91C1C] hover:text-[#EF4444] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EF4444]"
            >
              ENTER ARCHIVE
            </button>
          </div>

          {/* Bottom-Right: "Next >" Action & 3D Controls Toggle */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#D1D5DB] hover:text-white bg-[#14161B]/90 border border-white/15 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>3D Controls (H)</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide 3D Controls</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => triggerPortalTransition('workspace')}
              className="inline-flex items-center gap-1 text-lg sm:text-xl font-medium text-[#E5E7EB] hover:text-[#F87171] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible 3D Artifact Controls Drawer */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-30 w-[min(880px,92vw)] pointer-events-auto transition-all duration-200 bg-[#121418]/95 border border-white/20 rounded-lg px-4 py-3 shadow-2xl ${
          dockCollapsed
            ? 'opacity-0 translate-y-6 pointer-events-none h-0 py-0 overflow-hidden border-0'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <label
              htmlFor="relic-exploded-slider"
              className="text-[#D1D5DB] font-medium whitespace-nowrap shrink-0"
            >
              Artifact Containment
            </label>
            <input
              id="relic-exploded-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={explodedAmount}
              onChange={(e) => setExplodedAmount(parseFloat(e.target.value))}
              className="w-24 sm:w-28 accent-[#DC2626] cursor-pointer"
            />
            <span className="text-white font-mono-tabular w-9">
              {Math.round(explodedAmount * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0C0E] p-1 rounded-md border border-white/10">
            {(
              [
                { id: 'silver', label: 'Crimson & Ash' },
                { id: 'emerald', label: 'Spectral Emerald' },
                { id: 'abyss', label: 'Obsidian Monochrome' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setLightingMood(preset.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lightingMood === preset.id
                    ? 'bg-[#272B33] text-white border border-white/25'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLowEffects}
              className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                lowEffectsMode
                  ? 'bg-[#991B1B] text-white border-[#F87171]/50'
                  : 'bg-[#181B20] text-[#D1D5DB] hover:text-white border-white/15'
              }`}
            >
              {lowEffectsMode ? 'Low Effects: On' : 'Low Effects: Off'}
            </button>

            <button
              type="button"
              onClick={onToggleReducedMotion}
              className="px-2.5 py-1.5 rounded bg-[#181B20] hover:bg-[#262A32] text-[#E5E7EB] border border-white/15 transition-colors whitespace-nowrap shrink-0"
            >
              {reducedMotion ? 'Resume Orbit' : 'Pause Orbit'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GhostRelicScene;

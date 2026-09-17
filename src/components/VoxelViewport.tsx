import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { Move, RotateCw, Maximize2, Box, Sparkles } from 'lucide-react';
import { BlockFrameEntity, MinetestNodeMetadata, MINETEST_NODES, Vector3D } from '../types';
import { loadVoxelTexture } from '../textureUtils';

interface VoxelViewportProps {
  entities: BlockFrameEntity[];
  selectedIds: string[];
  onSelectEntity: (id: string | null) => void;
  activePreview: {
    node: string;
    size: Vector3D;
    rotate: Vector3D;
    mirror: 'none' | 'x' | 'y' | 'z';
    glow: number;
    collision: boolean;
    nodeMode: boolean;
  } | null;
  onPlaceEntity: (pos: Vector3D, nodeOverride?: string) => void;
  gridSnap: number;
  activeTool: 'select' | 'add' | 'delete' | 'measure';
  showGrid: boolean;
  availableNodes?: MinetestNodeMetadata[];
  gizmoMode?: 'translate' | 'rotate' | 'scale';
  onGizmoModeChange?: (mode: 'translate' | 'rotate' | 'scale') => void;
  onTransformCommit?: (id: string, pos: Vector3D, rotate: Vector3D, size: Vector3D) => void;
  onDropEntity?: (nodeId: string, pos: Vector3D) => void;
}

export default function VoxelViewport({
  entities,
  selectedIds,
  onSelectEntity,
  activePreview,
  onPlaceEntity,
  gridSnap,
  activeTool,
  showGrid,
  availableNodes = MINETEST_NODES,
  gizmoMode: externalGizmoMode,
  onGizmoModeChange,
  onTransformCommit,
  onDropEntity,
}: VoxelViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const floorPlaneMeshRef = useRef<THREE.Mesh | null>(null);
  const isGizmoDraggingRef = useRef(false);

  // Gizmo Mode State
  const [internalGizmoMode, setInternalGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const activeGizmoMode = externalGizmoMode || internalGizmoMode;

  const handleSetGizmoMode = (mode: 'translate' | 'rotate' | 'scale') => {
    setInternalGizmoMode(mode);
    onGizmoModeChange?.(mode);
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(mode);
    }
  };

  // Cursor coordinates snapped to grid
  const [hoveredCoords, setHoveredCoords] = useState<Vector3D | null>(null);
  // Drag & drop coordinates preview
  const [dragHoverCoords, setDragHoverCoords] = useState<Vector3D | null>(null);
  const [draggedItemName, setDraggedItemName] = useState<string | null>(null);
  // Live transform indicator
  const [liveTransformInfo, setLiveTransformInfo] = useState<string | null>(null);

  // References to keep event handlers with latest states
  const statesRef = useRef({
    activeTool,
    gridSnap,
    activePreview,
    onPlaceEntity,
    onSelectEntity,
    onTransformCommit,
    onDropEntity,
    entities,
    selectedIds,
    activeGizmoMode,
  });

  useEffect(() => {
    statesRef.current = {
      activeTool,
      gridSnap,
      activePreview,
      onPlaceEntity,
      onSelectEntity,
      onTransformCommit,
      onDropEntity,
      entities,
      selectedIds,
      activeGizmoMode,
    };
  }, [
    activeTool,
    gridSnap,
    activePreview,
    onPlaceEntity,
    onSelectEntity,
    onTransformCommit,
    onDropEntity,
    entities,
    selectedIds,
    activeGizmoMode,
  ]);

  // Keyboard shortcuts for gizmo modes (W, E, R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'w' || e.key === 'W') {
        handleSetGizmoMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        handleSetGizmoMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        handleSetGizmoMode('scale');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper: calculate exact voxel snapped position
  const getSnappedVoxelPosition = (hit: THREE.Intersection): Vector3D => {
    const step = statesRef.current.gridSnap > 0 ? statesRef.current.gridSnap : 1;

    if (hit.object.name === 'voxel_block') {
      const blockId = hit.object.userData?.id;
      const ent = statesRef.current.entities.find(e => e.id === blockId);

      const normal = hit.face?.normal ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
      normal.transformDirection(hit.object.matrixWorld);

      const absX = Math.abs(normal.x);
      const absY = Math.abs(normal.y);
      const absZ = Math.abs(normal.z);

      let dx = 0, dy = 0, dz = 0;
      if (absX >= absY && absX >= absZ) {
        dx = Math.sign(normal.x);
      } else if (absY >= absX && absY >= absZ) {
        dy = Math.sign(normal.y);
      } else {
        dz = Math.sign(normal.z);
      }

      if (ent) {
        const nx = ent.pos.x + dx * step;
        const ny = Math.max(0, ent.pos.y + dy * step);
        const nz = ent.pos.z + dz * step;
        return {
          x: Math.round(nx * 1000) / 1000,
          y: Math.round(ny * 1000) / 1000,
          z: Math.round(nz * 1000) / 1000,
        };
      }
    }

    const sx = Math.round(hit.point.x / step) * step;
    const sy = 0;
    const sz = Math.round(hit.point.z / step) * step;
    return {
      x: Math.round(sx * 1000) / 1000,
      y: Math.max(0, Math.round(sy * 1000) / 1000),
      z: Math.round(sz * 1000) / 1000,
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0b10');
    sceneRef.current = scene;
    scene.fog = new THREE.Fog('#0a0b10', 45, 140);

    // 2. Camera Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 12, 15);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1;
    controls.minDistance = 3;
    controls.maxDistance = 60;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // 5. 3D Gizmo TransformControls Setup
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.setMode(statesRef.current.activeGizmoMode);
    transformControls.setSize(0.85);

    if (statesRef.current.gridSnap > 0) {
      transformControls.setTranslationSnap(statesRef.current.gridSnap);
      transformControls.setRotationSnap((15 * Math.PI) / 180);
      transformControls.setScaleSnap(0.05);
    }

    const transformHelper = transformControls.getHelper();
    scene.add(transformHelper);
    transformControlsRef.current = transformControls;

    // Gizmo Event Listeners
    transformControls.addEventListener('dragging-changed', (event: any) => {
      const isDragging = !!event.value;
      isGizmoDraggingRef.current = isDragging;
      if (controlsRef.current) {
        controlsRef.current.enabled = !isDragging;
      }

      if (!isDragging) {
        setLiveTransformInfo(null);
        // Commit final state to history & parent state
        const mesh = transformControls.object;
        if (mesh && mesh.userData?.id) {
          const id = mesh.userData.id;
          const finalPos: Vector3D = {
            x: Math.round(mesh.position.x * 1000) / 1000,
            y: Math.max(0, Math.round(mesh.position.y * 1000) / 1000),
            z: Math.round(mesh.position.z * 1000) / 1000,
          };
          const finalRot: Vector3D = {
            x: Math.round(((mesh.rotation.x * 180) / Math.PI) * 10) / 10,
            y: Math.round(((mesh.rotation.y * 180) / Math.PI) * 10) / 10,
            z: Math.round(((mesh.rotation.z * 180) / Math.PI) * 10) / 10,
          };
          const finalSize: Vector3D = {
            x: Math.max(0.05, Math.round(mesh.scale.x * 1000) / 1000),
            y: Math.max(0.05, Math.round(mesh.scale.y * 1000) / 1000),
            z: Math.max(0.05, Math.round(mesh.scale.z * 1000) / 1000),
          };

          statesRef.current.onTransformCommit?.(id, finalPos, finalRot, finalSize);
        }
      }
    });

    transformControls.addEventListener('objectChange', () => {
      const mesh = transformControls.object;
      if (mesh) {
        const mode = transformControls.getMode();
        if (mode === 'translate') {
          setLiveTransformInfo(
            `X: ${mesh.position.x.toFixed(2)}  Y: ${mesh.position.y.toFixed(2)}  Z: ${mesh.position.z.toFixed(2)}`
          );
        } else if (mode === 'rotate') {
          const rx = Math.round((mesh.rotation.x * 180) / Math.PI);
          const ry = Math.round((mesh.rotation.y * 180) / Math.PI);
          const rz = Math.round((mesh.rotation.z * 180) / Math.PI);
          setLiveTransformInfo(`Rot X: ${rx}°  Y: ${ry}°  Z: ${rz}°`);
        } else if (mode === 'scale') {
          setLiveTransformInfo(
            `Tam X: ${mesh.scale.x.toFixed(2)}  Y: ${mesh.scale.y.toFixed(2)}  Z: ${mesh.scale.z.toFixed(2)}`
          );
        }
      }
    });

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight('#293556', 1.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.0);
    dirLight.position.set(15, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight('#794dfc', 8, 30);
    pointLight.position.set(-6, 8, -6);
    scene.add(pointLight);

    // 7. Grid Floor & Coordinate Guidelines
    // Visual studio base floor plate (provides depth and ground contrast for blocks)
    const platformSize = 48;
    const baseFloorGeo = new THREE.PlaneGeometry(platformSize, platformSize);
    baseFloorGeo.rotateX(-Math.PI / 2);
    const baseFloorMat = new THREE.MeshStandardMaterial({
      color: '#131522',
      roughness: 0.88,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const baseFloorMesh = new THREE.Mesh(baseFloorGeo, baseFloorMat);
    baseFloorMesh.position.y = -0.01;
    baseFloorMesh.receiveShadow = true;
    baseFloorMesh.name = 'visual_floor';
    scene.add(baseFloorMesh);

    // Platform edge outline border
    const platformBorderGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(platformSize, 0.05, platformSize));
    const platformBorderMat = new THREE.LineBasicMaterial({ color: '#06b6d4', linewidth: 2, transparent: true, opacity: 0.7 });
    const platformBorder = new THREE.LineSegments(platformBorderGeo, platformBorderMat);
    platformBorder.position.y = -0.02;
    platformBorder.name = 'grid_boundary';
    scene.add(platformBorder);

    // Primary High-contrast Grid (Center line Cyan #06b6d4, Grid cells clear slate #64748b)
    const gridHelper = new THREE.GridHelper(platformSize, platformSize, '#06b6d4', '#64748b');
    gridHelper.position.y = 0.002;
    gridHelper.receiveShadow = true;
    gridHelper.name = 'grid_helper';
    scene.add(gridHelper);

    // Outer subtle contextual grid (64x64)
    const extGridHelper = new THREE.GridHelper(80, 40, '#334155', '#1e293b');
    extGridHelper.position.y = -0.015;
    extGridHelper.name = 'ext_grid_helper';
    scene.add(extGridHelper);

    // Coordinate Axes lines (X = Red, Y = Green, Z = Blue)
    const axisMatY = new THREE.LineBasicMaterial({ color: '#22c55e', linewidth: 3 });
    const axisMatX = new THREE.LineBasicMaterial({ color: '#ef4444', linewidth: 3 });
    const axisMatZ = new THREE.LineBasicMaterial({ color: '#3b82f6', linewidth: 3 });

    const axisLineY = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, platformSize / 2, 0)]),
      axisMatY
    );
    axisLineY.name = 'axis_y';
    scene.add(axisLineY);

    const axisLineX = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-platformSize / 2, 0.005, 0), new THREE.Vector3(platformSize / 2, 0.005, 0)]),
      axisMatX
    );
    axisLineX.name = 'axis_x';
    scene.add(axisLineX);

    const axisLineZ = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.005, -platformSize / 2), new THREE.Vector3(0, 0.005, platformSize / 2)]),
      axisMatZ
    );
    axisLineZ.name = 'axis_z';
    scene.add(axisLineZ);

    // Origin Reference Box Wireframe
    const originBoxWire = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.85 })
    );
    originBoxWire.position.set(0, 0.5, 0);
    originBoxWire.name = 'origin_box';
    scene.add(originBoxWire);

    // Invisible boundary for raycasting floor interactions
    const floorPlaneGeo = new THREE.PlaneGeometry(200, 200);
    floorPlaneGeo.rotateX(-Math.PI / 2);
    const floorPlaneMesh = new THREE.Mesh(
      floorPlaneGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    floorPlaneMesh.name = 'floor_plane';
    scene.add(floorPlaneMesh);
    floorPlaneMeshRef.current = floorPlaneMesh;

    // 8. Raycasting logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current || !rendererRef.current) return;
      if (isGizmoDraggingRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const objectsToIntersect: THREE.Object3D[] = [floorPlaneMesh];
      scene.children.forEach(c => {
        if (c.name === 'voxel_block') {
          objectsToIntersect.push(c);
        }
      });

      const intersects = raycaster.intersectObjects(objectsToIntersect);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const snapped = getSnappedVoxelPosition(hit);
        setHoveredCoords(snapped);
      } else {
        setHoveredCoords(null);
      }
    };

    const handleMouseClick = (event: MouseEvent) => {
      if (isGizmoDraggingRef.current) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (!containerRef.current || !rendererRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const clickRaycaster = new THREE.Raycaster();
      clickRaycaster.setFromCamera(clickMouse, camera);

      const blocks = scene.children.filter(c => c.name === 'voxel_block');
      const intersects = clickRaycaster.intersectObjects([...blocks, floorPlaneMesh]);

      if (intersects.length > 0) {
        const hit = intersects[0];

        if (statesRef.current.activeTool === 'select') {
          if (hit.object.name === 'voxel_block') {
            const blockId = hit.object.userData?.id;
            statesRef.current.onSelectEntity(blockId || null);
          } else {
            statesRef.current.onSelectEntity(null);
          }
        } else if (statesRef.current.activeTool === 'delete') {
          if (hit.object.name === 'voxel_block') {
            const blockId = hit.object.userData?.id;
            if (blockId) {
              statesRef.current.onSelectEntity(blockId);
            }
          }
        } else if (statesRef.current.activeTool === 'add') {
          const snapped = getSnappedVoxelPosition(hit);
          statesRef.current.onPlaceEntity(snapped);
        }
      }
    };

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('pointerup', handleMouseClick);
    renderer.domElement.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    // 9. Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current) {
        rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
        rendererRef.current.domElement.removeEventListener('pointerup', handleMouseClick);
        rendererRef.current.domElement.removeEventListener('contextmenu', handleContextMenu);
      }
      window.removeEventListener('resize', handleResize);
      transformControls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update Gizmo Mode & Snapping
  useEffect(() => {
    if (!transformControlsRef.current) return;
    transformControlsRef.current.setMode(activeGizmoMode);

    if (gridSnap > 0) {
      transformControlsRef.current.setTranslationSnap(gridSnap);
      transformControlsRef.current.setRotationSnap((15 * Math.PI) / 180);
      transformControlsRef.current.setScaleSnap(0.05);
    } else {
      transformControlsRef.current.setTranslationSnap(null);
      transformControlsRef.current.setRotationSnap(null);
      transformControlsRef.current.setScaleSnap(null);
    }
  }, [activeGizmoMode, gridSnap]);

  // Update scene when entities, selection state, preview block, or visibility helpers edit
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Do not rebuild meshes if user is currently dragging gizmo handles
    if (isGizmoDraggingRef.current) return;

    // Detach gizmo before rebuilding
    if (transformControlsRef.current) {
      transformControlsRef.current.detach();
    }

    // Remove old blocks and preview objects
    const itemsToRemove = scene.children.filter(
      child =>
        child.name === 'voxel_block' ||
        child.name === 'dynamic_preview' ||
        child.name === 'selection_box' ||
        child.name === 'drag_preview'
    );
    itemsToRemove.forEach(item => scene.remove(item));

    // Hide or show grid and floor guidelines
    scene.children.forEach(child => {
      if (
        child instanceof THREE.GridHelper ||
        child.name === 'grid_helper' ||
        child.name === 'visual_floor' ||
        child.name === 'grid_boundary' ||
        child.name === 'ext_grid_helper' ||
        child.name === 'axis_x' ||
        child.name === 'axis_z' ||
        child.name === 'axis_y' ||
        child.name === 'origin_box'
      ) {
        child.visible = showGrid;
      }
    });

    const getNodeMetadata = (nodeId: string) => {
      return availableNodes.find(n => n.id === nodeId);
    };

    const textureLoader = new THREE.TextureLoader();
    const loadedTextures: { [url: string]: THREE.Texture } = {};

    let targetSelectedMesh: THREE.Object3D | null = null;

    // Render Placed Entities
    entities.forEach(ent => {
      const metadata = getNodeMetadata(ent.node);
      const blockColor = ent.color || (metadata ? metadata.color : '#8a8a8a');
      const isSelected = selectedIds.includes(ent.id);
      const isLightNode = ent.args.glow > 0;

      let materialRef: THREE.MeshPhysicalMaterial | null = null;

      const textureMap = loadVoxelTexture(ent.node, blockColor, (updatedTex) => {
        if (materialRef) {
          materialRef.map = updatedTex;
          materialRef.color.set('#ffffff');
          materialRef.needsUpdate = true;
        }
      });

      const hasValidTexture = !!textureMap;
      const isNodeMode = ent.args.node !== false;
      let blockMesh: THREE.Object3D;
      const wireframeGeometry = new THREE.BoxGeometry(1, 1, 1);

      if (isNodeMode) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(hasValidTexture ? '#ffffff' : blockColor),
          map: textureMap || undefined,
          roughness: hasValidTexture ? 0.7 : 0.2,
          metalness:
            ent.node.includes('steel') || ent.node.includes('gold') || ent.node.includes('copper') ? 0.8 : 0.1,
          transparent: ent.node.includes('glass') || hasValidTexture,
          opacity: ent.node.includes('glass') ? 0.4 : 1.0,
          emissive: isLightNode ? new THREE.Color(blockColor) : new THREE.Color('#000000'),
          emissiveIntensity: isLightNode ? (ent.args.glow / 15) * 1.5 : 0,
        });
        materialRef = material;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = !ent.node.includes('glass');
        mesh.receiveShadow = true;
        blockMesh = mesh;
      } else {
        const planeGeo = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(hasValidTexture ? '#ffffff' : blockColor),
          map: textureMap || undefined,
          roughness: 0.6,
          metalness: 0.1,
          transparent: true,
          opacity: 1.0,
          side: THREE.DoubleSide,
          alphaTest: 0.2,
          emissive: isLightNode ? new THREE.Color(blockColor) : new THREE.Color('#000000'),
          emissiveIntensity: isLightNode ? (ent.args.glow / 15) * 1.5 : 0,
        });
        materialRef = material;

        const singleFace = new THREE.Mesh(planeGeo, material);
        singleFace.castShadow = true;
        singleFace.receiveShadow = true;
        blockMesh = singleFace;
      }

      blockMesh.name = 'voxel_block';
      blockMesh.position.set(ent.pos.x, ent.pos.y, ent.pos.z);
      blockMesh.scale.set(ent.args.size.x, ent.args.size.y, ent.args.size.z);

      blockMesh.rotation.set(
        (ent.args.rotate.x * Math.PI) / 180,
        (ent.args.rotate.y * Math.PI) / 180,
        (ent.args.rotate.z * Math.PI) / 180
      );

      blockMesh.userData = { id: ent.id, node: ent.node };
      scene.add(blockMesh);

      if (isSelected) {
        targetSelectedMesh = blockMesh;

        // Selection boundary line
        const edgeGeo = new THREE.EdgesGeometry(wireframeGeometry);
        const lineMat = new THREE.LineBasicMaterial({ color: '#38bdf8', linewidth: 3 });
        const outline = new THREE.LineSegments(edgeGeo, lineMat);
        outline.name = 'selection_box';
        outline.position.copy(blockMesh.position);
        outline.scale.copy(blockMesh.scale);
        outline.rotation.copy(blockMesh.rotation);
        scene.add(outline);
      }
    });

    // Attach 3D Gizmo to selected block
    if (targetSelectedMesh && transformControlsRef.current && (activeTool === 'select' || activeTool === 'measure')) {
      transformControlsRef.current.attach(targetSelectedMesh);
    }

    // Render Drag and Drop Ghost Preview in 3D
    if (dragHoverCoords) {
      const dragGeo = new THREE.BoxGeometry(1, 1, 1);
      const dragMat = new THREE.MeshBasicMaterial({
        color: '#06b6d4',
        wireframe: true,
        transparent: true,
        opacity: 0.9,
      });
      const dragMesh = new THREE.Mesh(dragGeo, dragMat);
      dragMesh.name = 'drag_preview';
      dragMesh.position.set(dragHoverCoords.x, dragHoverCoords.y + 0.5, dragHoverCoords.z);
      scene.add(dragMesh);

      // Floor marker
      const ringGeo = new THREE.RingGeometry(0.2, 0.6, 16);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: '#22d3ee', side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.name = 'drag_preview';
      ringMesh.position.set(dragHoverCoords.x, 0.02, dragHoverCoords.z);
      scene.add(ringMesh);
    }

    // Render Active Temporary Ghost Preview Snapping To Cursor
    if (activePreview && hoveredCoords && activeTool === 'add' && !dragHoverCoords) {
      const metadata = getNodeMetadata(activePreview.node);
      const pColor = metadata ? metadata.color : '#ffffaa';
      const isLightNode = activePreview.glow > 0;

      const textureMap = loadVoxelTexture(activePreview.node, pColor);
      const isPreviewNodeMode = activePreview.nodeMode !== false;
      let previewMesh: THREE.Object3D;

      if (isPreviewNodeMode) {
        const previewGeo = new THREE.BoxGeometry(1, 1, 1);
        const previewMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(textureMap ? '#ffffff' : pColor),
          map: textureMap || undefined,
          transparent: true,
          opacity: 0.75,
          roughness: 0.5,
          emissive: new THREE.Color(pColor),
          emissiveIntensity: isLightNode ? activePreview.glow / 15 + 0.5 : 0.3,
        });
        previewMesh = new THREE.Mesh(previewGeo, previewMat);
      } else {
        const planeGeo = new THREE.PlaneGeometry(1, 1);
        const previewMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(textureMap ? '#ffffff' : pColor),
          map: textureMap || undefined,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          alphaTest: 0.2,
          emissive: new THREE.Color(pColor),
          emissiveIntensity: isLightNode ? activePreview.glow / 15 + 0.5 : 0.3,
        });
        previewMesh = new THREE.Mesh(planeGeo, previewMat);
      }

      previewMesh.name = 'dynamic_preview';
      previewMesh.position.set(hoveredCoords.x, hoveredCoords.y, hoveredCoords.z);
      previewMesh.scale.set(activePreview.size.x, activePreview.size.y, activePreview.size.z);

      previewMesh.rotation.set(
        (activePreview.rotate.x * Math.PI) / 180,
        (activePreview.rotate.y * Math.PI) / 180,
        (activePreview.rotate.z * Math.PI) / 180
      );

      scene.add(previewMesh);

      // Floor marker
      const circleGeo = new THREE.RingGeometry(0, 0.4, 4);
      circleGeo.rotateX(-Math.PI / 2);
      const circleMat = new THREE.MeshBasicMaterial({
        color: '#00ffff',
        wireframe: true,
        transparent: true,
        opacity: 0.8,
      });
      const placementHelper = new THREE.Mesh(circleGeo, circleMat);
      placementHelper.name = 'dynamic_preview';
      placementHelper.position.set(hoveredCoords.x, 0.02, hoveredCoords.z);
      scene.add(placementHelper);
    }
  }, [entities, selectedIds, activePreview, hoveredCoords, dragHoverCoords, activeTool, showGrid]);

  // HTML5 Drag and Drop Handlers for dragging items from sidebar directly into 3D scene
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    if (!containerRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const blocks = sceneRef.current.children.filter(c => c.name === 'voxel_block');
    const floor = floorPlaneMeshRef.current;
    if (!floor) return;

    const hits = raycaster.intersectObjects([...blocks, floor]);
    if (hits.length > 0) {
      const snapped = getSnappedVoxelPosition(hits[0]);
      setDragHoverCoords(snapped);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving container
    if (e.currentTarget === e.target) {
      setDragHoverCoords(null);
      setDraggedItemName(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragHoverCoords(null);
    setDraggedItemName(null);

    let nodeId = '';
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const item = JSON.parse(raw);
        nodeId = item.id;
      }
    } catch {}

    if (!nodeId) {
      nodeId = e.dataTransfer.getData('text/plain');
    }

    if (!nodeId) return;

    if (!containerRef.current || !rendererRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = rendererRef.current.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const blocks = sceneRef.current.children.filter(c => c.name === 'voxel_block');
    const floor = floorPlaneMeshRef.current;
    if (!floor) return;

    const hits = raycaster.intersectObjects([...blocks, floor]);
    if (hits.length > 0) {
      const snapped = getSnappedVoxelPosition(hits[0]);
      if (statesRef.current.onDropEntity) {
        statesRef.current.onDropEntity(nodeId, snapped);
      } else {
        statesRef.current.onPlaceEntity(snapped, nodeId);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-full h-[550px] md:h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl"
    >
      {/* 3D WebGL target */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating 3D Gizmo Transformation Modes Header (Mover XYZ, Girar XYZ, Redimensionar XYZ) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-[#12131d]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl select-none">
        <button
          onClick={() => handleSetGizmoMode('translate')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeGizmoMode === 'translate'
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Arrastar eixos XYZ (Translate) - Tecla: W"
        >
          <Move className="w-3.5 h-3.5" />
          <span>Mover XYZ</span>
          <span className="text-[10px] opacity-70 border border-current px-1 rounded">W</span>
        </button>

        <button
          onClick={() => handleSetGizmoMode('rotate')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeGizmoMode === 'rotate'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Girar eixos XYZ (Rotate) - Tecla: E"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Girar XYZ</span>
          <span className="text-[10px] opacity-70 border border-current px-1 rounded">E</span>
        </button>

        <button
          onClick={() => handleSetGizmoMode('scale')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeGizmoMode === 'scale'
              ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          title="Redimensionar eixos XYZ (Scale) - Tecla: R"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Escalar XYZ</span>
          <span className="text-[10px] opacity-70 border border-current px-1 rounded">R</span>
        </button>
      </div>

      {/* Sci-Fi UI Overlay */}
      <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none text-xs font-mono bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-850 text-slate-300 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold uppercase text-slate-100">SISTEMA 3D</span>
        </div>
        <div>
          Gizmo Ativo:{' '}
          <span className="text-cyan-400 font-bold capitalize">{activeGizmoMode} (XYZ)</span>
        </div>
        <div>
          Grid Snap: <span className="text-cyan-400 font-bold">{gridSnap}m</span>
        </div>
        <div>
          Blocos na Cena: <span className="text-emerald-400 font-bold">{entities.length}</span>
        </div>
        {hoveredCoords && (
          <div className="text-[10px] text-slate-400 border-t border-slate-900 mt-1 pt-1">
            Mira: x:{hoveredCoords.x} y:{hoveredCoords.y} z:{hoveredCoords.z}
          </div>
        )}
      </div>

      {/* Live Transform Feedback Indicator (shown while dragging gizmo handles) */}
      {liveTransformInfo && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 px-3 py-1 bg-slate-900/90 border border-cyan-500/60 text-cyan-300 rounded-lg text-xs font-mono shadow-xl pointer-events-none animate-in fade-in">
          {liveTransformInfo}
        </div>
      )}

      {/* Drag & Drop Visual Drop Zone Notice */}
      {dragHoverCoords && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-200 rounded-xl text-xs font-mono shadow-2xl pointer-events-none flex items-center gap-2 backdrop-blur-md animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>Solte para colocar em [{dragHoverCoords.x}, {dragHoverCoords.y}, {dragHoverCoords.z}]</span>
        </div>
      )}

      {/* Axis Indicator (X=Red, Y=Green, Z=Blue) */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none select-none font-mono">
        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-[10px] font-bold text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
          Y
        </div>
        <div className="flex gap-1.5 text-[9px] text-slate-400 font-bold bg-[#10121a]/80 px-2 py-0.5 rounded border border-slate-800">
          <span className="text-rose-400">X</span>
          <span className="text-emerald-400">Y</span>
          <span className="text-blue-400">Z</span>
        </div>
      </div>

      {/* Hint instructions footer */}
      {showGrid && (
        <div className="absolute bottom-4 right-4 text-[10px] font-mono bg-slate-900/80 backdrop-blur-md text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800 pointer-events-none flex items-center gap-2">
          <span>Arraste itens da esquerda</span>
          <span>•</span>
          <span>Gizmo: W / E / R</span>
          <span>•</span>
          <span>Câmera: Botão Esquerdo / Direito</span>
        </div>
      )}
    </div>
  );
}

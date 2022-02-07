import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxBufferGeometry,
  TorusBufferGeometry,
  MeshBasicMaterial,
  Mesh,
  PlaneBufferGeometry,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
  Color,
  PointLight,
  SpotLight,
  HemisphereLight,
  AmbientLight,
  Clock,
} from "./three.module.js";

import { OrbitControls } from './OrbitControls.js'


let scene, camera, renderer, plan, raycaster, mouse, boxes, amblight, controls;
let isMouseDown = false;

let clk = new Clock();
setupScene();
initialise();

function setupScene() {
  scene = new Scene();
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 4;
  camera.position.y = 2;
  camera.position.x = 2;
  
  plan = new Mesh(new PlaneBufferGeometry(10, 10), new MeshStandardMaterial({visible:true}));
  plan.rotation.x = - Math.PI / 2;
  amblight = new AmbientLight(0xACACAC, 0.8);

  raycaster = new Raycaster();
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  renderer.setAnimationLoop(animate);
  renderer.domElement.addEventListener("pointerdown", mouseDown);
  renderer.domElement.addEventListener("pointermove", mouseMove);
  renderer.domElement.addEventListener("pointerup", mouseUp);
  controls = new OrbitControls( camera, renderer.domElement );
  const light = new PointLight(0xffffff, 1.0);
  light.position.y = 1.5;
  scene.add(light);
  scene.add(plan);
  scene.add(amblight);
  controls.update();
  window.addEventListener('resize', resize );
}
function resize(){
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function animate() {
  let t = clk.getElapsedTime();
  renderer.render(scene, camera);
}

function initialise(){
  boxes = []
  boxes.push(new Mesh(new BoxBufferGeometry(), new MeshStandardMaterial({color:0x00ff00, depthTest: false})));
  boxes.push(new Mesh(new BoxBufferGeometry(), new MeshStandardMaterial({color:0xffff00, depthTest: false})));
  boxes.push(new Mesh(new BoxBufferGeometry(), new MeshStandardMaterial({color:0x00ffff, depthTest: false})));

  boxes.forEach(box=>{
    box.position.y = 0.6;
    box.renderOrder = Math.round(10* Math.random()); 
    box.position.x = 5 * Math.random();
    box.position.z = 5 * Math.random();
    scene.add(box);
  });
  


}


function getPointer(e) {
  return new Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
}
function mouseDown(e) {
  mouse = getPointer(e);
  /* raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects();
  if (intersects.length > 0) {
    isMouseDown = true;
    console.log("down ", mouse);
  } */
}

function mouseMove(e) {
  if (!isMouseDown) return;
  mouse = getPointer(e);
  console.log("move ", mouse);
}
function mouseUp(e) {
  if (isMouseDown) {
    isMouseDown = false;
    mouse = getPointer(e);
    console.log("up ", mouse);
  }
}

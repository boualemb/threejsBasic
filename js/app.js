import {GUI} from './lil-gui.module.min.js'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxBufferGeometry,
  TorusBufferGeometry,
  MeshBasicMaterial,
  Mesh,
  PlaneBufferGeometry,
  SphereBufferGeometry,
  MeshStandardMaterial,
  Raycaster,
  Vector2,
  Color,
  PointLight,
  SpotLight,
  HemisphereLight,
  PMREMGenerator,
  AmbientLight,
  Clock,
  Vector3,
  MeshPhysicalMaterial,
  CubeTextureLoader,
  TorusKnotBufferGeometry,
  ShaderMaterial,
} from "./three.module.js";
import {M_opal, opalShader} from './shaders.js'
import { OrbitControls } from './OrbitControls.js'
import {EXRLoader} from './EXRLoader.js'
import {ThinFilmFresnelMap} from './ThinFilmFresnelMap.js';
import {IridescentMaterial} from './IridescentMaterial.js';
import { GLTFLoader } from './GLTFLoader.js'
// import Stats from './stats.module.js'

const gui = new GUI();
let scene, camera, renderer, plan, raycaster, mouse,mom , boxes, amblight, controls, M_iridescent;

const envMapPath = '../assets/19smE_soft_02.exr';
let pearl_params = {color:0xffffff,
                    transmission: 1,
                    opacity: 1,
                    metalness: 0.6,
                    roughness: 0.4,
                    ior: 1.5,
                    thickness: 0.01,
                    specularIntensity: 1,
                    specularColor: 0xffffff,
                    envMapIntensity: 1,
                    lightIntensity: 1,
                    exposure: 1}

let opalParams = {
    filmThickness : 200,
    refractiveIndexFilm : 2.7,
    refractiveIndexBase : 1.3,
    boost : 6.0,
    color : new Color(1.0, 1.0, 1.0),
    size : 128,    
  }
  
var M_pearl = new MeshPhysicalMaterial(pearl_params);
const iridescentMap = new ThinFilmFresnelMap(opalParams.filmThickness, opalParams.refractiveIndexFilm, opalParams.refractiveIndexBase,opalParams.size);

let irradianceMap = loadCubeMap('./assets/irradiance');
let radianceMap = loadCubeMap('./assets/radiance');
//radianceMap = loadCubeMap('./assets/studio','.png');
//radianceMap = loadCubeMap('./assets/supernova','.png');
//radianceMap = loadCubeMap('./assets/irradiance');
M_iridescent = new IridescentMaterial(irradianceMap, radianceMap, iridescentMap);
M_iridescent.boost = opalParams.boost;
M_iridescent.color = opalParams.color;
// gui.add(opalParams,'filmThickness', 0, 1000, 10).onChange(()=>{
//   iridescentMap.filmThickness = opalParams.filmThickness;
// });
// gui.add(opalParams,'refractiveIndexFilm', 0, 10, 0.1).onChange(()=>{
//   iridescentMap.refractiveIndexFilm = opalParams.refractiveIndexFilm;
// });
// gui.add(opalParams,'refractiveIndexBase', 0, 10, 0.1).onChange(()=>{
//   iridescentMap.refractiveIndexBase = opalParams.refractiveIndexBase;
// });                            
// gui.add(opalParams,'size', 0, 1024, 8).onChange(()=>{
//   iridescentMap.size = opalParams.size;
// });
// gui.add(opalParams,'boost', 1, 30, 0.1).onChange(()=>{
//   M_iridescent.boost = opalParams.boost;
// });
// gui.addColor(opalParams,'color').onChange(()=>{
//   M_iridescent.color = opalParams.color;
// });
let isMouseDown = false;
let time = 0.0;
let clk = new Clock();
clk.start();
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
  camera.position.z = 2;
  camera.position.y = 2;
  camera.position.x = 2;
  
  plan = new Mesh(new PlaneBufferGeometry(4, 4), new MeshStandardMaterial({visible:true}));
  plan.rotation.x = - Math.PI / 2;
  plan.position.set(0.0,-0.5);
  plan.castShadow = true;
  plan.receiveShadow = true;
  amblight = new AmbientLight(0xffffff, .80);

  raycaster = new Raycaster(0.0,);
  renderer = new WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  document.body.appendChild(renderer.domElement);
  renderer.setAnimationLoop(animate);
  renderer.domElement.addEventListener("pointerdown", mouseDown);
  renderer.domElement.addEventListener("pointermove", mouseMove);
  renderer.domElement.addEventListener("pointerup", mouseUp);
  controls = new OrbitControls( camera, renderer.domElement );
  const light = new PointLight(0xff0000, .80,0.2,0.2);
  light.position.y = 0.;
  light.position.x = 0.0;
  light.position.z = 0.0;
  scene.add(light);
  scene.add(plan);
  scene.add(amblight);
  const loader = new EXRLoader();
  let hdrCubeMap;
  
  
  /* loader.load(envMapPath, (texture, textureData) => {
    const pmremGenerator = new PMREMGenerator(renderer);
    const hdrCubeMap = pmremGenerator.fromEquirectangular(texture).texture;
    hdrCubeMap.center.set(-2.953, 3.142);
    //scene.background = hdrCubeMap;
    /* M_iridescent = new IridescentMaterial(irradianceMap, radianceMap, iridescentMap);
    M_iridescent.boost = 7;
    M_iridescent.color = new Color(0.0, 0.0, 0.0);
    //hdrCubeMap.encoding = RGBEEncoding;
    //this.background = hdrCubeMap;
    texture.dispose();
  });  */
  scene.background = new Color(0x888888)
  // scene.background = radianceMap = loadCubeMap('./assets/studio','.png');
  controls.update();
  window.addEventListener('resize', resize );
}
function resize(){
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  opalShader.uniforms.iResolution.value = new Vector3(window.innerWidth, window.innerHeight,1.0);
  camera.updateProjectionMatrix();
}
function animate() {

  time +=clk.getDelta();
   boxes.forEach(box=>{
    // box.scale.y = 1.0 + 0.25 ;
    // box.rotation.z += 0.005;
  }); 
  opalShader.uniforms.AmbientLight = AmbientLight*0.2;
  opalShader.uniforms['iTime'].value = time; 
  // opalShader.uniforms["ti"].value = time; 
  // console.log(opalShader.uniforms.ti.value);
  opalShader.uniforms.eye.value = camera.position;
  mouseDown();
  if(mom == null){
    mom = new Vector2();
  }
  // opalShader.uniforms.fov.value = camera.fov; 
  opalShader.uniforms["iMouse"].value = new Vector2(mom.x,mom.y);

  // console.log(camera.position) 
   console.log("mom",opalShader.uniforms["iMouse"].value); 
  //  console.log("fov",opalShader.uniforms.fov.value) 
  //  console.log("eye",  opalShader.uniforms.eye.value ) 
  renderer.render(scene, camera);
}
let mesh;
            function createScene( geometry, scale, material ) {

mesh = new THREE.Mesh( geometry, material );

// mesh.position.y = - 50;
mesh.scale.set( scale, scale, scale );
mesh.rotation.set( Math.PI /2, 0.0, 0.0 );

mesh.castShadow = true;
mesh.receiveShadow = true;
boxes.push(mesh);
scene.add( mesh );

}
function initialise(){
  boxes = []
  const sphGeom = new SphereBufferGeometry();

  const loader = new GLTFLoader()
  loader.load(
      './../assets/cabochon.glb',
      function (gltf) {
          gltf.scene.traverse(function (child) {
              if (child.isMesh) {
                  // child.material = material
                  child.receiveShadow = true
                  child.castShadow = true
                  
                  createScene( child.geometry, 1.0, new ShaderMaterial({
                    vertexShader: M_opal.vertexShader,
                    fragmentShader:M_opal.fragmentShader,
                    uniforms: opalShader.uniforms
                  }) );
                   child.position.set(0.0, .0, 1.0)
              }
              if (child .isLight) {
                  const l = child
                  l.castShadow = true
                  l.shadow.bias = -.03
                  l.shadow.mapSize.width = 100
                  l.shadow.mapSize.height = 100
              }
          })
          
          // scene.add(gltf.scene)
  
          // createScene( gltf.scene.children[ 0 ].geometry, 1.0, material );
      },
      (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
      },
      (error) => {
          console.log(error)
      }
  )
  // const sphGeom = new SphereGeometry(2,64,32);

  //const sphGeom = new TorusKnotBufferGeometry(1.0, 0.4, 128, 32);

  /* boxes.push(new Mesh(sphGeom, new MeshStandardMaterial({color:0x00ff00, depthTest: false})));
  boxes.push(new Mesh(sphGeom, new MeshStandardMaterial({color:0xffff00, depthTest: false}))); */
  // boxes.push(new Mesh(sphGeom, M_iridescent));
  // const mesh = new Mesh(sphGeom, M_opal);
  // const mesh = new Mesh(sphGeom, new MeshStandardMaterial({color:0xffff00, depthTest: false}));
  // mesh.position.set(2,2,0);
  // boxes.push(mesh);
//////////////////////////////////////////////
  // boxes.push(new Mesh(sphGeom, new ShaderMaterial({
  //   vertexShader: M_opal.vertexShader,
  //   fragmentShader:M_opal.fragmentShader,
  // }))); 
  // boxes.push(new Mesh(sphGeom, M_opal)); 
  // boxes.push(new Mesh(sphGeom, new MeshStandardMaterial({color:0xffff00, depthTest: false}))); 
  opalShader.uniforms.iResolution.value.copy(new Vector3(window.innerWidth, window.innerHeight,1.0));
  opalShader.uniforms.fov.value = camera.fov; 

  boxes.forEach(box=>{
    box.position.y = 1.0;
    box.renderOrder = Math.round(10* Math.random()); 
    box.position.x = 0.0;//5 * Math.random();
    box.position.z = 0.0;//5 * Math.random();
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
  try{
  mouse = getPointer(e);
  mom = new Vector2(mouse.x*.0,mouse.y);
  console.log("move ", mouse);
  }catch(e){

  }
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
function loadCubeMap(path, extension = '.jpg', onLoad = function (cubeText) {console.log(path, 'loaded')}) {
  var files = [
    path + "/posX"+extension,
    path + "/negX"+extension,
    path + "/posY"+extension,
    path + "/negY"+extension,
    path + "/posZ"+extension,
    path + "/negZ"+extension
  ];

  var loader = new CubeTextureLoader();
  return loader.load(files, onLoad,null, (er)=>{console.log('error : ', er)});
}
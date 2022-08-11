import {
  GUI
} from './lil-gui.module.min.js'
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
import {
  M_opal,
  opalShader
} from './shaders.js'
import {
  OrbitControls
} from './OrbitControls.js'
import {
  EXRLoader
} from './EXRLoader.js'
import {
  ThinFilmFresnelMap
} from './ThinFilmFresnelMap.js';
import {
  IridescentMaterial
} from './IridescentMaterial.js';
import {
  GLTFLoader
} from './GLTFLoader.js'
// import Stats from './stats.module.js'

const gui = new GUI();
let scene, camera, renderer, plan, raycaster, mouse, mom, boxes, amblight, controls, M_iridescent;


let isMouseDown = false;
let time = 0.0;
let clk = new Clock();
clk.start();
setupScene();
initialise();

const envMapPath = '../assets/19smE_soft_02.exr';
let pearl_params = {
  color: 0xffffff,
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
  exposure: 1
}

let opalParams = {
  filmThickness: 200,
  refractiveIndexFilm: 2.7,
  refractiveIndexBase: 1.3,
  boost: 6.0,
  color: new Color(1.0, 1.0, 1.0),
  size: 128,
  alpha1:0.50,
  alpha2:0.26,
  alpha3:0.21,
  alpha4:0.12,
  alpha5:0.35,
}

var M_pearl = new MeshPhysicalMaterial(pearl_params);
const iridescentMap = new ThinFilmFresnelMap(opalParams.filmThickness, opalParams.refractiveIndexFilm, opalParams.refractiveIndexBase, opalParams.size);

let irradianceMap = loadCubeMap('./assets/irradiance');
let radianceMap = loadCubeMap('./assets/radiance');
//radianceMap = loadCubeMap('./assets/studio','.png');
//radianceMap = loadCubeMap('./assets/supernova','.png');
//radianceMap = loadCubeMap('./assets/irradiance');
M_iridescent = new IridescentMaterial(irradianceMap, radianceMap, iridescentMap);
M_iridescent.boost = opalParams.boost;
M_iridescent.color = opalParams.color;
gui.add(opalParams,'filmThickness', 0, 1000, 10).onChange(()=>{
  iridescentMap.filmThickness = opalParams.filmThickness;
});
gui.add(opalParams,'refractiveIndexFilm', 0, 10, 0.1).onChange(()=>{
  iridescentMap.refractiveIndexFilm = opalParams.refractiveIndexFilm;
});
gui.add(opalParams,'refractiveIndexBase', 0, 10, 0.1).onChange(()=>{
  iridescentMap.refractiveIndexBase = opalParams.refractiveIndexBase;
});                            
gui.add(opalParams,'size', 0, 1024, 8).onChange(()=>{
  iridescentMap.size = opalParams.size;
});
gui.add(opalParams,'boost', 1, 30, 0.1).onChange(()=>{
  M_iridescent.boost = opalParams.boost;
});
gui.addColor(opalParams,'color').onChange(()=>{
  M_iridescent.color = opalParams.color;
});
gui.add(opalParams,'alpha1',0.0,0.8,0.01).onChange(()=>{
  opalShader.uniforms['alpha1'].value = (opalParams.alpha1);
});
gui.add(opalParams,'alpha2',0.0,0.3,0.01).onChange(()=>{
  opalShader.uniforms['alpha2'].value = (opalParams.alpha2);
});
gui.add(opalParams,'alpha3',0.0,0.5,0.01).onChange(()=>{
  opalShader.uniforms['alpha3'].value = (opalParams.alpha3);
});
gui.add(opalParams,'alpha4',0.0,0.5,0.01).onChange(()=>{
  opalShader.uniforms['alpha4'].value = (opalParams.alpha4);
});
gui.add(opalParams,'alpha5',0.0,0.5,0.01).onChange(()=>{
  opalShader.uniforms['alpha5'].value = (opalParams.alpha5);
});


function setupScene() {
  scene = new Scene();
  camera = new PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    .10,
    100
  );
  camera.position.z = 2;
  camera.position.y = 2;
  camera.position.x = 2;

  plan = new Mesh(new PlaneBufferGeometry(4, 4), new MeshStandardMaterial({
    // visible: true
  }));
  plan.rotation.x = -Math.PI / 2;
  plan.position.set(0.0, -.50);
  // plan.castShadow = true;
  // plan.receiveShadow = true;
  amblight = new AmbientLight(0xffffff, .80);

  raycaster = new Raycaster( );
  renderer = new WebGLRenderer({
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);
  renderer.setAnimationLoop(animate);
  renderer.domElement.addEventListener("pointerdown", mouseDown);
  renderer.domElement.addEventListener("pointermove", mouseMove);
  renderer.domElement.addEventListener("pointerup", mouseUp);
  controls = new OrbitControls(camera, renderer.domElement);
  // const light = new PointLight(0xff0000, .80, 0.2, 0.2);
  // light.position.y = 0.;
  // light.position.x = 0.0;
  // light.position.z = 0.0;
  // scene.add(light);
  scene.add(plan);
  // scene.add(amblight);

  // const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  // hemiLight.color.setHSL(0.6, 1, 0.6);
  // hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  // hemiLight.position.set(0, 50, 0);
  // scene.add(hemiLight);

  // const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 50);
  // scene.add(hemiLightHelper);
  // const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  // dirLight.color.setHSL(0.1, 1, 0.95);
  // dirLight.position.set(0.0, 0.75, 1);
  // dirLight.position.multiplyScalar(30);
  // scene.add(dirLight);

  // // dirLight.castShadow = true;

  // dirLight.shadow.mapSize.width = 100;
  // dirLight.shadow.mapSize.height = 100;

  // const d = 5.;

  // dirLight.shadow.camera.left = -d;
  // dirLight.shadow.camera.right = d;
  // dirLight.shadow.camera.top = d;
  // dirLight.shadow.camera.bottom = -d;

  // dirLight.shadow.camera.far = 3500;
  // dirLight.shadow.bias = -0.0001;

  // const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
  // scene.add(dirLightHelper);
  // const loader = new EXRLoader();
  // let hdrCubeMap;


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
  window.addEventListener('resize', resize);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  opalShader.uniforms.iResolution.value = new Vector3(window.innerWidth, window.innerHeight, 1.0);
  camera.updateProjectionMatrix();
}

function animate() {

  time += clk.getDelta();
  boxes.forEach(box => {
    // box.scale.y = 1.0 + 0.25 ;
    // box.rotation.z += 0.5;
  });
  // opalShader.uniforms.AmbientLight = AmbientLight * 0.2;
  opalShader.uniforms['iTime'].value = time;
  // opalShader.uniforms["ti"].value = time; 
  // console.log(opalShader.uniforms['iTime'].value);
  opalShader.uniforms.eye.value = camera.position;
  mouseDown();
  if (mom == null) {
    mom = new Vector2();
  }
  // opalShader.uniforms.fov.value = camera.fov; 
  opalShader.uniforms["iMouse"].value = new Vector2(mom.x, mom.y);

  // console.log(camera.position) 
  // console.log("mom", opalShader.uniforms["iMouse"].value);
  //  console.log("fov",opalShader.uniforms.fov.value) 
  //  console.log("eye",  opalShader.uniforms.eye.value ) 
  renderer.render(scene, camera);
}
let mesh;

function createScene(geometry, scale, material) {

  mesh = new THREE.Mesh(geometry, material);

  // mesh.position.y = - 50;
  mesh.scale.set(scale, scale, scale);
  // mesh.rotation.set(Math.PI / 2, 0.0, 0.0);

  // mesh.castShadow = true;
  // mesh.receiveShadow = true;
  // boxes.push(mesh);
  scene.add(mesh);

}

function initialise() {
  boxes = []
  const sphGeom = new SphereBufferGeometry();

  const loader = new GLTFLoader()
  loader.load(
    // './../assets/XR3SPL8TQ.glb',
    // './../assets/cabochon.glb',
    './../assets/opal.glb',
    function (gltf) {
      gltf.scene.traverse(function (child) {
        if (child.isMesh) {
          // child.material = material
          // child.receiveShadow = false
          // child.castShadow = true

          createScene(child.geometry, 0.50, new ShaderMaterial({
            vertexShader: M_opal.vertexShader,
            fragmentShader: M_opal.fragmentShader,
            uniforms: opalShader.uniforms
          }));
          // child.position.set(1000.0, 1000.0, 1000.0)
        }
        // if (child.isLight) {
        //   const l = child
        //   l.castShadow = false
        //   l.receiveShadow = false
        //   l.shadow.bias = -.3
        //   l.shadow.mapSize.width = 1000
        //   l.shadow.mapSize.height = 1000
        // }
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
  opalShader.uniforms.iResolution.value.copy(new Vector3(window.innerWidth, window.innerHeight, 1.0));
  opalShader.uniforms.fov.value = camera.fov;

  // boxes.forEach(box => {
    // box.position.y = 1.0;
    // box.renderOrder = Math.round(10 * Math.random());
    // box.position.x = 0.0; //5 * Math.random();
    // box.position.z = 0.0; //5 * Math.random();
    // scene.add(box);
  // });
}

function getPointer(e) {
  return new Vector2(
    (e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1
  );
}

function mouseDown(e) {
  try {
    mouse = getPointer(e);
    mom = new Vector2(mouse.x, mouse.y);
  //   console.log("move ", mouse);  
  //   raycaster.setFromCamera(mouse, camera);
  // const intersects = raycaster.intersectObjects(false);
  // console.log("down ", mouse, intersects.length);
  // if (intersects.length >0.0) {
  //   isMouseDown = true;
    
  // } 
  } catch (e) {
    // console.log("down ", e);
  }

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

function loadCubeMap(path, extension = '.jpg', onLoad = function (cubeText) {
  console.log(path, 'loaded')
}) {
  var files = [
    path + "/posX" + extension,
    path + "/negX" + extension,
    path + "/posY" + extension,
    path + "/negY" + extension,
    path + "/posZ" + extension,
    path + "/negZ" + extension
  ];

  var loader = new CubeTextureLoader();
  return loader.load(files, onLoad, null, (er) => {
    console.log('error : ', er)
  });
}
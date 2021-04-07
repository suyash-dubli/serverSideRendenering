// var THREE = require("three");

// // Create a DOM
// var MockBrowser = require('mock-browser').mocks.MockBrowser;
// var mock = new MockBrowser();
// var document = MockBrowser.createDocument();
// var window = MockBrowser.createWindow();

// //REST API
// var express     = require('express');      
// var app         = express();    
// var bodyParser  = require('body-parser');
// var router = express.Router();

// var gl = require('gl')(1,1); //headless-gl

// var pngStream = require('three-png-stream');
// var port = process.env.PORT || 8080;

// router.get('/render', function(req, res){

//     var scene = new THREE.Scene();
//     var camera = new THREE.PerspectiveCamera(75, this.width / this.height, 0.1, 1000);
//     var renderer = new THREE.WebGLRenderer({context:gl});

//     scene.add(camera);

//     renderer.setSize(this.width, this.height);
//     renderer.setClearColor(0xFFFFFF, 1);

//     /*...
//         const scene = new THREE.Scene();
// 			const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

// 			const renderer = new THREE.WebGLRenderer();
// 			renderer.setSize( window.innerWidth, window.innerHeight );
// 			document.body.appendChild( renderer.domElement );

// 			const geometry = new THREE.BoxGeometry();
// 			const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// 			const cube = new THREE.Mesh( geometry, material );
// 			scene.add( cube );

// 			camera.position.z = 5;

// 			const animate = function () {
// 				requestAnimationFrame( animate );

// 				cube.rotation.x += 0.01;
// 				cube.rotation.y += 0.01;

// 				renderer.render( scene, camera );
// 			};

// 			animate();
//     ...*/
//     const geometry = new THREE.BoxGeometry();
// 	const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// 	const cube = new THREE.Mesh( geometry, material );
// 	scene.add( cube );

// 	camera.position.z = 5;
//     const animate = function () {
// 				requestAnimationFrame( animate );

// 				cube.rotation.x += 0.01;
// 				cube.rotation.y += 0.01;

// 				renderer.render( scene, camera );
// 			};

// 			animate();

//     var target = new THREE.WebGLRenderTarget(this.width, this.height);
//     renderer.render(scene, camera, target);


//    res.setHeader('Content-Type', 'image/png');
//    pngStream(renderer, target).pipe(res);
// });

// app.use('/api', router);

// app.listen(port);
// console.log('Server active on port: ' + port);

const gl = require("gl"); // https://npmjs.com/package/gl v4.9.0
const THREE = require("three"); // https://npmjs.com/package/three v0.124.0
const fs = require("fs");
const { createCanvas } = require('canvas');

const {scene, camera} = createScene();

const renderer = createRenderer({width: 200, height: 200});
renderer.render(scene, camera);

const image = extractPixels(renderer.getContext());
const canvas = renderer.domElement;
console.log(canvas);
// console.log(canvas.toDataURL);

canvas.toBlob((blob)=>{
  saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
});

const saveBlob = (function() {
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  return function saveData(blob, fileName) {
     const url = window.URL.createObjectURL(blob);
     a.href = url;
     a.download = fileName;
     a.click();
  };
}());

// fs.writeFileSync("test.ppm", toP3(image));

process.exit(0);

function createScene() {
  const scene = new THREE.Scene();

  const box = new THREE.Mesh(new THREE.BoxBufferGeometry(), new THREE.MeshPhongMaterial());
  box.position.set(0, 0, 1);
  box.castShadow = true;
  scene.add(box);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshPhongMaterial());
  ground.receiveShadow = true;
  scene.add(ground);

  const light = new THREE.PointLight();
  light.position.set(3, 3, 5);
  light.castShadow = true;
  scene.add(light);

  const camera = new THREE.PerspectiveCamera();
  camera.up.set(0, 0, 1);
  camera.position.set(-3, 3, 3);
  camera.lookAt(box.position);
  scene.add(camera);
  
  return {scene, camera};
}

function createRenderer({height, width}) {
  // THREE expects a canvas object to exist, but it doesn't actually have to work.
  // const canvas = {
  //   width,
  //   height,
  //   addEventListener: event => {},
  //   removeEventListener: event => {},
  // };
  // const width = 1200
  // const height = 600
  const canvas = createCanvas(width, height)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    context: gl(width, height, {
      preserveDrawingBuffer: true,
    }),
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default PCFShadowMap

  // This is important to enable shadow mapping. For more see:
  // https://threejsfundamentals.org/threejs/lessons/threejs-rendertargets.html and
  // https://threejsfundamentals.org/threejs/lessons/threejs-shadows.html
  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
  });

  renderer.setRenderTarget(renderTarget);
  return renderer;
}

function extractPixels(context) {
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  const frameBufferPixels = new Uint8Array(width * height * 4);
  context.readPixels(0, 0, width, height, context.RGBA, context.UNSIGNED_BYTE, frameBufferPixels);
  // The framebuffer coordinate space has (0, 0) in the bottom left, whereas images usually
  // have (0, 0) at the top left. Vertical flipping follows:
  const pixels = new Uint8Array(width * height * 4);
  for (let fbRow = 0; fbRow < height; fbRow += 1) {
    let rowData = frameBufferPixels.subarray(fbRow * width * 4, (fbRow + 1) * width * 4);
    let imgRow = height - fbRow - 1;
    pixels.set(rowData, imgRow * width * 4);
  }
  return {width, height, pixels};
}

function toP3({width, height, pixels}) {
  const headerContent = `P3\n# http://netpbm.sourceforge.net/doc/ppm.html\n${width} ${height}\n255\n`;
  const bytesPerPixel = pixels.length / width / height;
  const rowLen = width * bytesPerPixel;

  let output = headerContent;
  for (let i = 0; i < pixels.length; i += bytesPerPixel) {
    // Break output into rows





    
    if (i > 0 && i % rowLen === 0) {
      output += "\n";
    }

    for (let j = 0; j < 3; j += 1) {
        output += pixels[i + j] + " ";
    }
  }

  return output;
}
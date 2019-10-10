import GUI from '../../dist/lil-gui.esm.js';

import {
	FontLoader,
	TextureLoader,
	NearestFilter,
	WebGLRenderer,
	Scene,
	PerspectiveCamera,
	Object3D,
	ShaderMaterial,
	TextBufferGeometry,
	Mesh,
	Clock,
	SphereBufferGeometry,
	MeshBasicMaterial
} from '../vendor/three.module.js';

import {
	BloomEffect,
	EffectComposer,
	EffectPass,
	RenderPass,
	KernelSize,
	GodRaysEffect
} from '../vendor/postprocessing.esm.js';

import { OrbitControls } from '../vendor/OrbitControls.js';

let fragmentShader,
	vertexShader,
	font,
	envMap,
	assetsLoaded = 0;

const params = {
	message: 'lil-gui',
	rotationSpeed: 0.15
};

const geoParams = {
	height: 50,
	curveSegments: 8,
	bevelEnabled: true,
	bevelThickness: 3,
	bevelSize: 3,
	bevelOffset: 0,
	bevelSegments: 4
};

const uniforms = {
	thinFilmThickness: { value: 880 },
	thinFilmOuterIndex: { value: 1 },
	thinFilmIndex: { value: 1.75 },
	thinFilmInnerIndex: { value: 1 },
	thinFilmPolarization: { value: 1.5 }
};

const assetsToLoad = 4;

function onLoad() {
	assetsLoaded++;
	if ( assetsLoaded === assetsToLoad ) {
		main();
	}
}

fetch( './shader.fs' ).then( r => r.text() ).then( asset => {
	fragmentShader = asset;
	onLoad();
} );

fetch( './shader.vs' ).then( r => r.text() ).then( asset => {
	vertexShader = asset;
	onLoad();
} );

new FontLoader().load( './font.json', asset => {
	font = asset;
	onLoad();
} );

new TextureLoader().load( './envmap.png', asset => {
	envMap = asset;
	envMap.minFilter = NearestFilter; // seems to fix a texture seam with atan
	onLoad();
} );

function main() {

	function buildGUI() {

		const gui = new GUI();
		gui.add( params, 'message' ).onChange( buildGeometry );

		const geo = gui.addFolder( 'Geometry' );
		geo.add( geoParams, 'height', 0, 200 ).name( 'depth' );
		geo.add( geoParams, 'curveSegments', 1, 12, 1 );

		const bevel = gui.addFolder( 'Bevel' );
		bevel.add( geoParams, 'bevelEnabled' ).name( 'enabled' );
		bevel.add( geoParams, 'bevelThickness', -10, 10 ).name( 'depth' );
		bevel.add( geoParams, 'bevelSize', 0, 10 ).name( 'size' );
		bevel.add( geoParams, 'bevelOffset', -5, 5 ).name( 'offset' );
		bevel.add( geoParams, 'bevelSegments', 1, 5, 1 ).name( 'segments' );

		geo.getControllers().forEach( c => c.onChange( buildGeometry ) );

		const thinFilm = gui.addFolder( 'Thin Film' );
		thinFilm.add( uniforms.thinFilmThickness, 'value', 100, 2000 ).name( 'thickness' );
		thinFilm.add( uniforms.thinFilmIndex, 'value', 1, 2 ).name( 'index' );
		thinFilm.add( uniforms.thinFilmPolarization, 'value', 0, 2 ).name( 'polarization' );

		const misc = gui.addFolder( 'Misc' );
		misc.add( params, 'rotationSpeed', 0, 1 );
		misc.addColor( sunMaterial, 'color' ).name( 'light' );

	}

	let text;

	const dpr = window.devicePixelRatio;
	const renderer = new WebGLRenderer( {
		antialias: dpr === 1
	} );
	renderer.setPixelRatio( dpr );
	renderer.setSize( window.innerWidth, window.innerHeight );

	document.body.appendChild( renderer.domElement );

	const scene = new Scene();

	const camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 400;

	const container = new Object3D();
	scene.add( container );

	scene.add( camera );

	const material = new ShaderMaterial( {
		uniforms: Object.assign( uniforms, {
			envMap: { value: envMap }
		} ),
		vertexShader,
		fragmentShader
	} );

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.enableKeys = false;
	controls.enableZoom = false;
	controls.enablePan = false;

	const clock = new Clock();

	const sunMaterial = new MeshBasicMaterial( {
		color: 0xe5c8ff,
		transparent: true,
		fog: false
	} );

	const sunGeometry = new SphereBufferGeometry( 160, 32, 32 );
	const sun = new Mesh( sunGeometry, sunMaterial );

	camera.add( sun );

	sun.position.z = -800;
	sun.frustumCulled = false;

	const composer = new EffectComposer( renderer );

	const godRaysEffect = new GodRaysEffect( camera, sun, {
		height: 720,
		kernelSize: KernelSize.SMALL,
		density: 0.96,
		decay: 0.92,
		weight: 0.3,
		exposure: 0.54,
		samples: 60,
		clampMax: 1.0
	} );

	const bloomEffect = new BloomEffect();

	const effectPass = new EffectPass( camera, godRaysEffect, bloomEffect );
	effectPass.renderToScreen = true;

	composer.addPass( new RenderPass( scene, camera ) );
	composer.addPass( effectPass );

	function animate() {

		requestAnimationFrame( animate );

		const delta = clock.getDelta();
		controls.update();
		container.rotation.y += params.rotationSpeed * delta;
		composer.render( delta );

	}

	function buildGeometry() {

		if ( text ) {
			text.parent.remove( text );
			text.geometry.dispose();
		}

		const geometry = new TextBufferGeometry( params.message, Object.assign( geoParams, {
			font: font,
			size: 100
		} ) );

		geometry.center();

		text = new Mesh( geometry, material );
		container.add( text );

	}

	buildGeometry();
	buildGUI();
	animate();

}

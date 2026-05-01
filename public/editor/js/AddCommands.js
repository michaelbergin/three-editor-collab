import * as THREE from 'three';

import { AddObjectCommand } from './commands/AddObjectCommand.js';

import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

function executeAddObject( editor, object ) {

	editor.execute( new AddObjectCommand( editor, object ) );

}

function createMeshCommand( id, labelKey, icon, keywords, createObject ) {

	return {
		id,
		category: 'mesh',
		labelKey,
		icon,
		keywords,
		run: function ( editor ) {

			executeAddObject( editor, createObject() );

		}
	};

}

const ADD_COMMANDS = [
	{
		id: 'add.group',
		category: 'general',
		labelKey: 'menubar/add/group',
		icon: 'group',
		keywords: [ 'group', 'container', 'empty' ],
		run: function ( editor ) {

			const mesh = new THREE.Group();
			mesh.name = 'Group';

			executeAddObject( editor, mesh );

		}
	},
	createMeshCommand( 'add.mesh.box', 'menubar/add/mesh/box', 'box', [ 'box', 'cube', 'cuboid', 'mesh' ], function () {

		const geometry = new THREE.BoxGeometry( 1, 1, 1, 1, 1, 1 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Box';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.capsule', 'menubar/add/mesh/capsule', 'capsule-3d', [ 'capsule', 'pill', 'mesh' ], function () {

		const geometry = new THREE.CapsuleGeometry( 1, 1, 4, 8, 1 );
		const material = new THREE.MeshStandardMaterial();
		const mesh = new THREE.Mesh( geometry, material );
		mesh.name = 'Capsule';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.circle', 'menubar/add/mesh/circle', 'circle', [ 'circle', 'disc', 'mesh' ], function () {

		const geometry = new THREE.CircleGeometry( 1, 32, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Circle';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.cylinder', 'menubar/add/mesh/cylinder', 'cylinder', [ 'cylinder', 'tube primitive', 'mesh' ], function () {

		const geometry = new THREE.CylinderGeometry( 1, 1, 1, 32, 1, false, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Cylinder';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.dodecahedron', 'menubar/add/mesh/dodecahedron', 'dodecahedron', [ 'dodecahedron', 'polyhedron', 'mesh' ], function () {

		const geometry = new THREE.DodecahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Dodecahedron';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.icosahedron', 'menubar/add/mesh/icosahedron', 'icosahedron', [ 'icosahedron', 'polyhedron', 'mesh' ], function () {

		const geometry = new THREE.IcosahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Icosahedron';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.lathe', 'menubar/add/mesh/lathe', 'lathe-profile', [ 'lathe', 'revolve', 'profile', 'mesh' ], function () {

		const geometry = new THREE.LatheGeometry();
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial( { side: THREE.DoubleSide } ) );
		mesh.name = 'Lathe';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.octahedron', 'menubar/add/mesh/octahedron', 'diamond', [ 'octahedron', 'diamond', 'polyhedron', 'mesh' ], function () {

		const geometry = new THREE.OctahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Octahedron';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.plane', 'menubar/add/mesh/plane', 'square', [ 'plane', 'flat', 'square', 'mesh' ], function () {

		const geometry = new THREE.PlaneGeometry( 1, 1, 1, 1 );
		const material = new THREE.MeshStandardMaterial();
		const mesh = new THREE.Mesh( geometry, material );
		mesh.name = 'Plane';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.ring', 'menubar/add/mesh/ring', 'circle-dot', [ 'ring', 'annulus', 'circle', 'mesh' ], function () {

		const geometry = new THREE.RingGeometry( 0.5, 1, 32, 1, 0, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Ring';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.sphere', 'menubar/add/mesh/sphere', 'sphere-3d', [ 'sphere', 'ball', 'globe', 'mesh' ], function () {

		const geometry = new THREE.SphereGeometry( 1, 32, 16, 0, Math.PI * 2, 0, Math.PI );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Sphere';

		return mesh;

	} ),
	{
		id: 'add.mesh.sprite',
		category: 'mesh',
		labelKey: 'menubar/add/mesh/sprite',
		icon: 'image',
		keywords: [ 'sprite', 'image', 'billboard', 'mesh' ],
		run: function ( editor ) {

			const sprite = new THREE.Sprite( new THREE.SpriteMaterial() );
			sprite.name = 'Sprite';

			executeAddObject( editor, sprite );

		}
	},
	createMeshCommand( 'add.mesh.tetrahedron', 'menubar/add/mesh/tetrahedron', 'triangle', [ 'tetrahedron', 'triangle', 'polyhedron', 'mesh' ], function () {

		const geometry = new THREE.TetrahedronGeometry( 1, 0 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Tetrahedron';

		return mesh;

	} ),
	{
		id: 'add.mesh.text',
		category: 'mesh',
		labelKey: 'menubar/add/text',
		icon: 'type',
		keywords: [ 'text', 'type', 'font', 'mesh' ],
		run: function ( editor ) {

			const loader = new FontLoader();
			loader.load( '../examples/fonts/helvetiker_bold.typeface.json', function ( font ) {

				const text = 'THREE.JS';

				const geometry = new TextGeometry( text, {
					text: text,
					font,
					size: 1,
					depth: 0.5,
					curveSegments: 4,

					bevelEnabled: false,
					bevelThickness: 0.1,
					bevelSize: 0.01,
					bevelOffset: 0,
					bevelSegments: 3

				} );

				const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
				mesh.name = 'Text';

				executeAddObject( editor, mesh );

			} );

		}
	},
	createMeshCommand( 'add.mesh.torus', 'menubar/add/mesh/torus', 'torus', [ 'torus', 'donut', 'mesh' ], function () {

		const geometry = new THREE.TorusGeometry( 1, 0.4, 12, 48, Math.PI * 2 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Torus';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.torusknot', 'menubar/add/mesh/torusknot', 'torus-knot', [ 'torusknot', 'torus knot', 'knot', 'mesh' ], function () {

		const geometry = new THREE.TorusKnotGeometry( 1, 0.4, 64, 8, 2, 3 );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'TorusKnot';

		return mesh;

	} ),
	createMeshCommand( 'add.mesh.tube', 'menubar/add/mesh/tube', 'spline', [ 'tube', 'curve', 'path', 'mesh' ], function () {

		const path = new THREE.CatmullRomCurve3( [
			new THREE.Vector3( 2, 2, - 2 ),
			new THREE.Vector3( 2, - 2, - 0.6666666666666667 ),
			new THREE.Vector3( - 2, - 2, 0.6666666666666667 ),
			new THREE.Vector3( - 2, 2, 2 )
		] );

		const geometry = new THREE.TubeGeometry( path, 64, 1, 8, false );
		const mesh = new THREE.Mesh( geometry, new THREE.MeshStandardMaterial() );
		mesh.name = 'Tube';

		return mesh;

	} ),
	{
		id: 'add.light.ambient',
		category: 'light',
		labelKey: 'menubar/add/light/ambient',
		icon: 'sun',
		keywords: [ 'ambient', 'light', 'global' ],
		run: function ( editor ) {

			const color = 0x222222;
			const light = new THREE.AmbientLight( color );
			light.name = 'AmbientLight';

			executeAddObject( editor, light );

		}
	},
	{
		id: 'add.light.directional',
		category: 'light',
		labelKey: 'menubar/add/light/directional',
		icon: 'flashlight',
		keywords: [ 'directional', 'light', 'sun' ],
		run: function ( editor ) {

			const color = 0xffffff;
			const intensity = 1;
			const light = new THREE.DirectionalLight( color, intensity );
			light.name = 'DirectionalLight';
			light.target.name = 'DirectionalLight Target';

			light.position.set( 5, 10, 7.5 );

			executeAddObject( editor, light );

		}
	},
	{
		id: 'add.light.hemisphere',
		category: 'light',
		labelKey: 'menubar/add/light/hemisphere',
		icon: 'hemisphere-light',
		keywords: [ 'hemisphere', 'light', 'sky', 'ground' ],
		run: function ( editor ) {

			const skyColor = 0x00aaff;
			const groundColor = 0xffaa00;
			const intensity = 1;

			const light = new THREE.HemisphereLight( skyColor, groundColor, intensity );
			light.name = 'HemisphereLight';

			light.position.set( 0, 10, 0 );

			executeAddObject( editor, light );

		}
	},
	{
		id: 'add.light.point',
		category: 'light',
		labelKey: 'menubar/add/light/point',
		icon: 'lightbulb',
		keywords: [ 'point', 'light', 'bulb' ],
		run: function ( editor ) {

			const color = 0xffffff;
			const intensity = 1;
			const distance = 0;

			const light = new THREE.PointLight( color, intensity, distance );
			light.name = 'PointLight';

			executeAddObject( editor, light );

		}
	},
	{
		id: 'add.light.spot',
		category: 'light',
		labelKey: 'menubar/add/light/spot',
		icon: 'lamp',
		keywords: [ 'spot', 'spotlight', 'light', 'lamp' ],
		run: function ( editor ) {

			const color = 0xffffff;
			const intensity = 1;
			const distance = 0;
			const angle = Math.PI * 0.1;
			const penumbra = 0;

			const light = new THREE.SpotLight( color, intensity, distance, angle, penumbra );
			light.name = 'SpotLight';
			light.target.name = 'SpotLight Target';

			light.position.set( 5, 10, 7.5 );

			executeAddObject( editor, light );

		}
	},
	{
		id: 'add.camera.orthographic',
		category: 'camera',
		labelKey: 'menubar/add/camera/orthographic',
		icon: 'orthographic-camera',
		keywords: [ 'orthographic', 'camera', 'ortho' ],
		run: function ( editor ) {

			const aspect = editor.camera.aspect;
			const camera = new THREE.OrthographicCamera( - aspect, aspect );
			camera.name = 'OrthographicCamera';

			executeAddObject( editor, camera );

		}
	},
	{
		id: 'add.camera.perspective',
		category: 'camera',
		labelKey: 'menubar/add/camera/perspective',
		icon: 'camera',
		keywords: [ 'perspective', 'camera', 'view' ],
		run: function ( editor ) {

			const camera = new THREE.PerspectiveCamera();
			camera.name = 'PerspectiveCamera';

			executeAddObject( editor, camera );

		}
	}
];

export { ADD_COMMANDS };

import * as THREE from 'three';
import { PMREMGenerator } from 'three/webgpu';

import { TransformControls } from 'three/addons/controls/TransformControls.js';

import { UIPanel } from './libs/ui.js';

import { EditorControls } from './EditorControls.js';

import { ViewportControls } from './Viewport.Controls.js';
import { ViewportInfo } from './Viewport.Info.js';

import { ViewHelper } from './Viewport.ViewHelper.js';
import { XR } from './Viewport.XR.js';

import { SetPositionCommand } from './commands/SetPositionCommand.js';
import { SetRotationCommand } from './commands/SetRotationCommand.js';
import { SetScaleCommand } from './commands/SetScaleCommand.js';

import { ColorEnvironment } from 'three/addons/environments/ColorEnvironment.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ViewportPathtracer } from './Viewport.Pathtracer.js';

import { createViewportStore } from './ViewportState.js';
import { computeViewportGrid } from './ViewportGrid.js';
import { createMultiViewportOverlay } from './MultiViewportOverlay.js';

function Viewport( editor ) {

	const selector = editor.selector;
	const signals = editor.signals;

	const vpStore = createViewportStore();
	editor.viewportStore = vpStore;

	const vpCameras = new Map();
	const vpEditorControls = new Map();

	let multiViewportOverlay = null;

	function safeViewportDim( n ) {

		if ( ! Number.isFinite( n ) || n <= 0 ) {

			return Number.EPSILON;

		}

		return n;

	}

	function syncViewportCameraProjection( cam, rect ) {

		const w = safeViewportDim( rect.width );
		const h = safeViewportDim( rect.height );

		if ( cam.isPerspectiveCamera ) {

			cam.aspect = w / h;
			cam.updateProjectionMatrix();
			cam.updateMatrixWorld();

		} else if ( cam.isOrthographicCamera ) {

			const a = w / h;
			const frustumSize = 10;
			const halfH = frustumSize / 2;
			const halfW = halfH * a;
			cam.left = - halfW;
			cam.right = halfW;
			cam.top = halfH;
			cam.bottom = - halfH;
			cam.updateProjectionMatrix();
			cam.updateMatrixWorld();

		}

	}

	function createOrthoViewportCamera( type ) {

		const cam = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.1, 100 );

		if ( type === 'top' ) {

			cam.position.set( 0, 10, 0 );
			cam.up.set( 0, 0, - 1 );

		} else if ( type === 'left' ) {

			cam.position.set( - 10, 0, 0 );
			cam.up.set( 0, 1, 0 );

		} else {

			cam.position.set( 10, 0, 0 );
			cam.up.set( 0, 1, 0 );

		}

		cam.lookAt( 0, 0, 0 );
		cam.updateMatrixWorld();
		return cam;

	}

	function disposeOwnedViewportCamera( cam ) {

		if ( cam === undefined || cam === null ) {

			return;

		}

		if ( cam === editor.viewportCamera || cam === editor.camera ) {

			return;

		}

		if ( typeof cam.dispose === 'function' ) {

			cam.dispose();

		}

	}

	function syncViewportCameras() {

		const s = vpStore.getState();
		const keep = new Set( s.viewports.map( ( v ) => v.id ) );

		vpCameras.set( 'vp-1-perspective', editor.viewportCamera );

		for ( const id of Array.from( vpCameras.keys() ) ) {

			if ( id === 'vp-1-perspective' ) {

				continue;

			}

			if ( ! keep.has( id ) ) {

				disposeOwnedViewportCamera( vpCameras.get( id ) );
				vpCameras.delete( id );

			}

		}

		for ( const v of s.viewports ) {

			if ( v.id === 'vp-1-perspective' ) {

				continue;

			}

			if ( ! vpCameras.has( v.id ) ) {

				let cam;

				if ( v.type === 'perspective' ) {

					cam = editor.viewportCamera.clone();

				} else {

					cam = createOrthoViewportCamera( v.type );

				}

				vpCameras.set( v.id, cam );

			}

		}

	}

	function findViewportRectAt( clientX, clientY ) {

		const bounds = container.dom.getBoundingClientRect();
		const x = clientX - bounds.left;
		const y = clientY - bounds.top;
		const W = container.dom.offsetWidth;
		const H = container.dom.offsetHeight;
		const s = vpStore.getState();
		const rects = computeViewportGrid(
			s.viewports.map( ( v ) => v.id ),
			W,
			H,
			s.colFractions,
			s.rowFractions,
		);

		for ( const r of rects ) {

			const insideX = x >= r.x && x < r.x + r.width;
			const insideY = y >= r.y && y < r.y + r.height;
			if ( insideX && insideY ) {

				return r;

			}

		}

		return null;

	}

	function getViewportConfigById( id ) {

		return vpStore.getState().viewports.find( ( v ) => v.id === id ) ?? null;

	}

	function getViewportPointerContext( normalizedVec2 ) {

		const W = container.dom.offsetWidth;
		const H = container.dom.offsetHeight;
		const x = normalizedVec2.x * W;
		const y = normalizedVec2.y * H;
		const s = vpStore.getState();
		const rects = computeViewportGrid(
			s.viewports.map( ( v ) => v.id ),
			W,
			H,
			s.colFractions,
			s.rowFractions,
		);

		for ( const r of rects ) {

			const insideX = x >= r.x && x < r.x + r.width;
			const insideY = y >= r.y && y < r.y + r.height;
			if ( insideX && insideY ) {

				const cam = vpCameras.get( r.id ) ?? editor.viewportCamera;
				syncViewportCameraProjection( cam, r );
				return {
					id: r.id,
					camera: cam,
					pointer: new THREE.Vector2(
						( x - r.x ) / Math.max( r.width, Number.EPSILON ),
						( y - r.y ) / Math.max( r.height, Number.EPSILON ),
					),
				};

			}

		}

		return null;

	}

	function routeViewportInput( event ) {

		if ( event.target !== renderer.domElement ) {

			return;

		}

		const hit = findViewportRectAt( event.clientX, event.clientY );
		if ( ! hit || ! getViewportConfigById( hit.id ) ) {

			return;

		}

		vpStore.dispatch( { type: 'SET_ACTIVE', id: hit.id } );

		const cam = vpCameras.get( hit.id ) ?? editor.viewportCamera;
		if ( transformControls !== undefined ) {

			transformControls.camera = cam;

		}

		if ( transformControlsDragging === true ) {

			disableAllViewportControls();

		} else {

			setActiveViewportControls( hit.id, cam );

		}

		presentViewportBoundsToCanvasHandlers( hit );
		handleOrthographicViewportNavigation( event, hit, cam );

	}

	function handleOrthographicViewportNavigation( event, rect, viewportCamera ) {

		if ( transformControlsDragging === true || ! viewportCamera.isOrthographicCamera ) {

			return;

		}

		if ( event.type === 'wheel' ) {

			const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
			viewportCamera.zoom = Math.min( 100, Math.max( 0.05, viewportCamera.zoom * zoomFactor ) );
			viewportCamera.updateProjectionMatrix();
			viewportCamera.updateMatrixWorld();
			event.preventDefault();
			event.stopImmediatePropagation();
			render();
			return;

		}

		if ( event.type === 'pointerdown' && ( event.button === 1 || event.button === 2 ) ) {

			orthographicDragState = {
				pointerId: event.pointerId,
				mode: event.button === 1 ? 'zoom' : 'pan',
				camera: viewportCamera,
				rect,
				lastX: event.clientX,
				lastY: event.clientY,
			};
			renderer.domElement.setPointerCapture?.( event.pointerId );
			event.preventDefault();
			event.stopImmediatePropagation();
			return;

		}

		if ( orthographicDragState === null || event.pointerId !== orthographicDragState.pointerId ) {

			return;

		}

		if ( event.type === 'pointermove' ) {

			const dx = event.clientX - orthographicDragState.lastX;
			const dy = event.clientY - orthographicDragState.lastY;
			orthographicDragState.lastX = event.clientX;
			orthographicDragState.lastY = event.clientY;

			if ( orthographicDragState.mode === 'pan' ) {

				panOrthographicViewportCamera( orthographicDragState.camera, orthographicDragState.rect, dx, dy );

			} else {

				const zoomFactor = Math.exp( - dy * 0.01 );
				orthographicDragState.camera.zoom = Math.min( 100, Math.max( 0.05, orthographicDragState.camera.zoom * zoomFactor ) );
				orthographicDragState.camera.updateProjectionMatrix();
				orthographicDragState.camera.updateMatrixWorld();

			}

			event.preventDefault();
			event.stopImmediatePropagation();
			render();
			return;

		}

		if ( event.type === 'pointerup' || event.type === 'pointercancel' ) {

			orthographicDragState = null;
			event.preventDefault();
			event.stopImmediatePropagation();

		}

	}

	function panOrthographicViewportCamera( viewportCamera, rect, dx, dy ) {

		const visibleWidth = ( viewportCamera.right - viewportCamera.left ) / Math.max( viewportCamera.zoom, Number.EPSILON );
		const visibleHeight = ( viewportCamera.top - viewportCamera.bottom ) / Math.max( viewportCamera.zoom, Number.EPSILON );
		const right = new THREE.Vector3( 1, 0, 0 ).applyQuaternion( viewportCamera.quaternion );
		const up = new THREE.Vector3( 0, 1, 0 ).applyQuaternion( viewportCamera.quaternion );

		viewportCamera.position.addScaledVector( right, - dx / Math.max( rect.width, Number.EPSILON ) * visibleWidth );
		viewportCamera.position.addScaledVector( up, dy / Math.max( rect.height, Number.EPSILON ) * visibleHeight );
		viewportCamera.updateMatrixWorld();

	}

	function presentViewportBoundsToCanvasHandlers( rect ) {

		if ( renderer === null ) {

			return;

		}

		if ( restoreRendererBounds === null ) {

			const originalGetBoundingClientRect = renderer.domElement.getBoundingClientRect.bind( renderer.domElement );
			restoreRendererBounds = function () {

				renderer.domElement.getBoundingClientRect = originalGetBoundingClientRect;
				restoreRendererBounds = null;

			};

		}

		if ( restoreRendererBoundsTimer !== null ) {

			window.clearTimeout( restoreRendererBoundsTimer );

		}

		const bounds = container.dom.getBoundingClientRect();
		const scopedRect = {
			left: bounds.left + rect.x,
			top: bounds.top + rect.y,
			width: rect.width,
			height: rect.height,
			right: bounds.left + rect.x + rect.width,
			bottom: bounds.top + rect.y + rect.height,
			x: bounds.left + rect.x,
			y: bounds.top + rect.y,
			toJSON() {

				return {};

			},
		};

		renderer.domElement.getBoundingClientRect = function () {

			return scopedRect;

		};

		restoreRendererBoundsTimer = window.setTimeout( function () {

			restoreRendererBoundsTimer = null;
			if ( restoreRendererBounds !== null ) restoreRendererBounds();

		}, 0 );

	}

	syncViewportCameras();

	vpStore.subscribe( function () {

		syncViewportCameras();
		ensureViewportEditorControls();
		render();

	} );

	const container = new UIPanel();
	container.setId( 'viewport' );
	container.setPosition( 'absolute' );

	container.add( new ViewportControls( editor ) );
	container.add( new ViewportInfo( editor ) );

	//

	let renderer = null;
	let pmremGenerator = null;
	let pathtracer = null;

	let vpInputHandler = null;
	let restoreRendererBoundsTimer = null;
	let restoreRendererBounds = null;
	let orthographicDragState = null;

	const camera = editor.camera;
	const scene = editor.scene;
	const sceneHelpers = editor.sceneHelpers;

	// helpers

	const GRID_COLORS_LIGHT = [ 0x999999, 0x777777 ];
	const GRID_COLORS_DARK = [ 0x555555, 0x888888 ];

	const grid = new THREE.Group();

	const grid1 = new THREE.GridHelper( 30, 30 );
	grid1.material.color.setHex( GRID_COLORS_LIGHT[ 0 ] );
	grid1.material.vertexColors = false;
	grid.add( grid1 );

	const grid2 = new THREE.GridHelper( 30, 6 );
	grid2.material.color.setHex( GRID_COLORS_LIGHT[ 1 ] );
	grid2.material.vertexColors = false;
	grid.add( grid2 );

	const viewHelper = new ViewHelper( camera, container );

	//

	const box = new THREE.Box3();

	const selectionBox = new THREE.Box3Helper( box );
	selectionBox.material.depthTest = false;
	selectionBox.material.transparent = true;
	selectionBox.visible = false;
	sceneHelpers.add( selectionBox );

	let objectPositionOnDown = null;
	let objectRotationOnDown = null;
	let objectScaleOnDown = null;
	let transformControlsDragging = false;

	const transformControls = new TransformControls( camera );
	transformControls.addEventListener( 'axis-changed', function () {

		if ( editor.viewportShading !== 'realistic' ) render();

	} );
	transformControls.addEventListener( 'objectChange', function () {

		signals.objectChanged.dispatch( transformControls.object );

	} );
	transformControls.addEventListener( 'mouseDown', function () {

		const object = transformControls.object;

		objectPositionOnDown = object.position.clone();
		objectRotationOnDown = object.rotation.clone();
		objectScaleOnDown = object.scale.clone();

		transformControlsDragging = true;
		disableAllViewportControls();

	} );
	transformControls.addEventListener( 'mouseUp', function () {

		const object = transformControls.object;

		if ( object !== undefined ) {

			switch ( transformControls.getMode() ) {

				case 'translate':

					if ( ! objectPositionOnDown.equals( object.position ) ) {

						editor.execute( new SetPositionCommand( editor, object, object.position, objectPositionOnDown ) );

					}

					break;

				case 'rotate':

					if ( ! objectRotationOnDown.equals( object.rotation ) ) {

						editor.execute( new SetRotationCommand( editor, object, object.rotation, objectRotationOnDown ) );

					}

					break;

				case 'scale':

					if ( ! objectScaleOnDown.equals( object.scale ) ) {

						editor.execute( new SetScaleCommand( editor, object, object.scale, objectScaleOnDown ) );

					}

					break;

			}

		}

		transformControlsDragging = false;
		restoreActiveViewportControls();

	} );

	sceneHelpers.add( transformControls.getHelper() );

	//

	const xr = new XR( editor, transformControls ); // eslint-disable-line no-unused-vars

	// events

	function updateAspectRatio() {

		for ( const uuid in editor.cameras ) {

			const camera = editor.cameras[ uuid ];

			const aspect = container.dom.offsetWidth / container.dom.offsetHeight;

			if ( camera.isPerspectiveCamera ) {

				camera.aspect = aspect;

			} else {

				camera.left = - aspect;
				camera.right = aspect;

			}

			camera.updateProjectionMatrix();

			const cameraHelper = editor.helpers[ camera.id ];
			if ( cameraHelper ) cameraHelper.update();

		}

	}

	const onDownPosition = new THREE.Vector2();
	const onUpPosition = new THREE.Vector2();
	const onDoubleClickPosition = new THREE.Vector2();

	function getMousePosition( dom, x, y ) {

		const rect = dom.getBoundingClientRect();
		return [ ( x - rect.left ) / rect.width, ( y - rect.top ) / rect.height ];

	}

	function handleClick() {

		if ( onDownPosition.distanceTo( onUpPosition ) === 0 ) {

			const context = getViewportPointerContext( onUpPosition );
			if ( context === null ) {

				return;

			}

			scene.updateMatrixWorld( true );
			sceneHelpers.updateMatrixWorld( true );
			context.camera.updateMatrixWorld();
			const intersects = selector.getPointerIntersects( context.pointer, context.camera );
			signals.intersectionsDetected.dispatch( intersects );

			render();

		}

	}

	function onMouseDown( event ) {

		// event.preventDefault();

		if ( event.target !== renderer.domElement ) return;

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'mouseup', onMouseUp );

	}

	function onMouseUp( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'mouseup', onMouseUp );

	}

	function onTouchStart( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onDownPosition.fromArray( array );

		document.addEventListener( 'touchend', onTouchEnd );

	}

	function onTouchEnd( event ) {

		const touch = event.changedTouches[ 0 ];

		const array = getMousePosition( container.dom, touch.clientX, touch.clientY );
		onUpPosition.fromArray( array );

		handleClick();

		document.removeEventListener( 'touchend', onTouchEnd );

	}

	function onDoubleClick( event ) {

		const array = getMousePosition( container.dom, event.clientX, event.clientY );
		onDoubleClickPosition.fromArray( array );

		const context = getViewportPointerContext( onDoubleClickPosition );
		if ( context === null ) {

			return;

		}

		scene.updateMatrixWorld( true );
		sceneHelpers.updateMatrixWorld( true );
		context.camera.updateMatrixWorld();
		const intersects = selector.getPointerIntersects( context.pointer, context.camera );

		if ( intersects.length > 0 ) {

			const intersect = intersects[ 0 ];

			signals.objectFocused.dispatch( intersect.object );

		}

	}

	container.dom.addEventListener( 'mousedown', onMouseDown );
	container.dom.addEventListener( 'touchstart', onTouchStart, { passive: false } );
	container.dom.addEventListener( 'dblclick', onDoubleClick );

	// controls need to be added *after* main logic,
	// otherwise controls.enabled doesn't work.

	const controls = new EditorControls( camera );
	controls.addEventListener( 'change', function () {

		signals.cameraChanged.dispatch( camera );
		signals.refreshSidebarObject3D.dispatch( camera );

	} );
	viewHelper.center = controls.center;

	editor.controls = controls;

	function ensureViewportEditorControls() {

		if ( renderer === null ) {

			return;

		}

		const state = vpStore.getState();
		const keep = new Set( state.viewports.map( ( v ) => v.id ) );

		for ( const id of Array.from( vpEditorControls.keys() ) ) {

			if ( ! keep.has( id ) ) {

				vpEditorControls.get( id ).disconnect();
				vpEditorControls.delete( id );

			}

		}

		for ( const viewport of state.viewports ) {

			if ( viewport.id === 'vp-1-perspective' || viewport.type !== 'perspective' ) {

				continue;

			}

			if ( ! vpEditorControls.has( viewport.id ) ) {

				const viewportCamera = vpCameras.get( viewport.id );
				if ( viewportCamera === undefined ) {

					continue;

				}

				const viewportControls = new EditorControls( viewportCamera );
				viewportControls.enabled = false;
				viewportControls.connect( renderer.domElement );
				viewportControls.addEventListener( 'change', function () {

					signals.cameraChanged.dispatch( viewportCamera );

				} );
				vpEditorControls.set( viewport.id, viewportControls );

			}

		}

	}

	function setActiveViewportControls( viewportId, viewportCamera ) {

		controls.enabled = viewportCamera === editor.viewportCamera;

		for ( const [ id, viewportControls ] of vpEditorControls ) {

			viewportControls.enabled = id === viewportId;

		}

	}

	function disableAllViewportControls() {

		controls.enabled = false;

		for ( const viewportControls of vpEditorControls.values() ) {

			viewportControls.enabled = false;

		}

	}

	function restoreActiveViewportControls() {

		const activeViewportId = vpStore.getState().activeViewportId;
		const activeCamera = vpCameras.get( activeViewportId ) ?? editor.viewportCamera;
		setActiveViewportControls( activeViewportId, activeCamera );

	}

	// signals

	signals.editorCleared.add( function () {

		controls.center.set( 0, 0, 0 );
		if ( pathtracer ) pathtracer.reset();

		initPT();

		signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

	} );

	signals.transformModeChanged.add( function ( mode ) {

		transformControls.setMode( mode );

		render();

	} );

	signals.snapChanged.add( function ( dist ) {

		transformControls.setTranslationSnap( dist );

	} );

	signals.spaceChanged.add( function ( space ) {

		transformControls.setSpace( space );

		render();

	} );

	signals.rendererUpdated.add( function () {

		scene.traverse( function ( child ) {

			if ( child.material !== undefined ) {

				child.material.needsUpdate = true;

			}

		} );

		render();

	} );

	signals.rendererCreated.add( function ( newRenderer ) {

		if ( renderer !== null ) {

			if ( vpInputHandler !== null ) {

				container.dom.removeEventListener( 'pointerdown', vpInputHandler, true );
				container.dom.removeEventListener( 'pointermove', vpInputHandler, true );
				container.dom.removeEventListener( 'pointerup', vpInputHandler, true );
				container.dom.removeEventListener( 'pointercancel', vpInputHandler, true );
				container.dom.removeEventListener( 'wheel', vpInputHandler, true );
				vpInputHandler = null;

			}

			for ( const viewportControls of vpEditorControls.values() ) {

				viewportControls.disconnect();

			}
			vpEditorControls.clear();

			renderer.setAnimationLoop( null );

			try {

				pmremGenerator.dispose();

			} catch ( e ) {

				console.warn( 'PMREMGenerator dispose error:', e );

			}

			renderer.dispose();

			container.dom.removeChild( renderer.domElement );

		}

		if ( multiViewportOverlay !== null ) {

			multiViewportOverlay.dispose();
			multiViewportOverlay = null;

		}

		controls.connect( newRenderer.domElement );
		transformControls.connect( newRenderer.domElement );

		renderer = newRenderer;
		ensureViewportEditorControls();

		renderer.setAnimationLoop( animate );
		renderer.setClearColor( 0xaaaaaa );

		if ( window.matchMedia ) {

			const mediaQuery = window.matchMedia( '(prefers-color-scheme: dark)' );
			mediaQuery.addEventListener( 'change', function ( event ) {

				renderer.setClearColor( event.matches ? 0x333333 : 0xaaaaaa );
				updateGridColors( grid1, grid2, event.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

				render();

			} );

			renderer.setClearColor( mediaQuery.matches ? 0x333333 : 0xaaaaaa );
			updateGridColors( grid1, grid2, mediaQuery.matches ? GRID_COLORS_DARK : GRID_COLORS_LIGHT );

		}

		renderer.getClearColor( editor.viewportColor );

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		if ( renderer.isWebGLRenderer ) {

			pmremGenerator = new THREE.PMREMGenerator( renderer );
			pmremGenerator.compileEquirectangularShader();

			pathtracer = new ViewportPathtracer( renderer );

		} else {

			pmremGenerator = new PMREMGenerator( renderer );

			pathtracer = null;

		}

		container.dom.appendChild( renderer.domElement );

		multiViewportOverlay = createMultiViewportOverlay(
			container.dom,
			vpStore,
			function () {

				return container.dom.getBoundingClientRect();

			},
		);

		vpInputHandler = routeViewportInput;

		container.dom.addEventListener( 'pointerdown', vpInputHandler, true );
		container.dom.addEventListener( 'pointermove', vpInputHandler, true );
		container.dom.addEventListener( 'pointerup', vpInputHandler, true );
		container.dom.addEventListener( 'pointercancel', vpInputHandler, true );
		container.dom.addEventListener( 'wheel', vpInputHandler, true );

		signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

		render();

	} );

	signals.rendererDetectKTX2Support.add( function ( ktx2Loader ) {

		ktx2Loader.detectSupport( renderer );

	} );

	signals.sceneGraphChanged.add( function () {

		initPT();
		render();

	} );

	signals.cameraChanged.add( function () {

		if ( pathtracer ) pathtracer.reset();

		render();

	} );

	signals.objectSelected.add( function ( object ) {

		selectionBox.visible = false;
		transformControls.detach();

		if ( object !== null && object !== scene && object !== camera ) {

			box.setFromObject( object, true );

			if ( box.isEmpty() === false ) {

				selectionBox.visible = true;

			}

			transformControls.attach( object );

		}

		render();

	} );

	signals.objectFocused.add( function ( object ) {

		controls.focus( object );

	} );

	signals.geometryChanged.add( function ( object ) {

		if ( object !== undefined ) {

			box.setFromObject( object, true );

		}

		initPT();
		render();

	} );

	signals.objectChanged.add( function ( object ) {

		if ( editor.selected === object ) {

			box.setFromObject( object, true );

		}

		if ( object.isPerspectiveCamera ) {

			object.updateProjectionMatrix();

		}

		const helper = editor.helpers[ object.id ];

		if ( helper !== undefined && helper.isSkeletonHelper !== true ) {

			helper.update();

		}

		initPT();
		render();

	} );

	signals.objectRemoved.add( function ( object ) {

		controls.enabled = true; // see #14180

		if ( object === transformControls.object ) {

			transformControls.detach();

		}

	} );

	signals.materialChanged.add( function () {

		updatePTMaterials();
		render();

	} );

	// background

	signals.sceneBackgroundChanged.add( function ( backgroundType, backgroundColor, backgroundTexture, backgroundEquirectangularTexture, backgroundColorSpace, backgroundBlurriness, backgroundIntensity, backgroundRotation ) {

		editor.backgroundType = backgroundType;

		scene.background = null;

		switch ( backgroundType ) {

			case 'Color':

				scene.background = new THREE.Color( backgroundColor );

				break;

			case 'Texture':

				if ( backgroundTexture ) {

					backgroundTexture.colorSpace = backgroundColorSpace;
					backgroundTexture.needsUpdate = true;

					scene.background = backgroundTexture;

				}

				break;

			case 'Equirectangular':

				if ( backgroundEquirectangularTexture ) {

					backgroundEquirectangularTexture.mapping = THREE.EquirectangularReflectionMapping;
					backgroundEquirectangularTexture.colorSpace = backgroundColorSpace;
					backgroundEquirectangularTexture.needsUpdate = true;

					scene.background = backgroundEquirectangularTexture;
					scene.backgroundBlurriness = backgroundBlurriness;
					scene.backgroundIntensity = backgroundIntensity;
					scene.backgroundRotation.y = backgroundRotation * THREE.MathUtils.DEG2RAD;

				}

				break;

		}

		if ( useBackgroundAsEnvironment ) {

			signals.sceneEnvironmentChanged.dispatch( editor.environmentType );

		}

		updatePTBackground();
		render();

	} );

	// environment

	let useBackgroundAsEnvironment = false;

	signals.sceneEnvironmentChanged.add( function ( environmentType, environmentEquirectangularTexture ) {

		editor.environmentType = environmentType;

		scene.environment = null;

		useBackgroundAsEnvironment = false;

		switch ( environmentType ) {

			case 'Equirectangular':

				if ( environmentEquirectangularTexture ) {

					scene.environment = environmentEquirectangularTexture;
					scene.environment.mapping = THREE.EquirectangularReflectionMapping;

				}

				break;

			case 'Default':

				useBackgroundAsEnvironment = true;

				if ( scene.background !== null ) {

					if ( scene.background.isColor ) {

						scene.environment = pmremGenerator.fromScene( new ColorEnvironment( scene.background ), 0.04 ).texture;

					} else if ( scene.background.isTexture ) {

						scene.environment = scene.background;
						scene.environment.mapping = THREE.EquirectangularReflectionMapping;
						scene.environmentRotation.y = scene.backgroundRotation.y;

					}

				} else {

					scene.environment = pmremGenerator.fromScene( new RoomEnvironment(), 0.04 ).texture;

				}

				break;

		}

		updatePTEnvironment();
		render();

	} );

	// fog

	signals.sceneFogChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'None':
				scene.fog = null;
				break;
			case 'Fog':
				scene.fog = new THREE.Fog( fogColor, fogNear, fogFar );
				break;
			case 'FogExp2':
				scene.fog = new THREE.FogExp2( fogColor, fogDensity );
				break;

		}

		render();

	} );

	signals.sceneFogSettingsChanged.add( function ( fogType, fogColor, fogNear, fogFar, fogDensity ) {

		switch ( fogType ) {

			case 'Fog':
				scene.fog.color.setHex( fogColor );
				scene.fog.near = fogNear;
				scene.fog.far = fogFar;
				break;
			case 'FogExp2':
				scene.fog.color.setHex( fogColor );
				scene.fog.density = fogDensity;
				break;

		}

		render();

	} );

	signals.viewportCameraChanged.add( function () {

		syncViewportCameras();

		const viewportCamera = editor.viewportCamera;

		if ( viewportCamera.isPerspectiveCamera || viewportCamera.isOrthographicCamera ) {

			updateAspectRatio();

		}

		// disable EditorControls when setting a user camera

		controls.enabled = ( viewportCamera === editor.camera );

		initPT();
		render();

	} );

	signals.viewportShadingChanged.add( function () {

		const viewportShading = editor.viewportShading;

		switch ( viewportShading ) {

			case 'realistic':
				if ( pathtracer ) pathtracer.init( scene, editor.viewportCamera );
				break;

			case 'solid':
				scene.overrideMaterial = null;
				break;

			case 'normals':
				scene.overrideMaterial = new THREE.MeshNormalMaterial();
				break;

			case 'wireframe':
				scene.overrideMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } );
				break;

		}

		render();

	} );

	//

	signals.windowResize.add( function () {

		updateAspectRatio();

		if ( renderer === null ) return;

		renderer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );
		if ( pathtracer ) pathtracer.setSize( container.dom.offsetWidth, container.dom.offsetHeight );

		if ( multiViewportOverlay !== null ) {

			multiViewportOverlay.sync();

		}

		render();

	} );

	signals.showHelpersChanged.add( function ( appearanceStates ) {

		grid.visible = appearanceStates.gridHelper;

		sceneHelpers.traverse( function ( object ) {

			switch ( object.type ) {

				case 'CameraHelper':

				{

					object.visible = appearanceStates.cameraHelpers;
					break;

				}

				case 'PointLightHelper':
				case 'DirectionalLightHelper':
				case 'SpotLightHelper':
				case 'HemisphereLightHelper':

				{

					object.visible = appearanceStates.lightHelpers;
					break;

				}

				case 'SkeletonHelper':

				{

					object.visible = appearanceStates.skeletonHelpers;
					break;

				}

				default:

				{

					// not a helper, skip.

				}

			}

		} );


		render();

	} );

	signals.cameraResetted.add( updateAspectRatio );

	// animations

	let prevActionsInUse = 0;

	const timer = new THREE.Timer(); // only used for animations

	function animate() {

		timer.update();

		const mixer = editor.mixer;
		const delta = timer.getDelta();

		let needsUpdate = false;

		// Animations

		const actions = mixer.stats.actions;

		if ( actions.inUse > 0 || prevActionsInUse > 0 ) {

			prevActionsInUse = actions.inUse;

			mixer.update( delta );
			needsUpdate = true;

			if ( editor.selected !== null ) {

				editor.selected.updateWorldMatrix( false, true ); // avoid frame late effect for certain skinned meshes (e.g. Michelle.glb)
				selectionBox.box.setFromObject( editor.selected, true ); // selection box should reflect current animation state

			}

			signals.morphTargetsUpdated.dispatch();

		}

		// View Helper

		if ( viewHelper.animating === true ) {

			viewHelper.update( delta );
			needsUpdate = true;

		}

		if ( renderer.xr.isPresenting === true ) {

			needsUpdate = true;

		}

		if ( needsUpdate === true ) render();

		updatePT();

	}

	function initPT() {

		if ( pathtracer && editor.viewportShading === 'realistic' ) {

			pathtracer.init( scene, editor.viewportCamera );

		}

	}

	function updatePTBackground() {

		if ( pathtracer && editor.viewportShading === 'realistic' ) {

			pathtracer.setBackground( scene.background, scene.backgroundBlurriness );

		}

	}

	function updatePTEnvironment() {

		if ( pathtracer && editor.viewportShading === 'realistic' ) {

			pathtracer.setEnvironment( scene.environment );

		}

	}

	function updatePTMaterials() {

		if ( pathtracer && editor.viewportShading === 'realistic' ) {

			pathtracer.updateMaterials();

		}

	}

	function updatePT() {

		if ( pathtracer && editor.viewportShading === 'realistic' ) {

			pathtracer.update();
			editor.signals.pathTracerUpdated.dispatch( pathtracer.getSamples() );

		}

	}

	//

	let startTime = 0;
	let endTime = 0;

	function render() {

		if ( renderer === null ) return;

		startTime = performance.now();

		syncViewportCameras();

		const W = container.dom.offsetWidth;
		const H = container.dom.offsetHeight;
		const s = vpStore.getState();
		const rects = computeViewportGrid(
			s.viewports.map( function ( v ) {

				return v.id;

			} ),
			W,
			H,
			s.colFractions,
			s.rowFractions,
		);

		renderer.setScissorTest( true );
		vpCameras.set( 'vp-1-perspective', editor.viewportCamera );

		for ( let ri = 0; ri < rects.length; ri ++ ) {

			const rect = rects[ ri ];
			const cam = vpCameras.get( rect.id ) ?? editor.viewportCamera;
			const yGl = H - rect.y - rect.height;

			syncViewportCameraProjection( cam, rect );

			renderer.setViewport( rect.x, yGl, rect.width, rect.height );
			renderer.setScissor( rect.x, yGl, rect.width, rect.height );
			renderer.clear( true, true, true );
			renderer.render( scene, cam );

			const renderEditorOverlays = cam !== editor.viewportCamera || camera === editor.viewportCamera;

			if ( renderEditorOverlays === true ) {

				renderer.setViewport( rect.x, yGl, rect.width, rect.height );
				renderer.setScissor( rect.x, yGl, rect.width, rect.height );
				renderer.autoClear = false;
				if ( grid.visible === true ) renderer.render( grid, cam );
				if ( sceneHelpers.visible === true ) renderer.render( sceneHelpers, cam );

			}

			if ( camera === editor.viewportCamera && cam === editor.viewportCamera ) {

				if ( renderer.xr.isPresenting !== true ) viewHelper.render( renderer );

			}

			renderer.autoClear = true;

		}

		renderer.setScissorTest( false );
		renderer.setViewport( 0, 0, W, H );

		endTime = performance.now();
		editor.signals.sceneRendered.dispatch( endTime - startTime );

	}

	return container;

}

function updateGridColors( grid1, grid2, colors ) {

	grid1.material.color.setHex( colors[ 0 ] );
	grid2.material.color.setHex( colors[ 1 ] );

}

export { Viewport };

import { UIPanel, UISelect } from './libs/ui.js';
import { createCommandIcon } from './CommandIcons.js';

function createDockedSelectControl( icon, select ) {

	const control = document.createElement( 'label' );
	control.className = 'ViewportControls-control';

	const iconWrap = document.createElement( 'span' );
	iconWrap.className = 'Toolbar-buttonIcon';
	iconWrap.appendChild( createCommandIcon( icon ) );
	control.appendChild( iconWrap );

	control.appendChild( select.dom );

	return control;

}

function ViewportControls( editor, options = {} ) {

	const signals = editor.signals;
	const docked = options.docked === true;

	const container = new UIPanel();
	container.dom.classList.add( 'ViewportControls' );

	if ( docked === true ) {

		container.dom.classList.add( 'ViewportControls--docked' );

	} else {

		container.setPosition( 'absolute' );
		container.setRight( '10px' );
		container.setTop( '10px' );

	}

	// camera

	const cameraSelect = new UISelect();
	cameraSelect.dom.classList.add( 'ViewportControls-select' );
	cameraSelect.dom.style.padding = '';

	if ( docked === false ) {

		cameraSelect.setMarginRight( '10px' );

	}
	cameraSelect.onChange( function () {

		editor.setViewportCamera( this.getValue() );

	} );

	if ( docked === true ) {

		container.dom.appendChild( createDockedSelectControl( 'camera', cameraSelect ) );

	} else {

		container.add( cameraSelect );

	}

	signals.cameraAdded.add( update );
	signals.cameraRemoved.add( update );
	signals.objectChanged.add( function ( object ) {

		if ( object.isCamera ) {

			updateCameraList();

		}

	} );

	// shading

	const shadingSelect = new UISelect();
	shadingSelect.dom.classList.add( 'ViewportControls-select' );
	shadingSelect.dom.style.padding = '';
	shadingSelect.setOptions( { 'realistic': 'Realistic', 'solid': 'Solid', 'normals': 'Normals', 'wireframe': 'Wireframe' } );
	shadingSelect.setValue( 'solid' );
	shadingSelect.onChange( function () {

		editor.setViewportShading( this.getValue() );

	} );

	if ( docked === true ) {

		container.dom.appendChild( createDockedSelectControl( 'sphere-3d', shadingSelect ) );

	} else {

		container.add( shadingSelect );

	}

	signals.editorCleared.add( function () {

		editor.setViewportCamera( editor.camera.uuid );

		shadingSelect.setValue( 'solid' );
		editor.setViewportShading( shadingSelect.getValue() );

	} );

	signals.cameraResetted.add( update );

	update();

	//

	function updateCameraList() {

		const options = {};

		const cameras = editor.cameras;

		for ( const key in cameras ) {

			const camera = cameras[ key ];
			options[ camera.uuid ] = camera.name;

		}

		cameraSelect.setOptions( options );

		const selectedCamera = ( editor.viewportCamera.uuid in options )
			? editor.viewportCamera
			: editor.camera;

		cameraSelect.setValue( selectedCamera.uuid );

		return selectedCamera;

	}

	function update() {

		const selectedCamera = updateCameraList();
		editor.setViewportCamera( selectedCamera.uuid );

	}

	return container;

}

export { ViewportControls };

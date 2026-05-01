import { UIPanel } from './libs/ui.js';
import { createCommandIcon } from './CommandIcons.js';
import { showKeyboardShortcuts } from './KeyboardShortcutsDialog.js';
import { ViewportControls } from './Viewport.Controls.js';

function createToolbarButton( icon, label, onClick ) {

	const button = document.createElement( 'button' );
	button.className = 'Toolbar-button';
	button.type = 'button';
	button.title = label;
	button.setAttribute( 'aria-label', label );

	const iconWrap = document.createElement( 'span' );
	iconWrap.className = 'Toolbar-buttonIcon';
	iconWrap.appendChild( createCommandIcon( icon ) );
	button.appendChild( iconWrap );

	const labelWrap = document.createElement( 'span' );
	labelWrap.className = 'Toolbar-buttonLabel';
	labelWrap.textContent = label;
	button.appendChild( labelWrap );

	button.addEventListener( 'click', onClick );

	return button;

}

function Toolbar( editor, commandPalette ) {

	const signals = editor.signals;
	const strings = editor.strings;

	const container = new UIPanel();
	container.setId( 'toolbar' );
	container.dom.classList.add( 'CommandDock' );

	const transformButton = createToolbarButton( 'move3d', strings.getKey( 'commandPalette/group/transform' ), function ( event ) {

		event.stopPropagation();
		transformFlyout.hidden = ! transformFlyout.hidden;
		transformButton.dataset.open = String( ! transformFlyout.hidden );

	} );

	const commandsButton = createToolbarButton( 'command', strings.getKey( 'commandPalette/title' ), function () {

		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';
		commandPalette.openMainMenu();

	} );

	const addButton = createToolbarButton( 'circlePlus', strings.getKey( 'menubar/add' ), function () {

		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';
		commandPalette.openAddMenu();

	} );

	const shortcutsButton = createToolbarButton( 'keyboard', strings.getKey( 'keyboard/shortcuts/title' ), function () {

		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';
		showKeyboardShortcuts( editor );

	} );

	const transformFlyout = document.createElement( 'div' );
	transformFlyout.className = 'Toolbar-flyout';
	transformFlyout.hidden = true;

	const viewportControls = new ViewportControls( editor, { docked: true } );

	const translate = createToolbarButton( 'move3d', strings.getKey( 'toolbar/translate' ), function () {

		signals.transformModeChanged.dispatch( 'translate' );
		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';

	} );

	const rotate = createToolbarButton( 'rotate3d', strings.getKey( 'toolbar/rotate' ), function () {

		signals.transformModeChanged.dispatch( 'rotate' );
		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';

	} );

	const scale = createToolbarButton( 'scale3d', strings.getKey( 'toolbar/scale' ), function () {

		signals.transformModeChanged.dispatch( 'scale' );
		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';

	} );

	transformFlyout.appendChild( translate );
	transformFlyout.appendChild( rotate );
	transformFlyout.appendChild( scale );

	container.dom.appendChild( commandsButton );
	container.dom.appendChild( transformButton );
	container.dom.appendChild( addButton );
	container.dom.appendChild( shortcutsButton );
	container.dom.appendChild( viewportControls.dom );
	container.dom.appendChild( transformFlyout );

	container.dom.addEventListener( 'keydown', function ( event ) {

		if ( event.key !== 'Escape' ) return;

		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';
		transformButton.focus();

	} );

	document.addEventListener( 'click', function ( event ) {

		if ( container.dom.contains( event.target ) ) return;

		transformFlyout.hidden = true;
		transformButton.dataset.open = 'false';

	} );

	signals.transformModeChanged.add( function ( mode ) {

		translate.dataset.active = String( mode === 'translate' );
		rotate.dataset.active = String( mode === 'rotate' );
		scale.dataset.active = String( mode === 'scale' );

	} );

	translate.dataset.active = 'true';
	transformButton.dataset.open = 'false';

	return container;

}

export { Toolbar };

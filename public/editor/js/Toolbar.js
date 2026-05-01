import { ADD_COMMANDS } from './AddCommands.js';
import { createCommandIcon } from './CommandIcons.js';
import { showKeyboardShortcuts } from './KeyboardShortcutsDialog.js';
import { ViewportControls } from './Viewport.Controls.js';
import { UIPanel } from './libs/ui.js';

const TRANSFORM_COMMANDS = [
	{
		id: 'tool.translate',
		labelKey: 'toolbar/translate',
		icon: 'move3d',
		mode: 'translate'
	},
	{
		id: 'tool.rotate',
		labelKey: 'toolbar/rotate',
		icon: 'rotate3d',
		mode: 'rotate'
	},
	{
		id: 'tool.scale',
		labelKey: 'toolbar/scale',
		icon: 'scale3d',
		mode: 'scale'
	}
];

const ADD_GROUPS = [
	{
		id: 'general',
		labelKey: 'commandPalette/category/general',
		icon: 'group'
	},
	{
		id: 'mesh',
		labelKey: 'menubar/add/mesh',
		icon: 'box'
	},
	{
		id: 'light',
		labelKey: 'menubar/add/light',
		icon: 'sun'
	},
	{
		id: 'camera',
		labelKey: 'menubar/add/camera',
		icon: 'camera'
	}
];

function createIconButton( icon, label, onClick ) {

	const button = document.createElement( 'button' );
	button.className = 'Toolbar-button';
	button.type = 'button';
	button.title = label;
	button.setAttribute( 'aria-label', label );
	button.appendChild( createCommandIcon( icon ) );
	button.addEventListener( 'click', onClick );

	return button;

}

function Toolbar( editor, commandPalette ) {

	const signals = editor.signals;
	const strings = editor.strings;
	const addCommandsByCategory = new Map();
	const groupButtons = new Map();
	const commandButtons = new Map();
	let currentTransformMode = 'translate';

	for ( const command of ADD_COMMANDS ) {

		if ( addCommandsByCategory.has( command.category ) === false ) {

			addCommandsByCategory.set( command.category, [] );

		}

		addCommandsByCategory.get( command.category ).push( command );

	}

	const container = new UIPanel();
	container.setId( 'toolbar' );
	container.dom.classList.add( 'CommandDock' );

	const flyout = document.createElement( 'div' );
	flyout.className = 'Toolbar-flyout';
	flyout.hidden = true;

	function closeFlyout() {

		flyout.hidden = true;

		for ( const button of groupButtons.values() ) {

			button.dataset.open = 'false';

		}

	}

	function setOpenButton( activeButton ) {

		for ( const button of groupButtons.values() ) {

			button.dataset.open = String( button === activeButton );

		}

	}

	function createFlyoutCommandButton( command, onClick ) {

		const button = createIconButton( command.icon, strings.getKey( command.labelKey ), function () {

			onClick( command );

		} );
		button.classList.add( 'Toolbar-commandButton' );
		button.dataset.commandId = command.id;
		if ( command.mode !== undefined ) button.dataset.active = String( command.mode === currentTransformMode );
		commandButtons.set( command.id, button );

		return button;

	}

	function openFlyout( activeButton, category, commands, onCommand ) {

		if ( flyout.hidden === false && activeButton.dataset.open === 'true' ) {

			closeFlyout();
			return;

		}

		flyout.textContent = '';
		flyout.dataset.category = category;

		for ( const command of commands ) {

			flyout.appendChild( createFlyoutCommandButton( command, onCommand ) );

		}

		flyout.hidden = false;
		setOpenButton( activeButton );

	}

	const commandPaletteButton = createIconButton( 'command', strings.getKey( 'commandPalette/title' ), function () {

		closeFlyout();
		commandPalette.openMainMenu();

	} );

	const transformButton = createIconButton( 'move3d', strings.getKey( 'commandPalette/group/transform' ), function () {

		openFlyout( transformButton, 'transform', TRANSFORM_COMMANDS, function ( command ) {

			signals.transformModeChanged.dispatch( command.mode );
			closeFlyout();

		} );

	} );
	groupButtons.set( 'transform', transformButton );

	container.dom.appendChild( commandPaletteButton );
	container.dom.appendChild( transformButton );

	for ( const group of ADD_GROUPS ) {

		const groupButton = createIconButton( group.icon, strings.getKey( group.labelKey ), function () {

			openFlyout( groupButton, group.id, addCommandsByCategory.get( group.id ) || [], function ( command ) {

				command.run( editor );
				closeFlyout();

			} );

		} );

		groupButtons.set( group.id, groupButton );
		container.dom.appendChild( groupButton );

	}

	const shortcutsButton = createIconButton( 'keyboard', strings.getKey( 'keyboard/shortcuts/title' ), function () {

		closeFlyout();
		showKeyboardShortcuts( editor );

	} );

	const viewportControls = new ViewportControls( editor, { docked: true } );

	container.dom.appendChild( shortcutsButton );
	container.dom.appendChild( viewportControls.dom );
	container.dom.appendChild( flyout );

	container.dom.addEventListener( 'keydown', function ( event ) {

		if ( event.key !== 'Escape' ) return;

		closeFlyout();
		transformButton.focus();

	} );

	document.addEventListener( 'click', function ( event ) {

		if ( container.dom.contains( event.target ) ) return;

		closeFlyout();

	} );

	signals.transformModeChanged.add( function ( mode ) {

		currentTransformMode = mode;

		for ( const command of TRANSFORM_COMMANDS ) {

			const button = commandButtons.get( command.id );
			if ( button === undefined ) continue;

			button.dataset.active = String( command.mode === mode );

		}

	} );

	transformButton.dataset.open = 'false';

	for ( const groupButton of groupButtons.values() ) {

		groupButton.dataset.open = 'false';

	}

	return container;

}

export { Toolbar };

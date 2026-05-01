import { UIButton } from './libs/ui.js';
import { getKeyboardShortcutSections } from './KeyboardShortcuts.js';

let currentDialog = null;

function createKeyBadge( keys ) {

	const badge = document.createElement( 'span' );
	badge.className = 'KeyboardShortcutBadge';
	badge.textContent = keys;

	return badge;

}

function closeKeyboardShortcuts() {

	if ( currentDialog === null ) return;

	document.removeEventListener( 'keydown', currentDialog.onKeyDown );
	currentDialog.dom.remove();
	currentDialog = null;

}

function showKeyboardShortcuts( editor ) {

	closeKeyboardShortcuts();

	const strings = editor.strings;
	const overlay = document.createElement( 'div' );
	overlay.className = 'Dialog KeyboardShortcutsDialog';

	const background = document.createElement( 'div' );
	background.className = 'Dialog-background';
	overlay.appendChild( background );

	const content = document.createElement( 'div' );
	content.className = 'Dialog-content KeyboardShortcutsDialog-content';
	content.setAttribute( 'role', 'dialog' );
	content.setAttribute( 'aria-modal', 'true' );
	content.setAttribute( 'aria-labelledby', 'keyboard-shortcuts-title' );
	overlay.appendChild( content );

	const title = document.createElement( 'div' );
	title.className = 'Dialog-title';
	title.id = 'keyboard-shortcuts-title';
	title.textContent = strings.getKey( 'keyboard/shortcuts/title' );
	content.appendChild( title );

	const body = document.createElement( 'div' );
	body.className = 'Dialog-body KeyboardShortcutsDialog-body';
	content.appendChild( body );

	for ( const section of getKeyboardShortcutSections( editor ) ) {

		const sectionElement = document.createElement( 'section' );
		sectionElement.className = 'KeyboardShortcutSection';

		const heading = document.createElement( 'h3' );
		heading.className = 'KeyboardShortcutSection-title';
		heading.textContent = section.label;
		sectionElement.appendChild( heading );

		for ( const shortcut of section.shortcuts ) {

			const row = document.createElement( 'div' );
			row.className = 'KeyboardShortcutRow';

			const label = document.createElement( 'span' );
			label.className = 'KeyboardShortcutLabel';
			label.textContent = shortcut.label;
			row.appendChild( label );

			row.appendChild( createKeyBadge( shortcut.keys ) );
			sectionElement.appendChild( row );

		}

		body.appendChild( sectionElement );

	}

	const buttons = document.createElement( 'div' );
	buttons.className = 'Dialog-buttons';
	content.appendChild( buttons );

	const closeButton = new UIButton( strings.getKey( 'dialog/ok' ) );
	closeButton.onClick( closeKeyboardShortcuts );
	buttons.appendChild( closeButton.dom );

	function onKeyDown( event ) {

		if ( event.key === 'Escape' ) {

			event.preventDefault();
			closeKeyboardShortcuts();

		}

	}

	background.addEventListener( 'click', closeKeyboardShortcuts );
	document.addEventListener( 'keydown', onKeyDown );

	currentDialog = { dom: overlay, onKeyDown };
	document.body.appendChild( overlay );
	closeButton.dom.focus();

}

export { closeKeyboardShortcuts, showKeyboardShortcuts };

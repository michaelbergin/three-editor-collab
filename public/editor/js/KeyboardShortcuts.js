function isMacOS() {

	return navigator.platform.toUpperCase().indexOf( 'MAC' ) >= 0;

}

function eventUsesPrimaryModifier( event ) {

	return isMacOS() ? event.metaKey : event.ctrlKey;

}

function isKeyboardEventFromEditable( event ) {

	const target = event.target;

	if ( target === null || target === document.body ) return false;

	const element = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;

	if ( element === null || element === undefined ) return false;

	if ( element.closest( '.CommandPalette' ) !== null ) return true;
	if ( element.closest( '.Dialog' ) !== null ) return true;
	if ( element.closest( '.CodeMirror' ) !== null ) return true;
	if ( element.closest( '[contenteditable="true"]' ) !== null ) return true;

	const tagName = element.tagName.toLowerCase();

	return tagName === 'input' || tagName === 'textarea' || tagName === 'select';

}

function formatSingleKeyShortcut( key ) {

	return String( key || '' ).toUpperCase();

}

function formatPrimaryShortcut( key, shiftKey = false ) {

	const parts = [ isMacOS() ? 'Cmd' : 'Ctrl' ];

	if ( shiftKey ) parts.push( 'Shift' );

	parts.push( key.toUpperCase() );

	return parts.join( '+' );

}

function getKeyboardShortcutSections( editor ) {

	const config = editor.config;
	const strings = editor.strings;

	return [
		{
			label: strings.getKey( 'keyboard/shortcuts/section/command' ),
			shortcuts: [
				{ label: strings.getKey( 'keyboard/shortcuts/commandPalette' ), keys: formatPrimaryShortcut( 'k' ) },
				{ label: strings.getKey( 'keyboard/shortcuts/addCommands' ), keys: 'Shift+A' },
				{ label: strings.getKey( 'keyboard/shortcuts/showShortcuts' ), keys: formatPrimaryShortcut( '/' ) }
			]
		},
		{
			label: strings.getKey( 'keyboard/shortcuts/section/transform' ),
			shortcuts: [
				{ label: strings.getKey( 'sidebar/settings/shortcuts/translate' ), keys: formatSingleKeyShortcut( config.getKey( 'settings/shortcuts/translate' ) ) },
				{ label: strings.getKey( 'sidebar/settings/shortcuts/rotate' ), keys: formatSingleKeyShortcut( config.getKey( 'settings/shortcuts/rotate' ) ) },
				{ label: strings.getKey( 'sidebar/settings/shortcuts/scale' ), keys: formatSingleKeyShortcut( config.getKey( 'settings/shortcuts/scale' ) ) },
				{ label: strings.getKey( 'sidebar/settings/shortcuts/focus' ), keys: formatSingleKeyShortcut( config.getKey( 'settings/shortcuts/focus' ) ) }
			]
		},
		{
			label: strings.getKey( 'keyboard/shortcuts/section/edit' ),
			shortcuts: [
				{ label: strings.getKey( 'menubar/edit/delete' ), keys: 'Delete / Backspace' },
				{ label: strings.getKey( 'sidebar/settings/shortcuts/undo' ), keys: formatPrimaryShortcut( config.getKey( 'settings/shortcuts/undo' ) ) },
				{ label: strings.getKey( 'menubar/edit/redo' ), keys: formatPrimaryShortcut( config.getKey( 'settings/shortcuts/undo' ), true ) }
			]
		}
	];

}

export {
	eventUsesPrimaryModifier,
	formatPrimaryShortcut,
	getKeyboardShortcutSections,
	isKeyboardEventFromEditable,
	isMacOS
};

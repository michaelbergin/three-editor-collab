import { ADD_COMMANDS } from './AddCommands.js';
import { createCommandIcon } from './CommandIcons.js';
import { eventUsesPrimaryModifier, isKeyboardEventFromEditable } from './KeyboardShortcuts.js';
import { showKeyboardShortcuts } from './KeyboardShortcutsDialog.js';

const MAIN_CATEGORY_DEFINITIONS = [
	{ id: 'all', labelKey: 'commandPalette/category/all', icon: 'command' },
	{ id: 'tools', labelKey: 'commandPalette/category/tools', icon: 'move3d' },
	{ id: 'menus', labelKey: 'commandPalette/category/menus', icon: 'circlePlus' },
	{ id: 'help', labelKey: 'menubar/help', icon: 'keyboard' }
];

const TRANSFORM_CATEGORY_DEFINITIONS = [
	{ id: 'all', labelKey: 'commandPalette/category/all', icon: 'command' }
];

const ADD_CATEGORY_DEFINITIONS = [
	{ id: 'all', labelKey: 'commandPalette/category/all', icon: 'command' },
	{ id: 'general', labelKey: 'commandPalette/category/general', icon: 'group' },
	{ id: 'mesh', labelKey: 'menubar/add/mesh', icon: 'box' },
	{ id: 'light', labelKey: 'menubar/add/light', icon: 'sun' },
	{ id: 'camera', labelKey: 'menubar/add/camera', icon: 'camera' }
];

function getAddCommandKeywords( editor ) {

	return ADD_COMMANDS.flatMap( command => [
		command.id,
		editor.strings.getKey( command.labelKey ),
		...( command.keywords || [] )
	] );

}

function getTransformCommands( editor ) {

	return [
		{
			id: 'tool.translate',
			category: 'all',
			labelKey: 'toolbar/translate',
			icon: 'move3d',
			keywords: [ 'translate', 'move', 'position', 'transform' ],
			run: function () {

				editor.signals.transformModeChanged.dispatch( 'translate' );

			}
		},
		{
			id: 'tool.rotate',
			category: 'all',
			labelKey: 'toolbar/rotate',
			icon: 'rotate3d',
			keywords: [ 'rotate', 'rotation', 'transform' ],
			run: function () {

				editor.signals.transformModeChanged.dispatch( 'rotate' );

			}
		},
		{
			id: 'tool.scale',
			category: 'all',
			labelKey: 'toolbar/scale',
			icon: 'scale3d',
			keywords: [ 'scale', 'resize', 'transform' ],
			run: function () {

				editor.signals.transformModeChanged.dispatch( 'scale' );

			}
		}
	];

}

function getTransformCommandKeywords( editor ) {

	return getTransformCommands( editor ).flatMap( command => [
		command.id,
		editor.strings.getKey( command.labelKey ),
		...( command.keywords || [] )
	] );

}

function normalizeSearchValue( value ) {

	return value.toLowerCase().trim();

}

function getCommandSearchText( editor, command ) {

	const strings = editor.strings;
	const categories = command.mode === 'add' ? ADD_CATEGORY_DEFINITIONS : command.mode === 'transform' ? TRANSFORM_CATEGORY_DEFINITIONS : MAIN_CATEGORY_DEFINITIONS;
	const category = categories.find( item => item.id === command.category );
	const categoryLabel = category ? strings.getKey( category.labelKey ) : command.category;

	return [
		command.id,
		strings.getKey( command.labelKey ),
		categoryLabel,
		...( command.keywords || [] )
	].join( ' ' ).toLowerCase();

}

function CommandPalette( editor ) {

	const strings = editor.strings;

	this.editor = editor;
	this.mode = 'main';
	this.activeCategory = 'all';
	this.activeIndex = 0;
	this.query = '';
	this.commands = [
		{
			id: 'menu.transform',
			category: 'tools',
			labelKey: 'commandPalette/group/transform',
			icon: 'move3d',
			submenu: 'transform',
			keywords: [ 'transform', 'tools', ...getTransformCommandKeywords( editor ) ]
		},
		{
			id: 'menu.add',
			category: 'menus',
			labelKey: 'menubar/add',
			icon: 'circlePlus',
			submenu: 'add',
			keywords: [ 'add', 'create', 'insert', ...getAddCommandKeywords( editor ) ]
		},
		{
			id: 'help.keyboardShortcuts',
			category: 'help',
			labelKey: 'keyboard/shortcuts/title',
			icon: 'keyboard',
			keywords: [ 'keyboard', 'shortcuts', 'hotkeys', 'keys' ],
			run: function () {

				showKeyboardShortcuts( editor );

			}
		}
	];

	this.dom = document.createElement( 'div' );
	this.dom.className = 'CommandPalette';
	this.dom.hidden = true;
	this.dom.innerHTML = [
		'<div class="CommandPalette-backdrop"></div>',
		'<div class="CommandPalette-panel" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">',
		'	<div class="CommandPalette-searchRow">',
		'		<button class="CommandPalette-backButton" type="button" hidden></button>',
		'		<div class="CommandPalette-searchIcon"></div>',
		'		<input class="CommandPalette-search" type="search" autocomplete="off" spellcheck="false">',
		'	</div>',
		'	<div class="CommandPalette-content">',
		'		<nav class="CommandPalette-categories" aria-label="Command categories"></nav>',
		'		<div class="CommandPalette-resultsPane">',
		'			<div class="CommandPalette-heading" id="command-palette-title"></div>',
		'			<div class="CommandPalette-results" role="listbox"></div>',
		'			<div class="CommandPalette-empty"></div>',
		'		</div>',
		'	</div>',
		'	<div class="CommandPalette-footer"></div>',
		'</div>'
	].join( '' );

	this.backdrop = this.dom.querySelector( '.CommandPalette-backdrop' );
	this.searchRow = this.dom.querySelector( '.CommandPalette-searchRow' );
	this.backButton = this.dom.querySelector( '.CommandPalette-backButton' );
	this.searchIcon = this.dom.querySelector( '.CommandPalette-searchIcon' );
	this.searchInput = this.dom.querySelector( '.CommandPalette-search' );
	this.categoriesElement = this.dom.querySelector( '.CommandPalette-categories' );
	this.headingElement = this.dom.querySelector( '.CommandPalette-heading' );
	this.resultsElement = this.dom.querySelector( '.CommandPalette-results' );
	this.emptyElement = this.dom.querySelector( '.CommandPalette-empty' );
	this.footerElement = this.dom.querySelector( '.CommandPalette-footer' );

	this.backButton.appendChild( createCommandIcon( 'chevronLeft' ) );
	this.backButton.setAttribute( 'aria-label', strings.getKey( 'commandPalette/back' ) );
	this.backButton.title = strings.getKey( 'commandPalette/back' );
	this.searchIcon.appendChild( createCommandIcon( 'search' ) );
	this.searchInput.placeholder = strings.getKey( 'commandPalette/search' );
	this.emptyElement.textContent = strings.getKey( 'commandPalette/empty' );
	this.footerElement.textContent = strings.getKey( 'commandPalette/footer' );

	this.searchInput.addEventListener( 'input', () => {

		this.query = this.searchInput.value;
		this.activeIndex = 0;
		this.renderCommands();

	} );

	this.backdrop.addEventListener( 'click', () => {

		this.close();

	} );

	this.backButton.addEventListener( 'click', () => {

		this.openMainMenu();

	} );

	this.dom.addEventListener( 'keydown', event => {

		this.handlePaletteKeyDown( event );

	} );

	document.addEventListener( 'keydown', event => {

		this.handleDocumentKeyDown( event );

	} );

	this.renderCategories();
	this.renderCommands();

}

CommandPalette.prototype = {

	open: function ( options = {} ) {

		this.mode = options.mode || ( options.addOnly === true ? 'add' : 'main' );
		this.activeCategory = options.category || 'all';
		this.activeIndex = 0;
		this.query = options.query || '';
		this.searchInput.value = this.query;
		this.dom.hidden = false;
		this.renderShell();
		this.renderCategories();
		this.renderCommands();

		window.requestAnimationFrame( () => {

			this.searchInput.focus();
			this.searchInput.select();

		} );

	},

	openMainMenu: function ( options = {} ) {

		this.open( { mode: 'main', query: options.query || '' } );

	},

	openAddMenu: function ( options = {} ) {

		this.open( { mode: 'add', query: options.query || '', category: options.category || 'all' } );

	},

	openTransformMenu: function ( options = {} ) {

		this.open( { mode: 'transform', query: options.query || '', category: 'all' } );

	},

	close: function () {

		this.dom.hidden = true;

	},

	getCategoryDefinitions: function () {

		if ( this.mode === 'transform' ) {

			return TRANSFORM_CATEGORY_DEFINITIONS;

		}

		return this.mode === 'add' ? ADD_CATEGORY_DEFINITIONS : MAIN_CATEGORY_DEFINITIONS;

	},

	getAvailableCommands: function () {

		if ( this.mode === 'add' ) {

			return ADD_COMMANDS.map( command => ( { ...command, mode: 'add' } ) );

		}

		if ( this.mode === 'transform' ) {

			return getTransformCommands( this.editor ).map( command => ( { ...command, mode: 'transform' } ) );

		}

		return this.commands.map( command => ( { ...command, mode: 'main' } ) );

	},

	renderShell: function () {

		const isAddMenu = this.mode === 'add';
		const isTransformMenu = this.mode === 'transform';
		const isSubmenu = isAddMenu || isTransformMenu;

		this.backButton.hidden = ! isSubmenu;
		this.searchRow.dataset.hasBack = String( isSubmenu );
		this.searchInput.placeholder = isAddMenu ? this.editor.strings.getKey( 'commandPalette/searchAdd' ) : isTransformMenu ? this.editor.strings.getKey( 'commandPalette/searchTransform' ) : this.editor.strings.getKey( 'commandPalette/search' );
		this.footerElement.textContent = isAddMenu ? this.editor.strings.getKey( 'commandPalette/footerAdd' ) : isTransformMenu ? this.editor.strings.getKey( 'commandPalette/footerTransform' ) : this.editor.strings.getKey( 'commandPalette/footer' );

	},

	getFilteredCommands: function () {

		const query = normalizeSearchValue( this.query );

		return this.getAvailableCommands().filter( command => {

			if ( this.activeCategory !== 'all' && command.category !== this.activeCategory ) return false;
			if ( query === '' ) return true;

			return getCommandSearchText( this.editor, command ).includes( query );

		} );

	},

	renderCategories: function () {

		const strings = this.editor.strings;
		const categories = this.getCategoryDefinitions();
		this.categoriesElement.textContent = '';

		for ( const category of categories ) {

			const button = document.createElement( 'button' );
			button.className = 'CommandPalette-category';
			button.type = 'button';
			button.dataset.category = category.id;
			button.dataset.active = String( category.id === this.activeCategory );

			const iconWrap = document.createElement( 'span' );
			iconWrap.className = 'CommandPalette-categoryIcon';
			iconWrap.appendChild( createCommandIcon( category.icon ) );
			button.appendChild( iconWrap );

			const label = document.createElement( 'span' );
			label.textContent = strings.getKey( category.labelKey );
			button.appendChild( label );

			const count = document.createElement( 'span' );
			count.className = 'CommandPalette-categoryCount';
			count.textContent = String( this.getAvailableCommands().filter( command => category.id === 'all' || command.category === category.id ).length );
			button.appendChild( count );

			button.addEventListener( 'click', () => {

				this.activeCategory = category.id;
				this.activeIndex = 0;
				this.renderCategories();
				this.renderCommands();
				this.searchInput.focus();

			} );

			this.categoriesElement.appendChild( button );

		}

	},

	renderCommands: function () {

		const strings = this.editor.strings;
		const commands = this.getFilteredCommands();
		const categories = this.getCategoryDefinitions();
		const activeCategory = categories.find( category => category.id === this.activeCategory );

		this.headingElement.textContent = activeCategory ? ( this.mode === 'add' ? strings.getKey( 'menubar/add' ) + ' / ' : this.mode === 'transform' ? strings.getKey( 'commandPalette/group/transform' ) + ' / ' : '' ) + strings.getKey( activeCategory.labelKey ) : '';
		this.resultsElement.textContent = '';
		this.emptyElement.hidden = commands.length > 0;
		this.resultsElement.hidden = commands.length === 0;

		if ( commands.length === 0 ) return;

		if ( this.activeIndex >= commands.length ) this.activeIndex = commands.length - 1;

		commands.forEach( ( command, index ) => {

			const button = document.createElement( 'button' );
			button.className = 'CommandPalette-command';
			button.type = 'button';
			button.dataset.active = String( index === this.activeIndex );
			button.setAttribute( 'role', 'option' );
			button.setAttribute( 'aria-selected', String( index === this.activeIndex ) );

			const iconWrap = document.createElement( 'span' );
			iconWrap.className = 'CommandPalette-commandIcon';
			iconWrap.appendChild( createCommandIcon( command.icon ) );
			button.appendChild( iconWrap );

			const textWrap = document.createElement( 'span' );
			textWrap.className = 'CommandPalette-commandText';

			const label = document.createElement( 'span' );
			label.className = 'CommandPalette-commandLabel';
			label.textContent = strings.getKey( command.labelKey );
			textWrap.appendChild( label );

			const meta = document.createElement( 'span' );
			meta.className = 'CommandPalette-commandMeta';
			meta.textContent = command.id;
			textWrap.appendChild( meta );

			button.appendChild( textWrap );

			if ( command.submenu !== undefined ) {

				const affordance = document.createElement( 'span' );
				affordance.className = 'CommandPalette-commandAffordance';
				affordance.appendChild( createCommandIcon( 'chevronRight' ) );
				button.appendChild( affordance );

			}

			button.addEventListener( 'mouseenter', () => {

				this.activeIndex = index;
				this.syncActiveCommand();

			} );

			button.addEventListener( 'click', () => {

				this.runCommand( command );

			} );

			this.resultsElement.appendChild( button );

		} );

		this.syncActiveCommand();

	},

	syncActiveCommand: function () {

		const buttons = [ ...this.resultsElement.querySelectorAll( '.CommandPalette-command' ) ];

		buttons.forEach( ( button, index ) => {

			const isActive = index === this.activeIndex;
			button.dataset.active = String( isActive );
			button.setAttribute( 'aria-selected', String( isActive ) );

		} );

		const activeButton = buttons[ this.activeIndex ];
		if ( activeButton !== undefined ) activeButton.scrollIntoView( { block: 'nearest' } );

	},

	runCommand: function ( command ) {

		if ( command.submenu === 'add' ) {

			this.openAddMenu( { query: this.query } );
			return;

		}

		if ( command.submenu === 'transform' ) {

			this.openTransformMenu( { query: this.query } );
			return;

		}

		this.close();
		command.run( this.editor );

	},

	selectCategoryByOffset: function ( offset ) {

		const categories = this.getCategoryDefinitions();
		const currentIndex = categories.findIndex( category => category.id === this.activeCategory );
		const nextIndex = ( currentIndex + offset + categories.length ) % categories.length;
		this.activeCategory = categories[ nextIndex ].id;
		this.activeIndex = 0;
		this.renderCategories();
		this.renderCommands();

	},

	handlePaletteKeyDown: function ( event ) {

		const commands = this.getFilteredCommands();

		if ( event.key === 'Escape' ) {

			event.preventDefault();
			if ( this.mode !== 'main' ) {

				this.openMainMenu();
				return;

			}

			this.close();
			return;

		}

		if ( event.key === 'Enter' ) {

			event.preventDefault();
			if ( commands[ this.activeIndex ] !== undefined ) this.runCommand( commands[ this.activeIndex ] );
			return;

		}

		if ( event.key === 'ArrowDown' ) {

			event.preventDefault();
			if ( commands.length === 0 ) return;
			this.activeIndex = ( this.activeIndex + 1 ) % commands.length;
			this.syncActiveCommand();
			return;

		}

		if ( event.key === 'ArrowUp' ) {

			event.preventDefault();
			if ( commands.length === 0 ) return;
			this.activeIndex = ( this.activeIndex - 1 + commands.length ) % commands.length;
			this.syncActiveCommand();
			return;

		}

		if ( event.key === 'ArrowRight' ) {

			event.preventDefault();
			this.selectCategoryByOffset( 1 );
			return;

		}

		if ( event.key === 'ArrowLeft' ) {

			event.preventDefault();
			this.selectCategoryByOffset( - 1 );
			return;

		}

		if ( event.key === 'Tab' ) {

			event.preventDefault();
			this.selectCategoryByOffset( event.shiftKey ? - 1 : 1 );
			return;

		}

		if ( /^[1-5]$/.test( event.key ) ) {

			event.preventDefault();
			const categories = this.getCategoryDefinitions();
			const category = categories[ Number( event.key ) - 1 ];
			if ( category === undefined ) return;

			this.activeCategory = category.id;
			this.activeIndex = 0;
			this.renderCategories();
			this.renderCommands();

		}

	},

	handleDocumentKeyDown: function ( event ) {

		if ( isKeyboardEventFromEditable( event ) ) return;

		if ( eventUsesPrimaryModifier( event ) && event.key.toLowerCase() === 'k' ) {

			event.preventDefault();
			this.openMainMenu();
			return;

		}

		if ( event.shiftKey && ! event.ctrlKey && ! event.metaKey && ! event.altKey && event.key.toLowerCase() === 'a' ) {

			event.preventDefault();
			this.openAddMenu();
			return;

		}

		if ( eventUsesPrimaryModifier( event ) && event.key === '/' ) {

			event.preventDefault();
			showKeyboardShortcuts( this.editor );

		}

	}

};

export { ADD_COMMANDS, CommandPalette };

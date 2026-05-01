function applyChromeGeometry( dom, rect ) {

	dom.style.position = 'absolute';
	dom.style.left = `${ rect.x }px`;
	dom.style.top = `${ rect.y }px`;
	dom.style.width = `${ rect.width }px`;
	dom.style.height = `${ rect.height }px`;

}

export function createViewportChrome( initialProps ) {

	let props = initialProps;
	let menuOpen = false;

	const dom = document.createElement( 'div' );
	dom.className = 'viewport-chrome';
	dom.style.pointerEvents = 'none';

	const borderHitLayer = document.createElement( 'div' );
	borderHitLayer.className = 'viewport-chrome-borderHits';

	for ( const edge of [ 'top', 'right', 'bottom', 'left' ] ) {

		const borderHit = document.createElement( 'div' );
		borderHit.className = `viewport-chrome-borderHit viewport-chrome-borderHit--${ edge }`;
		borderHitLayer.appendChild( borderHit );

	}

	const bar = document.createElement( 'div' );
	bar.className = 'viewport-chrome-bar';

	const labelButton = document.createElement( 'button' );
	labelButton.type = 'button';
	labelButton.className = 'viewport-chrome-label';
	labelButton.setAttribute( 'aria-haspopup', 'menu' );
	labelButton.setAttribute( 'aria-expanded', 'false' );

	const labelText = document.createElement( 'span' );
	labelText.className = 'viewport-chrome-labelText';
	labelButton.appendChild( labelText );

	const labelChevron = document.createElement( 'span' );
	labelChevron.className = 'viewport-chrome-labelChevron';
	labelChevron.textContent = '▾';
	labelButton.appendChild( labelChevron );

	const menu = document.createElement( 'div' );
	menu.className = 'viewport-chrome-menu';
	menu.setAttribute( 'role', 'menu' );
	menu.hidden = true;

	const closeBtn = document.createElement( 'button' );
	closeBtn.type = 'button';
	closeBtn.className = 'viewport-chrome-close';
	closeBtn.textContent = '×';

	const minimizeBtn = document.createElement( 'button' );
	minimizeBtn.type = 'button';
	minimizeBtn.className = 'viewport-chrome-minimize';
	minimizeBtn.textContent = '−';
	minimizeBtn.title = 'Restore viewport';
	minimizeBtn.setAttribute( 'aria-label', 'Restore viewport' );

	const actions = document.createElement( 'div' );
	actions.className = 'viewport-chrome-actions';

	dom.appendChild( borderHitLayer );
	bar.appendChild( labelButton );
	bar.appendChild( menu );
	bar.appendChild( actions );
	dom.appendChild( bar );

	let closeBtnMounted = false;
	let minimizeBtnMounted = false;

	function onBarPointerDown( e ) {

		e.stopPropagation();
		props.onActivate();

	}

	function onBarDoubleClick( e ) {

		if ( props.isMaximized !== true || e.target !== bar ) {

			return;

		}

		e.stopPropagation();
		props.onToggleMaximized();

	}

	function onChromeDoubleClick( e ) {

		if ( props.isMaximized !== true ) {

			return;

		}

		if ( labelButton.contains( e.target ) || menu.contains( e.target ) || closeBtn.contains( e.target ) ) {

			return;

		}

		const bounds = dom.getBoundingClientRect();
		const edgeSize = 10;
		const isBorderHit =
			e.clientX - bounds.left <= edgeSize ||
			bounds.right - e.clientX <= edgeSize ||
			e.clientY - bounds.top <= edgeSize ||
			bounds.bottom - e.clientY <= edgeSize;

		if ( isBorderHit !== true ) {

			return;

		}

		e.stopPropagation();
		props.onToggleMaximized();

	}

	function onBorderPointerDown( e ) {

		e.stopPropagation();
		props.onActivate();

	}

	function onBorderDoubleClick( e ) {

		e.stopPropagation();
		props.onToggleMaximized();

	}

	function setMenuOpen( open ) {

		menuOpen = open;
		menu.hidden = ! open;
		labelButton.setAttribute( 'aria-expanded', String( open ) );
		labelButton.dataset.open = String( open );

	}

	function onLabelPointerDown( e ) {

		e.stopPropagation();

	}

	function onLabelClick( e ) {

		e.stopPropagation();
		props.onActivate();
		setMenuOpen( ! menuOpen );

	}

	function onCloseClick( e ) {

		e.stopPropagation();
		props.onClose();

	}

	function onClosePointerDown( e ) {

		e.stopPropagation();

	}

	function onMinimizeClick( e ) {

		e.stopPropagation();
		props.onToggleMaximized();

	}

	function onMinimizePointerDown( e ) {

		e.stopPropagation();

	}

	function onDocumentPointerDown( e ) {

		if ( dom.contains( e.target ) ) {

			return;

		}

		setMenuOpen( false );

	}

	function onKeyDown( e ) {

		if ( e.key === 'Escape' ) {

			setMenuOpen( false );
			labelButton.focus();
			e.stopPropagation();

		}

	}

	bar.addEventListener( 'pointerdown', onBarPointerDown );
	bar.addEventListener( 'dblclick', onBarDoubleClick );
	dom.addEventListener( 'dblclick', onChromeDoubleClick );
	borderHitLayer.addEventListener( 'pointerdown', onBorderPointerDown );
	borderHitLayer.addEventListener( 'dblclick', onBorderDoubleClick );
	labelButton.addEventListener( 'pointerdown', onLabelPointerDown );
	labelButton.addEventListener( 'click', onLabelClick );
	dom.addEventListener( 'keydown', onKeyDown );
	document.addEventListener( 'pointerdown', onDocumentPointerDown );

	function syncCloseButton( canClose ) {

		if ( canClose && ! closeBtnMounted ) {

			closeBtn.addEventListener( 'click', onCloseClick );
			closeBtn.addEventListener( 'pointerdown', onClosePointerDown );
			actions.appendChild( closeBtn );
			closeBtnMounted = true;

		} else if ( ! canClose && closeBtnMounted ) {

			closeBtn.removeEventListener( 'click', onCloseClick );
			closeBtn.removeEventListener( 'pointerdown', onClosePointerDown );
			if ( closeBtn.parentNode === actions ) {

				actions.removeChild( closeBtn );

			}

			closeBtnMounted = false;

		}

	}

	function syncMinimizeButton( isMaximized ) {

		if ( isMaximized && ! minimizeBtnMounted ) {

			minimizeBtn.addEventListener( 'click', onMinimizeClick );
			minimizeBtn.addEventListener( 'pointerdown', onMinimizePointerDown );
			if ( closeBtnMounted && closeBtn.parentNode === actions ) {

				actions.insertBefore( minimizeBtn, closeBtn );

			} else {

				actions.appendChild( minimizeBtn );

			}
			minimizeBtnMounted = true;

		} else if ( ! isMaximized && minimizeBtnMounted ) {

			minimizeBtn.removeEventListener( 'click', onMinimizeClick );
			minimizeBtn.removeEventListener( 'pointerdown', onMinimizePointerDown );
			if ( minimizeBtn.parentNode === actions ) {

				actions.removeChild( minimizeBtn );

			}
			minimizeBtnMounted = false;

		}

	}

	function syncMenuOptions( p, typeOptions ) {

		menu.textContent = '';

		for ( const option of typeOptions ) {

			const item = document.createElement( 'button' );
			item.type = 'button';
			item.className = 'viewport-chrome-menuItem';
			item.setAttribute( 'role', 'menuitemradio' );
			item.setAttribute( 'aria-checked', String( option.value === p.type ) );
			item.dataset.selected = String( option.value === p.type );

			const itemLabel = document.createElement( 'span' );
			itemLabel.className = 'viewport-chrome-menuItemLabel';
			itemLabel.textContent = option.label;
			item.appendChild( itemLabel );

			const check = document.createElement( 'span' );
			check.className = 'viewport-chrome-menuItemCheck';
			check.textContent = option.value === p.type ? '✔' : '';
			item.appendChild( check );

			item.addEventListener( 'pointerdown', function ( e ) {

				e.stopPropagation();

			} );
			item.addEventListener( 'click', function ( e ) {

				e.stopPropagation();
				props.onActivate();
				if ( option.value !== props.type ) {

					props.onTypeChange( option.value );

				}

				setMenuOpen( false );

			} );

			menu.appendChild( item );

		}

	}

	function paint( p ) {

		const typeOptions = Array.isArray( p.typeOptions ) ? p.typeOptions : [];

		dom.dataset.viewportId = p.id;
		dom.dataset.active = p.isActive ? 'true' : 'false';
		dom.dataset.maximized = p.isMaximized ? 'true' : 'false';
		dom.dataset.minimized = p.isMinimized ? 'true' : 'false';
		dom.classList.toggle( 'viewport-chrome--active', p.isActive );
		dom.classList.toggle( 'viewport-chrome--maximized', p.isMaximized );
		dom.classList.toggle( 'viewport-chrome--minimized', p.isMinimized );
		labelText.textContent = typeOptions.find( ( option ) => option.value === p.type )?.label ?? p.label;
		labelButton.title = `View: ${ labelText.textContent }`;
		labelButton.setAttribute( 'aria-label', `Viewport view: ${ labelText.textContent }` );
		syncMenuOptions( p, typeOptions );
		syncMinimizeButton( p.isMaximized );
		syncCloseButton( p.canClose );
		applyChromeGeometry( dom, p.rect );

	}

	paint( props );

	return {
		dom,
		update( nextProps ) {

			props = nextProps;
			paint( props );

		},
		dispose() {

			document.removeEventListener( 'pointerdown', onDocumentPointerDown );
			dom.removeEventListener( 'keydown', onKeyDown );
			labelButton.removeEventListener( 'pointerdown', onLabelPointerDown );
			labelButton.removeEventListener( 'click', onLabelClick );
			bar.removeEventListener( 'pointerdown', onBarPointerDown );
			bar.removeEventListener( 'dblclick', onBarDoubleClick );
			dom.removeEventListener( 'dblclick', onChromeDoubleClick );
			borderHitLayer.removeEventListener( 'pointerdown', onBorderPointerDown );
			borderHitLayer.removeEventListener( 'dblclick', onBorderDoubleClick );
			closeBtn.removeEventListener( 'click', onCloseClick );
			closeBtn.removeEventListener( 'pointerdown', onClosePointerDown );
			minimizeBtn.removeEventListener( 'click', onMinimizeClick );
			minimizeBtn.removeEventListener( 'pointerdown', onMinimizePointerDown );

		},
	};

}

function applyChromeGeometry( dom, rect ) {

	dom.style.position = 'absolute';
	dom.style.left = `${ rect.x }px`;
	dom.style.top = `${ rect.y }px`;
	dom.style.width = `${ rect.width }px`;
	dom.style.height = `${ rect.height }px`;

}

export function createViewportChrome( initialProps ) {

	let props = initialProps;

	const dom = document.createElement( 'div' );
	dom.className = 'viewport-chrome';
	dom.style.pointerEvents = 'none';

	const bar = document.createElement( 'div' );
	bar.className = 'viewport-chrome-bar';

	const labelSpan = document.createElement( 'span' );
	labelSpan.className = 'viewport-chrome-label';

	const closeBtn = document.createElement( 'button' );
	closeBtn.type = 'button';
	closeBtn.className = 'viewport-chrome-close';
	closeBtn.textContent = '×';

	bar.appendChild( labelSpan );
	dom.appendChild( bar );

	let closeBtnMounted = false;

	function onBarPointerDown( e ) {

		e.stopPropagation();
		props.onActivate();

	}

	function onCloseClick( e ) {

		e.stopPropagation();
		props.onClose();

	}

	function onClosePointerDown( e ) {

		e.stopPropagation();

	}

	bar.addEventListener( 'pointerdown', onBarPointerDown );

	function syncCloseButton( canClose ) {

		if ( canClose && ! closeBtnMounted ) {

			closeBtn.addEventListener( 'click', onCloseClick );
			closeBtn.addEventListener( 'pointerdown', onClosePointerDown );
			bar.appendChild( closeBtn );
			closeBtnMounted = true;

		} else if ( ! canClose && closeBtnMounted ) {

			closeBtn.removeEventListener( 'click', onCloseClick );
			closeBtn.removeEventListener( 'pointerdown', onClosePointerDown );
			if ( closeBtn.parentNode === bar ) {

				bar.removeChild( closeBtn );

			}

			closeBtnMounted = false;

		}

	}

	function paint( p ) {

		dom.dataset.viewportId = p.id;
		dom.dataset.active = p.isActive ? 'true' : 'false';
		dom.classList.toggle( 'viewport-chrome--active', p.isActive );
		labelSpan.textContent = p.label;
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
	};

}


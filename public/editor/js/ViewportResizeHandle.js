export function createViewportResizeHandle( handle, callbacks, getContainerRect ) {

	const dom = document.createElement( 'div' );
	dom.classList.add( 'viewport-resize-handle' );

	let activePointerId = null;
	let capturedDirection = handle.direction;
	let capturedDividerIndex = handle.dividerIndex;
	let disposed = false;

	function applyHandle( h ) {

		dom.style.position = 'absolute';
		dom.style.left = `${ h.x }px`;
		dom.style.top = `${ h.y }px`;
		dom.style.width = `${ h.width }px`;
		dom.style.height = `${ h.height }px`;
		dom.style.touchAction = 'none';

		dom.classList.remove( 'viewport-resize-handle--vertical', 'viewport-resize-handle--horizontal' );
		if ( h.direction === 'vertical' ) {

			dom.classList.add( 'viewport-resize-handle--vertical' );
			dom.style.cursor = 'col-resize';

		} else {

			dom.classList.add( 'viewport-resize-handle--horizontal' );
			dom.style.cursor = 'row-resize';

		}

	}

	function emitDrag( e ) {

		if ( e.pointerId !== activePointerId ) {

			return;

		}

		const containerRect = getContainerRect();
		let fraction;
		if ( capturedDirection === 'vertical' ) {

			fraction =
				( e.clientX - containerRect.left ) /
				Math.max( containerRect.width, Number.EPSILON );

		} else {

			fraction =
				( e.clientY - containerRect.top ) /
				Math.max( containerRect.height, Number.EPSILON );

		}

		fraction = Math.min( 1, Math.max( 0, fraction ) );
		callbacks.onDragEnd( capturedDirection, capturedDividerIndex, fraction );

	}

	function finishPointer( e ) {

		if ( e.pointerId !== activePointerId ) {

			return;

		}

		emitDrag( e );
		activePointerId = null;
		document.removeEventListener( 'pointermove', emitDrag );
		document.removeEventListener( 'pointerup', finishPointer );
		document.removeEventListener( 'pointercancel', finishPointer );

	}

	function onPointerDown( e ) {

		if ( disposed ) {

			return;

		}

		const cap = dom.setPointerCapture?.bind( dom );
		if ( cap ) {

			try {

				cap( e.pointerId );

			} catch ( _err ) {

				// ignore

			}

		}

		capturedDirection = handle.direction;
		capturedDividerIndex = handle.dividerIndex;
		activePointerId = e.pointerId;
		document.addEventListener( 'pointermove', emitDrag );
		document.addEventListener( 'pointerup', finishPointer );
		document.addEventListener( 'pointercancel', finishPointer );

	}

	function onDoubleClick( e ) {

		e.stopPropagation();
		callbacks.onDoubleClick?.();

	}

	dom.addEventListener( 'pointerdown', onPointerDown );
	dom.addEventListener( 'dblclick', onDoubleClick );

	applyHandle( handle );

	return {
		dom,
		update( nextHandle ) {

			handle = nextHandle;
			applyHandle( handle );

		},
		dispose() {

			if ( disposed ) {

				return;

			}

			disposed = true;
			activePointerId = null;
			dom.removeEventListener( 'pointerdown', onPointerDown );
			dom.removeEventListener( 'dblclick', onDoubleClick );
			document.removeEventListener( 'pointermove', emitDrag );
			document.removeEventListener( 'pointerup', finishPointer );
			document.removeEventListener( 'pointercancel', finishPointer );

		},
	};

}

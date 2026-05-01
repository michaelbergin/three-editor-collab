import { computeViewportGrid, computeViewportResizeHandles, deriveViewportLabel } from './ViewportGrid.js';
import { createViewportChrome } from './ViewportChrome.js';
import { createViewportResizeHandle } from './ViewportResizeHandle.js';

export function createMultiViewportOverlay( hostElement, store, getContainerRect ) {

	const overlay = document.createElement( 'div' );
	overlay.className = 'viewport-overlay';
	overlay.style.pointerEvents = 'none';
	hostElement.appendChild( overlay );

	const chromeById = new Map();
	const handleById = new Map();

	let disposed = false;

	function sync() {

		if ( disposed ) {

			return;

		}

		const bounds = getContainerRect();
		const W = bounds.width;
		const H = bounds.height;
		const s = store.getState();

		const rects = computeViewportGrid(
			s.viewports.map( ( v ) => v.id ),
			W,
			H,
			s.colFractions,
			s.rowFractions,
		);

		const handles = computeViewportResizeHandles(
			rects,
			W,
			H,
			s.colFractions,
			s.rowFractions,
		);

		const rectById = new Map( rects.map( ( r ) => [ r.id, r ] ) );

		const keepChrome = new Set();
		for ( const vp of s.viewports ) {

			keepChrome.add( vp.id );
			const rect = rectById.get( vp.id );
			if ( ! rect ) {

				continue;

			}

			const label = deriveViewportLabel( vp, s.viewports );
			const props = {
				id: vp.id,
				label,
				isActive: vp.id === s.activeViewportId,
				canClose: s.viewports.length > 1,
				rect,
				onClose() {

					store.dispatch( { type: 'REMOVE_VIEWPORT', id: vp.id } );

				},
				onActivate() {

					store.dispatch( { type: 'SET_ACTIVE', id: vp.id } );

				},
			};

			let chrome = chromeById.get( vp.id );
			if ( ! chrome ) {

				chrome = createViewportChrome( props );
				chromeById.set( vp.id, chrome );
				overlay.appendChild( chrome.dom );

			} else {

				chrome.update( props );

			}

		}

		for ( const id of Array.from( chromeById.keys() ) ) {

			if ( ! keepChrome.has( id ) ) {

				const chrome = chromeById.get( id );
				overlay.removeChild( chrome.dom );
				chromeById.delete( id );

			}

		}

		const keepHandles = new Set();
		for ( const h of handles ) {

			keepHandles.add( h.id );

			let han = handleById.get( h.id );
			if ( ! han ) {

				han = createViewportResizeHandle(
					h,
					{
						onDragEnd( direction, dividerIndex, fraction ) {

							if ( direction === 'vertical' ) {

								store.dispatch( {
									type: 'SET_COL_DIVIDER',
									dividerIndex,
									dividerFraction: fraction,
								} );

							} else {

								store.dispatch( {
									type: 'SET_ROW_DIVIDER',
									dividerIndex,
									dividerFraction: fraction,
								} );

							}

						},
					},
					getContainerRect,
				);
				handleById.set( h.id, han );
				overlay.appendChild( han.dom );

			} else {

				han.update( h );

			}

		}

		for ( const id of Array.from( handleById.keys() ) ) {

			if ( ! keepHandles.has( id ) ) {

				const han = handleById.get( id );
				han.dispose();
				overlay.removeChild( han.dom );
				handleById.delete( id );

			}

		}

	}

	const unsub = store.subscribe( sync );
	sync();

	function disposeOverlay() {

		if ( disposed ) {

			return;

		}

		disposed = true;
		unsub();

		for ( const chrome of chromeById.values() ) {

			overlay.removeChild( chrome.dom );

		}

		chromeById.clear();

		for ( const han of handleById.values() ) {

			han.dispose();
			overlay.removeChild( han.dom );

		}

		handleById.clear();

		if ( overlay.parentNode === hostElement ) {

			hostElement.removeChild( overlay );

		}

	}

	return {
		sync,
		refresh: sync,
		dispose: disposeOverlay,
	};

}

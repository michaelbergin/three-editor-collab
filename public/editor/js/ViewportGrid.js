const HANDLE_HALF = 3;

export function makeEqualFractions( count ) {

	if ( count <= 0 ) {

		return [];

	}

	const v = 1 / count;
	return Array.from( { length: count }, () => v );

}

export function getViewportGridDimensions( count ) {

	if ( count <= 0 ) {

		return { cols: 0, rows: 0 };

	}

	const cols = Math.ceil( Math.sqrt( count ) );
	const rows = Math.ceil( count / cols );
	return { cols, rows };

}

function clampNonNegative( n ) {

	return Math.max( 0, n );

}

/** Pad or trim fractions to `targetLen`, normalize to sum 1; malformed → equal split */
function fractionsForLayout( raw, targetLen ) {

	if ( targetLen <= 0 ) {

		return [];

	}

	let vals = raw.slice( 0, targetLen );
	if ( vals.length < targetLen ) {

		vals = vals.concat( makeEqualFractions( targetLen - vals.length ) );

	}

	const sum = vals.reduce( ( a, b ) => a + ( Number.isFinite( b ) ? Math.max( 0, b ) : 0 ), 0 );
	if ( sum <= 0 || ! Number.isFinite( sum ) ) {

		return makeEqualFractions( targetLen );

	}

	return vals.map( ( v ) => ( Number.isFinite( v ) ? Math.max( 0, v ) : 0 ) / sum );

}

export function computeViewportGrid(
	viewportIds,
	containerWidth,
	containerHeight,
	colFractions,
	rowFractions,
) {

	if ( viewportIds.length === 0 ) {

		return [];

	}

	const W = Math.round( clampNonNegative( containerWidth ) );
	const H = Math.round( clampNonNegative( containerHeight ) );
	const n = viewportIds.length;
	const { cols, rows } = getViewportGridDimensions( n );
	const colFr = fractionsForLayout( colFractions, cols );
	const rowFr = fractionsForLayout( rowFractions, rows );

	const rects = [];
	let idCursor = 0;
	let yPixel = 0;

	for ( let r = 0; r < rows; r ++ ) {

		const remaining = n - idCursor;
		const countThisRow = Math.min( cols, remaining );
		if ( countThisRow === 0 ) {

			break;

		}

		const rowH =
			r === rows - 1 ? Math.max( 0, H - yPixel ) : Math.max( 0, Math.round( rowFr[ r ] * H ) );

		if ( countThisRow === cols ) {

			let xPixel = 0;
			for ( let c = 0; c < cols; c ++ ) {

				const id = viewportIds[ idCursor ++ ];
				const w =
					c === cols - 1
						? Math.max( 0, W - xPixel )
						: Math.max( 0, Math.round( colFr[ c ] * W ) );
				rects.push( {
					id,
					x: xPixel,
					y: yPixel,
					width: w,
					height: rowH,
				} );
				xPixel += w;

			}

		} else {

			let xPixel = 0;
			for ( let c = 0; c < countThisRow; c ++ ) {

				const id = viewportIds[ idCursor ++ ];
				const w =
					c === countThisRow - 1
						? Math.max( 0, W - xPixel )
						: Math.max( 0, Math.round( W / countThisRow ) );
				rects.push( {
					id,
					x: xPixel,
					y: yPixel,
					width: w,
					height: rowH,
				} );
				xPixel += w;

			}

		}

		yPixel += rowH;

	}

	return rects;

}

const TYPE_LABEL = {
	perspective: 'Perspective',
	top: 'Top',
	left: 'Left',
	right: 'Right',
};

export function deriveViewportLabel( viewport, allViewports ) {

	const sameType = allViewports.filter( ( v ) => v.type === viewport.type );
	const base = TYPE_LABEL[ viewport.type ];
	if ( sameType.length <= 1 ) {

		return base;

	}

	return `${ base } ${ viewport.typeIndex }`;

}

function cumulativeDividers( fractions, containerSize ) {

	const out = [];
	let cum = 0;
	for ( let i = 0; i < fractions.length - 1; i ++ ) {

		cum += fractions[ i ];
		out.push( cum * containerSize );

	}

	return out;

}

function nearPixel( a, b, tol = 2 ) {

	return Math.abs( a - b ) <= tol;

}

function overlap1D( a0, a1, b0, b1 ) {

	const lo = Math.max( a0, b0 );
	const hi = Math.min( a1, b1 );
	if ( lo >= hi ) {

		return null;

	}

	return [ lo, hi ];

}

export function computeViewportResizeHandles(
	rects,
	containerWidth,
	containerHeight,
	colFractions,
	rowFractions,
) {

	if ( rects.length <= 1 ) {

		return [];

	}

	const W = clampNonNegative( containerWidth );
	const H = clampNonNegative( containerHeight );
	const { cols: gridCols, rows: gridRows } = getViewportGridDimensions( rects.length );
	const colFr = fractionsForLayout( colFractions, Math.max( 1, gridCols ) );
	const rowFr = fractionsForLayout( rowFractions, Math.max( 1, gridRows ) );

	const globalColXs = cumulativeDividers( colFr, W );
	const globalRowYs = cumulativeDividers( rowFr, H );

	const handles = [];
	let hid = 0;

	for ( let i = 0; i < rects.length; i ++ ) {

		for ( let j = i + 1; j < rects.length; j ++ ) {

			const A = rects[ i ];
			const B = rects[ j ];

			const ax0 = A.x;
			const ax1 = A.x + A.width;
			const ay0 = A.y;
			const ay1 = A.y + A.height;
			const bx0 = B.x;
			const bx1 = B.x + B.width;
			const by0 = B.y;
			const by1 = B.y + B.height;

			// Vertical shared edge: A right meets B left (or vice versa)
			if ( nearPixel( ax1, bx0 ) || nearPixel( bx1, ax0 ) ) {

				const edgeX = nearPixel( ax1, bx0 ) ? ax1 : bx1;
				const yOv = overlap1D( ay0, ay1, by0, by1 );
				if ( yOv ) {

					const [ yStart, yEnd ] = yOv;
					for ( let di = 0; di < globalColXs.length; di ++ ) {

						if ( nearPixel( edgeX, globalColXs[ di ] ) ) {

							handles.push( {
								id: `v-${ di }-${ hid ++ }`,
								direction: 'vertical',
								dividerIndex: di,
								x: Math.round( edgeX - HANDLE_HALF ),
								y: Math.round( yStart ),
								width: HANDLE_HALF * 2,
								height: Math.max( 0, Math.round( yEnd - yStart ) ),
							} );
							break;

						}

					}

				}

			}

			// Horizontal shared edge: A bottom meets B top
			if ( nearPixel( ay1, by0 ) || nearPixel( by1, ay0 ) ) {

				const edgeY = nearPixel( ay1, by0 ) ? ay1 : by1;
				const xOv = overlap1D( ax0, ax1, bx0, bx1 );
				if ( xOv ) {

					const [ xStart, xEnd ] = xOv;
					for ( let di = 0; di < globalRowYs.length; di ++ ) {

						if ( nearPixel( edgeY, globalRowYs[ di ] ) ) {

							handles.push( {
								id: `h-${ di }-${ hid ++ }`,
								direction: 'horizontal',
								dividerIndex: di,
								x: Math.round( xStart ),
								y: Math.round( edgeY - HANDLE_HALF ),
								width: Math.max( 0, Math.round( xEnd - xStart ) ),
								height: HANDLE_HALF * 2,
							} );
							break;

						}

					}

				}

			}

		}

	}

	return handles;

}

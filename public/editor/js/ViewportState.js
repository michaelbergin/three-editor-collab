import { getViewportGridDimensions, makeEqualFractions } from './ViewportGrid.js';

export const MIN_VIEWPORT_FRACTION = 0.02;

const INITIAL_COUNTERS = {
	perspective: 1,
	top: 0,
	left: 0,
	right: 0,
};

export const viewportInitialState = {
	viewports: [
		{ id: 'vp-1-perspective', type: 'perspective', typeIndex: 1 },
	],
	activeViewportId: 'vp-1-perspective',
	maximizedViewportId: null,
	colFractions: [ 1 ],
	rowFractions: [ 1 ],
	typeCounters: { ...INITIAL_COUNTERS },
};

function sum( arr, start, endInclusive ) {

	let s = 0;
	for ( let i = start; i <= endInclusive; i ++ ) {

		s += arr[ i ] ?? 0;

	}

	return s;

}

function applyColDivider( fractions, dividerIndex, dividerFraction ) {

	if (
		dividerIndex < 0 ||
		dividerIndex >= fractions.length - 1 ||
		fractions.length < 2
	) {

		return null;

	}

	const pairStart = sum( fractions, 0, dividerIndex - 1 );
	const pairEnd = sum( fractions, 0, dividerIndex + 1 );
	const pairSpan = pairEnd - pairStart;
	if ( pairSpan < 2 * MIN_VIEWPORT_FRACTION ) {

		return null;

	}

	let first = dividerFraction - pairStart;
	first = Math.min(
		Math.max( first, MIN_VIEWPORT_FRACTION ),
		pairSpan - MIN_VIEWPORT_FRACTION,
	);
	const second = pairSpan - first;
	const next = [ ...fractions ];
	next[ dividerIndex ] = first;
	next[ dividerIndex + 1 ] = second;
	return next;

}

function applyRowDivider( fractions, dividerIndex, dividerFraction ) {

	return applyColDivider( fractions, dividerIndex, dividerFraction );

}

export function viewportReducer( state, action ) {

	switch ( action.type ) {

		case 'ADD_VIEWPORT': {

			const nextCount = state.typeCounters[ action.viewportType ] + 1;
			const typeCounters = {
				...state.typeCounters,
				[ action.viewportType ]: nextCount,
			};
			const id = `vp-${ nextCount }-${ action.viewportType }`;
			const viewports = [
				...state.viewports,
				{
					id,
					type: action.viewportType,
					typeIndex: nextCount,
				},
			];
			const { cols, rows } = getViewportGridDimensions( viewports.length );
			return {
				viewports,
				activeViewportId: id,
				maximizedViewportId: null,
				colFractions: makeEqualFractions( cols ),
				rowFractions: makeEqualFractions( rows ),
				typeCounters,
			};

		}

		case 'REMOVE_VIEWPORT': {

			if ( state.viewports.length <= 1 ) {

				return state;

			}

			const viewports = state.viewports.filter( ( v ) => v.id !== action.id );
			if ( viewports.length === state.viewports.length ) {

				return state;

			}

			const { cols, rows } = getViewportGridDimensions( viewports.length );
			let activeViewportId = state.activeViewportId;
			if ( ! activeViewportId || ! viewports.some( ( v ) => v.id === activeViewportId ) ) {

				activeViewportId = viewports[ 0 ]?.id ?? null;

			}
			const maximizedViewportId = state.maximizedViewportId === action.id
				? null
				: state.maximizedViewportId;

			return {
				viewports,
				activeViewportId,
				maximizedViewportId,
				colFractions: makeEqualFractions( cols ),
				rowFractions: makeEqualFractions( rows ),
				typeCounters: state.typeCounters,
			};

		}

		case 'SET_ACTIVE': {

			if ( ! state.viewports.some( ( v ) => v.id === action.id ) ) {

				return state;

			}

			return { ...state, activeViewportId: action.id };

		}

		case 'TOGGLE_MAXIMIZED_VIEWPORT': {

			if ( ! state.viewports.some( ( v ) => v.id === action.id ) ) {

				return state;

			}

			return {
				...state,
				activeViewportId: action.id,
				maximizedViewportId: state.maximizedViewportId === action.id ? null : action.id,
			};

		}

		case 'SET_VIEWPORT_TYPE': {

			let changed = false;
			const viewports = state.viewports.map( function ( viewport ) {

				if ( viewport.id !== action.id ) {

					return viewport;

				}

				if ( viewport.type === action.viewportType ) {

					return viewport;

				}

				changed = true;
				return {
					...viewport,
					type: action.viewportType,
				};

			} );

			if ( changed === false ) {

				return state;

			}

			return {
				...state,
				viewports,
				activeViewportId: action.id,
			};

		}

		case 'SET_COL_DIVIDER': {

			const next = applyColDivider(
				state.colFractions,
				action.dividerIndex,
				action.dividerFraction,
			);
			if ( ! next ) {

				return state;

			}

			return { ...state, colFractions: next };

		}

		case 'SET_ROW_DIVIDER': {

			const next = applyRowDivider(
				state.rowFractions,
				action.dividerIndex,
				action.dividerFraction,
			);
			if ( ! next ) {

				return state;

			}

			return { ...state, rowFractions: next };

		}

		default:

			return state;

	}

}

function cloneInitialState() {

	return {
		viewports: viewportInitialState.viewports.map( ( v ) => ( { ...v } ) ),
		activeViewportId: viewportInitialState.activeViewportId,
		maximizedViewportId: viewportInitialState.maximizedViewportId,
		colFractions: [ ...viewportInitialState.colFractions ],
		rowFractions: [ ...viewportInitialState.rowFractions ],
		typeCounters: { ...viewportInitialState.typeCounters },
	};

}

export function createViewportStore() {

	let state = cloneInitialState();
	const subscribers = new Set();

	function dispatch( action ) {

		state = viewportReducer( state, action );
		subscribers.forEach( ( fn ) => fn() );

	}

	function getState() {

		return state;

	}

	function subscribe( fn ) {

		subscribers.add( fn );
		return function unsubscribe() {

			subscribers.delete( fn );

		};

	}

	return { getState, dispatch, subscribe };

}

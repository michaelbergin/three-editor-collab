import { UIPanel, UIRow, UIButton, UISpan } from './libs/ui.js';
import { deriveViewportLabel } from './ViewportGrid.js';

export function MultiViewportManager( editor ) {

	const store = editor.viewportStore;

	const panel = new UIPanel();
	panel.addClass( 'MultiViewportManager' );
	panel.dom.style.paddingBottom = '14px';
	panel.dom.style.marginBottom = '14px';
	panel.dom.style.borderBottom = '1px solid rgba(127, 127, 127, 0.28)';

	const headerRow = new UIRow();
	headerRow.setTextContent( 'Viewports' );
	headerRow.dom.style.marginBottom = '8px';
	headerRow.dom.style.fontWeight = '600';
	headerRow.dom.style.opacity = '0.9';
	panel.add( headerRow );

	const listPanel = new UIPanel();
	listPanel.addClass( 'MultiViewportManager-list' );
	listPanel.dom.style.marginBottom = '10px';

	panel.add( listPanel );

	const addPanel = new UIPanel();
	addPanel.addClass( 'MultiViewportManager-addButtons' );
	addPanel.dom.style.display = 'grid';
	addPanel.dom.style.gap = '6px';
	panel.add( addPanel );

	function makeAddRow( label, viewportType ) {

		const button = new UIButton( label );
		button.addClass( 'MultiViewportManager-addButton' );
		button.onClick( function () {

			store.dispatch( { type: 'ADD_VIEWPORT', viewportType } );

		} );
		button.dom.addEventListener( 'pointerdown', function () {

			button.dom.dataset.pressed = 'true';
			button.dom.dataset.released = 'false';

		} );
		button.dom.addEventListener( 'pointerup', function () {

			button.dom.dataset.pressed = 'false';
			button.dom.dataset.released = 'true';
			window.setTimeout( function () {

				button.dom.dataset.released = 'false';

			}, 160 );

		} );
		button.dom.addEventListener( 'pointercancel', function () {

			button.dom.dataset.pressed = 'false';
			button.dom.dataset.released = 'false';

		} );
		button.dom.addEventListener( 'pointerleave', function () {

			button.dom.dataset.pressed = 'false';

		} );
		addPanel.add( button );

	}

	function rebuildList() {

		listPanel.clear();

		const state = store.getState();
		const multi = state.viewports.length > 1;

		for ( const vp of state.viewports ) {

			const row = new UIRow();
			row.addClass( 'MultiViewportManager-viewItem' );
			row.dom.style.display = 'flex';
			row.dom.style.alignItems = 'center';
			row.dom.style.justifyContent = 'space-between';
			row.dom.style.gap = '8px';
			row.dom.style.marginBottom = '4px';

			const labelPanel = new UISpan();
			labelPanel.dom.style.flex = '1';
			labelPanel.setTextContent( deriveViewportLabel( vp, state.viewports ) );

			const removeBtn = new UIButton( '×' );
			removeBtn.dom.style.flexShrink = '0';
			removeBtn.dom.style.minWidth = '24px';
			removeBtn.onClick( function ( event ) {

				event.stopPropagation();
				store.dispatch( { type: 'REMOVE_VIEWPORT', id: vp.id } );

			} );

			if ( ! multi ) {

				removeBtn.setDisplay( 'none' );

			}

			row.add( labelPanel );
			row.add( removeBtn );
			listPanel.add( row );

		}

	}

	makeAddRow( '＋ Perspective', 'perspective' );
	makeAddRow( '＋ Top', 'top' );
	makeAddRow( '＋ Left', 'left' );
	makeAddRow( '＋ Right', 'right' );

	store.subscribe( rebuildList );
	rebuildList();

	return panel;

}

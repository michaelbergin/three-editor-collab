import { UIPanel, UIRow, UIButton } from './libs/ui.js';
import { deriveViewportLabel } from './ViewportGrid.js';

export function MultiViewportManager( editor ) {

	const store = editor.viewportStore;

	const panel = new UIPanel();

	const headerRow = new UIRow();
	headerRow.setTextContent( 'Viewports' );
	panel.add( headerRow );

	const listPanel = new UIPanel();

	panel.add( listPanel );

	function makeAddRow( label, viewportType ) {

		const row = new UIRow();
		row.setClass( 'option' );
		row.dom.style.cursor = 'pointer';
		row.setTextContent( label );
		row.onClick( function () {

			store.dispatch( { type: 'ADD_VIEWPORT', viewportType } );

		} );
		panel.add( row );

	}

	function rebuildList() {

		listPanel.clear();

		const state = store.getState();
		const multi = state.viewports.length > 1;

		for ( const vp of state.viewports ) {

			const row = new UIRow();
			row.setClass( 'option' );
			row.dom.style.display = 'flex';
			row.dom.style.alignItems = 'center';
			row.dom.style.justifyContent = 'space-between';
			row.dom.style.gap = '8px';

			const labelPanel = new UIPanel();
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

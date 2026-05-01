const SVG_NS = 'http://www.w3.org/2000/svg';

const ICON_NODES = {
	group: [
		[ 'rect', { x: '3', y: '3', width: '7', height: '7', rx: '1' } ],
		[ 'rect', { x: '14', y: '3', width: '7', height: '7', rx: '1' } ],
		[ 'rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' } ],
		[ 'rect', { x: '14', y: '14', width: '7', height: '7', rx: '1' } ]
	],
	circlePlus: [
		[ 'circle', { cx: '12', cy: '12', r: '9' } ],
		[ 'path', { d: 'M12 8v8' } ],
		[ 'path', { d: 'M8 12h8' } ]
	],
	move3d: [
		[ 'path', { d: 'M12 3v18' } ],
		[ 'path', { d: 'm8 7 4-4 4 4' } ],
		[ 'path', { d: 'm8 17 4 4 4-4' } ],
		[ 'path', { d: 'M3 12h18' } ],
		[ 'path', { d: 'm7 8-4 4 4 4' } ],
		[ 'path', { d: 'm17 8 4 4-4 4' } ]
	],
	rotate3d: [
		[ 'path', { d: 'M4 12a8 8 0 0 1 13.7-5.7' } ],
		[ 'path', { d: 'M18 3v4h-4' } ],
		[ 'path', { d: 'M20 12a8 8 0 0 1-13.7 5.7' } ],
		[ 'path', { d: 'M6 21v-4h4' } ],
		[ 'path', { d: 'M12 8v4l3 2' } ]
	],
	scale3d: [
		[ 'path', { d: 'M4 9V4h5' } ],
		[ 'path', { d: 'M20 15v5h-5' } ],
		[ 'path', { d: 'M4 4l7 7' } ],
		[ 'path', { d: 'M20 20l-7-7' } ],
		[ 'path', { d: 'M15 4h5v5' } ],
		[ 'path', { d: 'M20 4l-5 5' } ],
		[ 'path', { d: 'M9 20H4v-5' } ],
		[ 'path', { d: 'M4 20l5-5' } ]
	],
	chevronLeft: [
		[ 'path', { d: 'm15 18-6-6 6-6' } ]
	],
	chevronRight: [
		[ 'path', { d: 'm9 18 6-6-6-6' } ]
	],
	box: [
		[ 'path', { d: 'M21 8.5 12 3 3 8.5l9 5.5 9-5.5Z' } ],
		[ 'path', { d: 'M3 8.5V16l9 5 9-5V8.5' } ],
		[ 'path', { d: 'M12 14v7' } ]
	],
	capsule3d: [
		[ 'path', { d: 'M8 4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4Z' } ],
		[ 'path', { d: 'M8 4v16' } ],
		[ 'path', { d: 'M16 4v16' } ]
	],
	circle: [
		[ 'circle', { cx: '12', cy: '12', r: '8' } ]
	],
	cylinder: [
		[ 'ellipse', { cx: '12', cy: '5', rx: '7', ry: '3' } ],
		[ 'path', { d: 'M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5' } ],
		[ 'path', { d: 'M5 19c0 1.7 3.1 3 7 3s7-1.3 7-3' } ]
	],
	dodecahedron: [
		[ 'path', { d: 'M12 2.5 20 8l-3 9.5h-10L4 8l8-5.5Z' } ],
		[ 'path', { d: 'm4 8 8 3 8-3' } ],
		[ 'path', { d: 'm7 17.5 5-6.5 5 6.5' } ],
		[ 'path', { d: 'M12 2.5V11' } ]
	],
	icosahedron: [
		[ 'path', { d: 'M12 2 21 8.5 17.5 20h-11L3 8.5 12 2Z' } ],
		[ 'path', { d: 'm3 8.5 9 3.5 9-3.5' } ],
		[ 'path', { d: 'm6.5 20 5.5-8 5.5 8' } ],
		[ 'path', { d: 'M12 2v10' } ]
	],
	latheProfile: [
		[ 'path', { d: 'M12 3v18' } ],
		[ 'path', { d: 'M8 4c3 2 4 4 4 8s-1 6-4 8' } ],
		[ 'path', { d: 'M16 4c-3 2-4 4-4 8s1 6 4 8' } ]
	],
	diamond: [
		[ 'path', { d: 'M12 2 22 12 12 22 2 12 12 2Z' } ]
	],
	square: [
		[ 'rect', { x: '4', y: '4', width: '16', height: '16', rx: '2' } ]
	],
	circleDot: [
		[ 'circle', { cx: '12', cy: '12', r: '8' } ],
		[ 'circle', { cx: '12', cy: '12', r: '3' } ]
	],
	sphere3d: [
		[ 'circle', { cx: '12', cy: '12', r: '9' } ],
		[ 'path', { d: 'M3 12h18' } ],
		[ 'path', { d: 'M12 3c3 3 3 15 0 18' } ],
		[ 'path', { d: 'M12 3c-3 3-3 15 0 18' } ]
	],
	image: [
		[ 'rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' } ],
		[ 'circle', { cx: '8.5', cy: '10', r: '1.5' } ],
		[ 'path', { d: 'm21 15-5-5L5 19' } ]
	],
	triangle: [
		[ 'path', { d: 'M12 3 22 20H2L12 3Z' } ]
	],
	type: [
		[ 'path', { d: 'M4 7V4h16v3' } ],
		[ 'path', { d: 'M9 20h6' } ],
		[ 'path', { d: 'M12 4v16' } ]
	],
	torus: [
		[ 'ellipse', { cx: '12', cy: '12', rx: '9', ry: '6' } ],
		[ 'ellipse', { cx: '12', cy: '12', rx: '3.5', ry: '2.25' } ]
	],
	torusKnot: [
		[ 'path', { d: 'M5 13c2-8 12-8 14-2 1.4 4.3-3.5 7-7 4.5-3-2.1-2-7 2-7.5' } ],
		[ 'path', { d: 'M19 11c-2 8-12 8-14 2-1.4-4.3 3.5-7 7-4.5 3 2.1 2 7-2 7.5' } ]
	],
	spline: [
		[ 'path', { d: 'M4 17c4 0 4-10 8-10s4 10 8 10' } ],
		[ 'circle', { cx: '4', cy: '17', r: '2' } ],
		[ 'circle', { cx: '12', cy: '7', r: '2' } ],
		[ 'circle', { cx: '20', cy: '17', r: '2' } ]
	],
	sun: [
		[ 'circle', { cx: '12', cy: '12', r: '4' } ],
		[ 'path', { d: 'M12 2v2' } ],
		[ 'path', { d: 'M12 20v2' } ],
		[ 'path', { d: 'm4.93 4.93 1.41 1.41' } ],
		[ 'path', { d: 'm17.66 17.66 1.41 1.41' } ],
		[ 'path', { d: 'M2 12h2' } ],
		[ 'path', { d: 'M20 12h2' } ],
		[ 'path', { d: 'm6.34 17.66-1.41 1.41' } ],
		[ 'path', { d: 'm19.07 4.93-1.41 1.41' } ]
	],
	flashlight: [
		[ 'path', { d: 'm6 4 5 5' } ],
		[ 'path', { d: 'm9 7 8-3 3 3-3 8-8-8Z' } ],
		[ 'path', { d: 'm4 14 6 6' } ],
		[ 'path', { d: 'm10 20 5-5' } ]
	],
	hemisphereLight: [
		[ 'path', { d: 'M4 13a8 8 0 0 1 16 0' } ],
		[ 'path', { d: 'M4 13h16' } ],
		[ 'path', { d: 'M7 18h10' } ],
		[ 'path', { d: 'M9 21h6' } ]
	],
	lightbulb: [
		[ 'path', { d: 'M9 18h6' } ],
		[ 'path', { d: 'M10 22h4' } ],
		[ 'path', { d: 'M8 14c-1.2-1-2-2.7-2-4a6 6 0 1 1 12 0c0 1.3-.8 3-2 4-.7.6-1 1.4-1 2H9c0-.6-.3-1.4-1-2Z' } ]
	],
	lamp: [
		[ 'path', { d: 'M8 2h8l3 8H5l3-8Z' } ],
		[ 'path', { d: 'M12 10v8' } ],
		[ 'path', { d: 'M8 22h8' } ],
		[ 'path', { d: 'M10 18h4' } ]
	],
	orthographicCamera: [
		[ 'path', { d: 'M4 7h11v10H4z' } ],
		[ 'path', { d: 'm15 10 5-3v10l-5-3' } ],
		[ 'path', { d: 'M7 4h2' } ],
		[ 'path', { d: 'M12 4h2' } ],
		[ 'path', { d: 'M7 20h2' } ],
		[ 'path', { d: 'M12 20h2' } ]
	],
	camera: [
		[ 'path', { d: 'M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z' } ],
		[ 'circle', { cx: '12', cy: '13', r: '3' } ]
	],
	search: [
		[ 'circle', { cx: '11', cy: '11', r: '7' } ],
		[ 'path', { d: 'm20 20-3.5-3.5' } ]
	],
	command: [
		[ 'path', { d: 'M9 6V5a3 3 0 1 0-3 3h1' } ],
		[ 'path', { d: 'M15 6V5a3 3 0 1 1 3 3h-1' } ],
		[ 'path', { d: 'M9 18v1a3 3 0 1 1-3-3h1' } ],
		[ 'path', { d: 'M15 18v1a3 3 0 1 0 3-3h-1' } ],
		[ 'path', { d: 'M9 8h6v8H9z' } ]
	],
	keyboard: [
		[ 'rect', { x: '2', y: '5', width: '20', height: '14', rx: '2' } ],
		[ 'path', { d: 'M6 9h.01' } ],
		[ 'path', { d: 'M10 9h.01' } ],
		[ 'path', { d: 'M14 9h.01' } ],
		[ 'path', { d: 'M18 9h.01' } ],
		[ 'path', { d: 'M8 13h8' } ]
	]
};

function setAttributes( element, attributes ) {

	for ( const name in attributes ) {

		element.setAttribute( name, attributes[ name ] );

	}

}

function createCommandIcon( name ) {

	const iconName = name.replace( /-([a-z])/g, function ( match, letter ) {

		return letter.toUpperCase();

	} );
	const nodes = ICON_NODES[ iconName ] || ICON_NODES.command;
	const svg = document.createElementNS( SVG_NS, 'svg' );

	setAttributes( svg, {
		class: 'CommandIcon',
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': '1.8',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'aria-hidden': 'true',
		focusable: 'false'
	} );

	for ( const [ tag, attributes ] of nodes ) {

		const child = document.createElementNS( SVG_NS, tag );
		setAttributes( child, attributes );
		svg.appendChild( child );

	}

	return svg;

}

export { createCommandIcon };

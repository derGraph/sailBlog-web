<script lang="ts">
	import { run } from 'svelte/legacy';

	import L, { LatLngBounds } from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onDestroy, onMount, setContext } from 'svelte';
	import errorStore from './errorStore';

	import {dark} from './darkMode.svelte';

	let mode = $state(localStorage.getItem('mode') || 'light');

	let map: L.Map | undefined = $state();
	let mapElement: HTMLDivElement = $state();
	let lines: L.Polyline[][] = $state([]);
	let mapMoved: Boolean = false;
	let myEvent: number = 0;
	let maxBounds: LatLngBounds;
	let changed = $state(false);

	let recenterButtonStructure = L.Control.extend({
		options: {
			position: 'topleft'
		},
		onAdd: function () {
			var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
			var button = L.DomUtil.create('a', 'leaflet-control-button material-symbols-outlined', container);
			button.ariaDisabled = "false";
			button.ariaLabel = "Center"
			button.href = "#"
			button.innerText = "filter_center_focus";
			L.DomEvent.disableClickPropagation(button);
			L.DomEvent.on(button, 'click', function(){
				if (map?.getBounds().isValid()) {
					if (maxBounds.isValid()) {
						map?.fitBounds(maxBounds);
						mapMoved = false;
					}
				}
			});

			container.title = "Recenter!";

			return container;
		},
		onRemove: function() {},
	});

	let recenterButton = new recenterButtonStructure();

	onMount(() => {
		const mode = localStorage.getItem('mode') || 'light';
    	document.documentElement.setAttribute('class', mode);
		map = L.map(mapElement);

		var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			className: 'osm-layer'
		});

		var seamarkLayer = L.tileLayer('https://t1.openseamap.org/seamark/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a>'
		});

		var controlLayer = L.control.scale();

		osmLayer.addTo(map);
		seamarkLayer.addTo(map);
		controlLayer.addTo(map);
    	map.invalidateSize();
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});

	setContext('map', {
		getMap: () => map
	});

	interface Props {
		bounds?: L.LatLngBoundsExpression | undefined;
		view?: L.LatLngExpression | undefined;
		zoom?: number | undefined;
		tracks?: String[] | null;
		children?: import('svelte').Snippet;
	}

	let {
		bounds = undefined,
		view = undefined,
		zoom = undefined,
		tracks = null,
		children
	}: Props = $props();

	onMount(() => {
		if (!bounds && (!view || !zoom)) {
			throw new Error('Must set either bounds, or view and zoom.');
		}
	});


	function onMouseDown(ev: {}){
		mapMoved = true;
	}

	function onZoomStart(ev: {}){
		if(myEvent>0){
			myEvent -= 1;
		}else{
			mapMoved = true;
		}
	}

	function onDrag(ev: {}){
		mapMoved = true;
	}


	function getColorByPropulsion(propulsion: number): string {
		switch (propulsion) {
			case 0:
				// anchoring
				return '#4682B4';
			case 1:
				// motoring
				return '#FF6600';
			case 2:
				// sailing
				return '#2E8B57';
			default:
				return 'red'; // Fallback color
		}
	}

	async function onTracksChange(tracks: any[] | null) {
		if(!map){
			changed = true;
			return;
		}
		lines = []; // Reset the lines2D array
		if (tracks != null) {
			recenterButton.addTo(map!);
			for (const trackId of tracks) {
				let tripLength = 0;
				let oldStartDate = 0;
				do{
					let tripData = await getTrip(trackId, oldStartDate);
					tripLength = Object.keys(tripData).length;
					let trackLines: L.Polyline[] = [];
					let currentLine: L.LatLng[] = [];
					let currentPropulsion: number | null = null;

					for (const key of Object.keys(tripData)) {
						let point = new L.LatLng(tripData[key].lat, tripData[key].long);
						let propulsionType = tripData[key].propulsion;
						oldStartDate = new Date(tripData[key].time).getTime();

						if (currentPropulsion === null) {
							// First point
							currentPropulsion = propulsionType;
							currentLine.push(point);
						} else if (propulsionType === currentPropulsion) {
							// Same propulsion, continue current line
							currentLine.push(point);
						} else {
							// Propulsion type changed
							// Finish the current segment
							const color = getColorByPropulsion(currentPropulsion);
							let polyline = L.polyline(currentLine, { color });
							trackLines.push(polyline);

							// Start a new segment with the old line extending to the new point
							currentLine = [currentLine[currentLine.length - 1], point];
							currentPropulsion = propulsionType;
						}
					}

					// Push the last segment
					if (currentLine.length > 0) {
						const color = getColorByPropulsion(currentPropulsion!);
						let polyline = L.polyline(currentLine, { color });
						trackLines.push(polyline);
					}

					// Add the trackLines to the lines2D array
					lines = [...lines, trackLines];
				}while(tripLength >= 5000);
			}
		}else{
			recenterButton.remove();
		}
	}


	function onLineChange(lines2D: L.Polyline[][]) {
		
		if (lines2D.length != 0) {
			if(lines2D[0].length != 0){
				maxBounds = lines2D[0][0].getBounds();
				lines2D.forEach((trackLines) => {
					trackLines.forEach((line) => {
						line.remove();
						line.addTo(map!);
						maxBounds.extend(line.getBounds());
					});
				});
				if (map?.getBounds().isValid() && !mapMoved) {
					if (maxBounds.isValid()) {
						myEvent += 1;
						map?.fitBounds(maxBounds);
					}
				}
			}
		}
	}

	async function getTrip(tripId: String, startDate?: Number) {
		if(startDate == null){
			startDate = 0;
		}
		let response = await fetch('/api/Datapoints?tripId=' + tripId + "&start=" + startDate + "&amount=5000");
		if (!response.ok) {
			$errorStore = response;
			return;
		}
		return await response.json();
	}
	run(() => {
		if (map) {
			if (bounds) {
				map.fitBounds(bounds);
			} else if (view && zoom) {
				map.setView(view, zoom);
			}
			map?.dragging.enable();
			map?.on("mousedown", onMouseDown);
			map?.on("zoomstart", onZoomStart);
			map?.on("dragstart", onDrag);
			if(changed){
				changed = false;
				onTracksChange(tracks);
			}
		}
	});
	run(() => {
		onTracksChange(tracks);
	});
	run(() => {
		onLineChange(lines);
	});
</script>

<div class="w-full h-full rounded-3xl" bind:this={mapElement}>
	{#if map}
		{@render children?.()}
	{/if}
</div>

{#if dark.mode}
	<style lang="">
		.osm-layer,
		.leaflet-control-zoom-in,
		.leaflet-control-zoom-out,
		.leaflet-control-button,
		.leaflet-control-scale,
		.leaflet-control-attribution {
			filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
		}
	</style>
{/if}

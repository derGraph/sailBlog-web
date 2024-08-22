<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { onDestroy, onMount, setContext } from 'svelte';
	import { modeCurrent } from '@skeletonlabs/skeleton';
	import errorStore from './errorStore';

	let map: L.Map | undefined;
	let mapElement: HTMLDivElement;
	let lines: L.Polyline[] = [];
	let oldBounds: L.LatLngBoundsExpression | undefined;

	onMount(() => {
		map = L.map(mapElement);

		var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			className: 'osm-layer'
		});

		var seamarkLayer = L.tileLayer('http://t1.openseamap.org/seamark/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a>'
		});

		osmLayer.addTo(map);
		seamarkLayer.addTo(map);
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});

	setContext('map', {
		getMap: () => map
	});

	export let bounds: L.LatLngBoundsExpression | undefined = undefined;
	export let view: L.LatLngExpression | undefined = undefined;
	export let zoom: number | undefined = undefined;
	export let tracks: String[] | null = null;

	onMount(() => {
		if (!bounds && (!view || !zoom)) {
			throw new Error('Must set either bounds, or view and zoom.');
		}
	});

	$: if (map) {
		if (bounds) {
			map.fitBounds(bounds);
			oldBounds = map.getBounds();
		} else if (view && zoom) {
			map.setView(view, zoom);
			oldBounds = map.getBounds();
		}
	}
	$: onTracksChange(tracks);
	function onTracksChange(tracks: any[] | null){
		if(tracks != null){
			tracks.forEach(async trackId => {
				let tripData = await getTrip(trackId);
				let latlngs: L.LatLng[] = [];
				for (const key of Object.keys(tripData)){
					latlngs.push(new L.LatLng(tripData[key].lat, tripData[key].long));
				}
				lines = [...lines, L.polyline(latlngs, {color: 'red'})];
			});
		}
	}
	

	$:	onLineChange(lines);
	function onLineChange(lines: any[]){
		if(lines.length != 0){
			var maxBounds = lines[0].getBounds();
			lines.forEach(line => {
				line.remove();
				line.addTo(map!);
				maxBounds.extend(line.getBounds());
			});
			if(map?.getBounds().isValid()){
				if(map?.getBounds().equals(oldBounds!) && maxBounds.isValid()){
				map?.fitBounds(maxBounds);
				oldBounds = maxBounds;
			}
			}
		}
	}

	async function getTrip(tripId: String) {
		let response = await fetch('/api/Datapoints?tripId='+tripId);
		if(!response.ok){
			$errorStore = response;
		}
		return await response.json();
	}
</script>

<div class="w-full h-full rounded-3xl" bind:this={mapElement}>
	{#if map}
		<slot />
	{/if}
</div>

{#if !$modeCurrent}
	<style lang="">
		.osm-layer,
		.leaflet-control-zoom-in,
		.leaflet-control-zoom-out,
		.leaflet-control-attribution {
			filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
		}
	</style>
{/if}

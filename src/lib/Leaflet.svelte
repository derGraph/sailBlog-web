<script lang="ts">
	import L from 'leaflet';
	import { onDestroy, onMount, setContext } from 'svelte';
	import { modeCurrent } from '@skeletonlabs/skeleton';

	let map: L.Map | undefined;
	let mapElement: HTMLDivElement;

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

	onMount(() => {
		if (!bounds && (!view || !zoom)) {
			throw new Error('Must set either bounds, or view and zoom.');
		}
	});

	$: if (map) {
		if (bounds) {
			map.fitBounds(bounds);
		} else if (view && zoom) {
			map.setView(view, zoom);
		}
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

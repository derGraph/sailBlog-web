<script lang="ts">
	// @ts-ignore
	import type { LatLngExpression } from 'leaflet';
	import Leaflet from '$lib/Leaflet.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let tracks: String[] | null = $state(null);

	const initialView: LatLngExpression = [43.95, 14.79];

	onMount(() => {
		if (data.user?.activeTripId) {
			tracks = [data.user?.activeTripId];
		}
	});
</script>

<div class="md:container md:mx-auto py-3 h-full rounded">
	<Leaflet view={initialView} zoom={8} {tracks} />
</div>

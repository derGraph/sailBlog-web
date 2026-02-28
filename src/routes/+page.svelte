<script lang="ts">
	// @ts-ignore
	import type { LatLngExpression } from 'leaflet';
	import Leaflet from '$lib/Leaflet.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();
	let tracks: String[] | null = $state(null);
	let activeTripId = $derived(data.user?.activeTripId);

	const initialView: LatLngExpression = [43.95, 14.79];

	$effect(() => {
		console.log('[Home] activeTripId effect', { user: data.user?.username, activeTripId });
		if (activeTripId) {
			tracks = [activeTripId];
		} else {
			tracks = null;
		}
	});
</script>

<div class="md:container md:mx-auto py-3 h-full rounded">
	<Leaflet view={initialView} zoom={8} {tracks} showTripImages={true} />
</div>

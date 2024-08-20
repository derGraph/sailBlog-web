<script lang="ts">
	// @ts-ignore
	import type { LatLngExpression } from 'leaflet';
	import Leaflet from '$lib/Leaflet.svelte';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore.js';

	export let data;
	let tracks: null = null;

	const initialView: LatLngExpression = [43.95, 14.79];

	async function getTrip(tripId: String) {
		let response = await fetch('/api/Datapoints?tripId='+tripId);
		if(!response.ok){
			$errorStore = response;
		}
		tracks = await response.json();
	}

	onMount(()=>{
		if(data.user){
			getTrip(data.user?.activeTripId);
		}
	});

</script>

<div class="md:container md:mx-auto py-3 h-full rounded">
	<Leaflet view={initialView} zoom={8} tracks={$tracks}/>
</div>

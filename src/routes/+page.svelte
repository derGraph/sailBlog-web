<script lang="ts">
	// @ts-ignore
	import type { LatLngExpression } from 'leaflet';
	import Leaflet from '$lib/Leaflet.svelte';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore.js';

	export let data;
	let tracks: String[]|null = null;

	const initialView: LatLngExpression = [43.95, 14.79];

	interface Datapoint {
		id?: string;
		time?: Date;
		tripId: string;
		lat: number;
		long: number;
		speed?: number;
		heading?: number;
		depth?: number;
		h_accuracy?: number;
		v_accuracy?: number;
		propulsion?: number;
	}

	onMount(()=>{
		if(data.user){
			tracks = [data.user?.activeTripId];
		}
	});
</script>

<div class="md:container md:mx-auto py-3 h-full rounded">
	<Leaflet view={initialView} zoom={8} tracks={tracks}/>
</div>

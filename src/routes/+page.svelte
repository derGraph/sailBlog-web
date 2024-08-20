<script lang="ts">
	// @ts-ignore
	import type { LatLngExpression } from 'leaflet';
	import Leaflet from '$lib/Leaflet.svelte';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore.js';

	export let data;
	let tracks: Datapoint[]|null = null;

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

	async function getTrip(tripId: String) {
		let response = await fetch('/api/Datapoints?tripId='+tripId);
		if(!response.ok){
			$errorStore = response;
		}
		let tracksJson = await response.json();
		$tracks = tracksJson.map((data: { id: any; time: string | number | Date; tripId: any; lat: string; long: string; speed: null; heading: null; depth: null; h_accuracy: null; v_accuracy: null; propulsion: null; }) => ({
			id: data.id,
			time: new Date(data.time),
			tripId: data.tripId,
			lat: parseFloat(data.lat),
			long: parseFloat(data.long),
			speed: data.speed !== null ? data.speed : undefined,
			heading: data.heading !== null ? data.heading : undefined,
			depth: data.depth !== null ? data.depth : undefined,
			h_accuracy: data.h_accuracy !== null ? data.h_accuracy : undefined,
			v_accuracy: data.v_accuracy !== null ? data.v_accuracy : undefined,
			propulsion: data.propulsion !== null ? data.propulsion : undefined
		}));
		$: console.log(tracks);
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

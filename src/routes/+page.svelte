<script lang="ts">
	 // @ts-ignore
	import type {LatLngExpression} from 'leaflet'
	import Leaflet from '$lib/Leaflet.svelte';

	const initialView: LatLngExpression = [43.95, 14.79];
</script>


<div class='md:container md:mx-auto py-3 h-full rounded'>
	<Leaflet view={initialView} zoom={8}/>
</div>


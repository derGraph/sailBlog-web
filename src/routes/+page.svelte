<script lang="ts">
  // @ts-ignore
  import type { LatLngExpression } from 'leaflet';
  import Leaflet from '$lib/Leaflet.svelte';
  import { onMount } from 'svelte';
  import errorStore from '$lib/errorStore.js';

  let { data } = $props();
  let tracks: String[] | null = $state(null);
  let activeTripId = $derived(data.user?.activeTripId);

  const initialView: LatLngExpression = [43.95, 14.79];

  $effect(() => {
    console.log('[Home] activeTripId effect', { user: data.user?.username, activeTripId });
    if (activeTripId) {
      tracks = [activeTripId];
      fetch('/api/Trips?deleted=false').then(async (response) => {
        if (!response.ok) {
          $errorStore = response;
          return;
        }
        let allTrips: any[] = await response.json();
        allTrips = allTrips.filter((trip) => {
          // If showMyTrips is false, include all trips; otherwise, filter by the user's trips
          const isMyTrip =
            trip.crew.some(
              (crewMember: { username: string | undefined }) =>
                crewMember.username === data.user?.username
            ) || trip.skipperName === data.user?.username;

          // Combine all conditions
          return isMyTrip;
        });
        tracks = allTrips.map((trip) => String(trip.id));
      });
    } else {
      tracks = null;
    }
  });
</script>

<div class="md:container md:mx-auto py-3 h-full rounded">
  <Leaflet view={initialView} zoom={8} {tracks} showTripImages={false} />
</div>

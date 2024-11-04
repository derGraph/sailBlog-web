<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import Leaflet from '$lib/Leaflet.svelte';
	import { parseDate } from '$lib/functions.js';
	import Tiptap from '$lib/Tiptap/+Tiptap.svelte';
	import type { User } from '@prisma/client';
	import { Avatar } from '@skeletonlabs/skeleton';
	import type { LatLngExpression } from 'leaflet';
	import { onMount } from 'svelte';

	let { data } = $props();

	let requestedTrip = $derived(data.requestedTrip);

	let requestedTripData: {
		endPoint: any;
		startPoint: any;
		skipper: any;
		length_sail: any;
		length_motor: any;
		crew: [User];
		name: any;
		description: any; 
	} = $state({
		description: "",
		crew: [{ username: "no", email: "no", firstName: null, lastName: null, description: null, profilePictureId: "", dateOfBirth: null, roleId: "user", activeTripId: "", lastPing: new Date }],
		name: undefined,
		length_sail: undefined,
		length_motor: undefined,
		endPoint: undefined,
		startPoint: undefined,
		skipper: undefined
	});


	let user = $derived(data.user);
	let session = $derived(data.session);

	let tracks: String[] = [];
	const initialView: LatLngExpression = [43.95, 14.79];


	onMount(() => {
		fetch('/api/Trip?tripId='+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
					requestedTripData = response_data[0]
				});
			} else {
				$errorStore = response;
			}
		});
		tracks.push(requestedTrip);
	});
	
	function getInitials(user:User) {
		if (user != null && user.firstName && user.lastName) {
			return user.firstName.charAt(0) + user.lastName.charAt(0);
		}
	}

	function getPictureUrl(profilePictureId: string) {
		return profilePictureId
	}
</script>
<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
    <div class="flex-1 flex flex-wrap flex-row">
        <div class="basis-full md:basis-1/3 w-1/3 md:h-full flex flex-col">
			<div class="rounded-3xl bg-surface-100-800-token p-3 content-center mb-2">
				<h1 class="h1 text-center">{requestedTripData.name}</h1>
			</div>
			<div class="rounded-3xl bg-surface-100-800-token p-1 content-center mb-2">
				<h3 class="h5 text-center">{parseDate(requestedTripData?.startPoint)} - {parseDate(requestedTripData?.endPoint)}
				</h3>
			</div>
			<div class="rounded-3xl bg-surface-100-800-token p-1 content-center mb-2">
				<h3 class="h5 text-center">Distance:
					{((Number(requestedTripData?.length_sail)+Number(requestedTripData?.length_motor))/1853).toFixed(2)} NM
					<span class="!text-base material-symbols-outlined">sailing</span>{(Number(requestedTripData?.length_sail)/1853).toFixed(2)} NM
					<span class="!text-base material-symbols-outlined">mode_heat</span>{(Number(requestedTripData?.length_motor)/1853).toFixed(2)} NM
				</h3>
			</div>
			<div class="rounded-3xl bg-surface-100-800-token p-1 content-center mb-2">
				<h3 class="h5 text-center">Skipper:
					<a href="/user/{requestedTripData.skipper?.username}" class="btn btn-sm variant-ghost-secondary mr-1">
						<Avatar initials={getInitials(requestedTripData.skipper)}
								src={getPictureUrl(requestedTripData.skipper?.profilePictureId)}
								background="bg-primary-500"
								width="w-5"
								link
								rounded="rounded-full"
								class="mr-1"
								/>
								{requestedTripData.skipper?.username}</a> Crew:
					{#each requestedTripData?.crew as member, i}
						{#if member.username != requestedTripData?.skipper?.username}
							<a href="/user/{member.username}" class="btn btn-sm variant-ghost-secondary mr-1">
							<Avatar initials={getInitials(member)}
									src={getPictureUrl(member.profilePictureId)}
									background="bg-primary-500"
									width="w-5"
									link
									rounded="rounded-full"
									class="mr-1"
									/>
									{member.username}</a>
						{/if}
					{/each}
				</h3>
			</div>
			<div class="h-full rounded-3xl p-3 bg-surface-100-800-token md:overflow-auto">
				<div class="md:mx-1 md:my-0 text-wrap">
					{@html requestedTripData.description}
				</div>
			</div>
        </div>
        <div class="basis-full flex-1 md:basis-2/3 h-[90%] md:h-full">
			<div class="pl-0 my-3 md:my-0 md:pl-2 h-full">
				<Leaflet zoom={8} view={initialView} {tracks} />
			</div>
        </div>
    </div>
</div>
<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import Leaflet from '$lib/Leaflet.svelte';
	import { getProfilePicture, parseDate } from '$lib/functions.js';
	import type { User } from '@prisma/client';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
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
		crew: [{
			username: "no",
			email: "no",
			firstName: null,
			lastName: null,
			description: null,
			profilePictureId: "",
			dateOfBirth: null,
			roleId: "user",
			activeTripId: "",
			lastPing: new Date,
			skipperedLengthMotor: 0,
			skipperedLengthSail: 0,
			crewedLengthMotor: 0,
			crewedLengthSail:0,
			recalculate: false
		}],
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

	function isUser(trip: any){
		let isContained = false;
		trip.crew.forEach((element: { username: string; }) => {
			if(element.username == user?.username){
				isContained = true;
			}
		});
		if(user?.username == trip.skipper?.username){
			isContained = true;
		}
		return isContained;
	}

</script>
<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
    <div class="flex-1 flex flex-wrap flex-row">
        <div class="basis-full md:basis-1/3 w-1/3 md:h-full flex flex-col">
			<div class="rounded-3xl bg-surface-100-900 p-3 content-center mb-2 justify-center">
				<h1 class="h1 text-center">{String(requestedTripData.name).trim()}{#if isUser(requestedTripData)}<a class="text-4xl! material-symbols-outlined max-h" href="/trips/edit/{requestedTrip}">edit</a>{/if}
				</h1>
			</div>
			<div class="rounded-3xl bg-surface-100-900 p-1 content-center mb-2">
				<h3 class="h5 text-center">{parseDate(requestedTripData?.startPoint)} - {parseDate(requestedTripData?.endPoint)}
				</h3>
			</div>
			<div class="rounded-3xl bg-surface-100-900 p-1 content-center mb-2">
				<h3 class="h5 text-center">Distance:
					{((Number(requestedTripData?.length_sail)+Number(requestedTripData?.length_motor))/1853).toFixed(2)} NM
					<span class="text-base! material-symbols-outlined">sailing</span>{(Number(requestedTripData?.length_sail)/1853).toFixed(2)} NM
					<span class="text-base! material-symbols-outlined">mode_heat</span>{(Number(requestedTripData?.length_motor)/1853).toFixed(2)} NM
				</h3>
			</div>
			<div class="rounded-3xl bg-surface-100-900 p-1 content-center mb-2 flex flex-wrap justify-center items-center space-x-2">
				<div class="flex items-center">
					<h3 class="h5 align-middle mr-2">Skipper:</h3>
					<a href="/user/{requestedTripData.skipper?.username}" class="btn btn-sm preset-tonal-secondary border border-secondary-500 mr-1 pl-1 flex items-center text-sm">
						<Avatar name={requestedTripData.skipper?.firstName + " " + requestedTripData.skipper?.lastName}
								src={getProfilePicture(requestedTripData.skipper)}
								background="bg-primary-500"
								classes="!ml-0 !size-6"
								rounded="rounded-full"
						/>
						{requestedTripData.skipper?.username}
					</a>
				</div>
			
				<div class="flex items-center">
					<h3 class="h5 align-middle mr-2">Crew:</h3>
					{#each requestedTripData?.crew as member, i}
						{#if member.username != requestedTripData?.skipper?.username}
							<a href="/user/{member.username}" class="btn btn-sm preset-tonal-secondary border border-secondary-500 mr-1 pl-2 flex items-center">
								<Avatar name={member.firstName + " " + member.lastName}
										src={getProfilePicture(member)}
										background="bg-primary-500"
										classes="!ml-0 !size-6"
										rounded="rounded-full"
								/>
								{member.username}
							</a>
						{/if}
					{/each}
				</div>
			</div>
			<div class="h-full rounded-3xl p-3 bg-surface-100-900 md:overflow-auto">
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
<script lang="ts">
	import errorStore from '$lib/errorStore.js';
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
		getTripData();
	});

	function getTripData(){
		fetch('/api/Trip?tripId='+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
					requestedTripData = response_data[0]
				});
			} else {
				$errorStore = response;
			}
		});
		tracks[0] = requestedTrip;
	}
	
	function getInitials(user:User) {
		if (user != null && user.firstName && user.lastName) {
			return user.firstName.charAt(0) + user.lastName.charAt(0);
		}
	}

	function getPictureUrl(profilePictureId: string) {
		return profilePictureId
	}


	function deleteUser(username: string) {
		let deleted_crew = requestedTripData.crew.filter(member=> member.username != username);
		let crewlist = deleted_crew.map(member => member.username);
		fetch('/api/Trip?tripId='+requestedTrip+'&crew='+crewlist.toString(), {method: 'PUT'}).then(async (response)=>{
			if(!response.ok){
				$errorStore = response;
			}else{
				getTripData();
			}
		});
	}


	function addCrew() {
		throw new Error('Function not implemented.');
	}
</script>
<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
	<div class="flex-1 basis-full md:basis-1/3 w-1/3 md:h-full flex flex-col">
		<div class="rounded-3xl bg-surface-100-800-token p-3 content-center mb-2">
			<h1 class="h1 text-center">{requestedTripData.name}</h1>
		</div>
		<div class="rounded-3xl bg-surface-100-800-token p-1 content-center mb-2 flex justify-center items-center space-x-2">
			<div class="flex items-center">
				<h3 class="h5 align-middle mr-2">Skipper:</h3>
				<a href="/user/{requestedTripData.skipper?.username}" class="btn btn-sm variant-ghost-secondary mr-1 group hover:variant-filled-warning">
					<Avatar initials={getInitials(requestedTripData.skipper)}
							src={getPictureUrl(requestedTripData.skipper?.profilePictureId)}
							background="bg-primary-500"
							width="w-5"
							link
							rounded="rounded-full"
							class="group-hover:hidden mr-1"
					/>
					<span class="!ml-0 !mr-1 h-5 w-5 !text-base material-symbols-outlined !hidden group-hover:!block">autorenew</span>
					{requestedTripData.skipper?.username}
				</a>
			</div>
		
			<div class="flex items-center">
				<h3 class="h5 align-middle mr-2">Crew:</h3>
				{#each requestedTripData?.crew as member, i}
					{#if member.username != requestedTripData?.skipper?.username}
					<button onclick={()=>{deleteUser(member.username)}} class="btn btn-sm variant-ghost-secondary mr-1 group hover:variant-filled-error">
						<Avatar initials={getInitials(member)}
									src={getPictureUrl(member.profilePictureId)}
									background="bg-primary-500"
									width="w-5"
									link
									rounded="rounded-full"
									class="group-hover:hidden mr-1"
									/>
							<span class="!ml-0 !mr-1 h-5 w-5 !text-base material-symbols-outlined !hidden group-hover:!block">close</span>

							{member.username}
						</button>
					{/if}
				{/each}
				<button onclick={()=>{addCrew()}} class="btn btn-sm variant-ghost-secondary mr-1 p-1.5 group hover:variant-filled-primary content-center">
					<Avatar width="w-5" rounded="rounded-full" background="color-secondary-500">
						<span class="material-symbols-outlined">add</span>
					</Avatar>
				</button>
			</div>
		</div>
		
		
		<div class="h-full rounded-3xl p-3 bg-surface-100-800-token md:overflow-auto">
			<div class="md:mx-1 md:my-0 text-wrap">
				{@html requestedTripData.description}
			</div>
		</div>
    </div>
</div>
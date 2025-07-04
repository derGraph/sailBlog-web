<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import { getProfilePicture, parseDate } from '$lib/functions.js';
	import SearchBar from '$lib/searchBar.svelte';
	import Tiptap from '$lib/Tiptap/+Tiptap.svelte';
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
			crewedLengthMotor: 0,
			crewedLengthSail: 0,
			skipperedLengthMotor: 0,
			skipperedLengthSail: 0,
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

	let showCrewSearch = $state(false);
	let showSkipperSearch = $state(false);
	let editDescription = $state(false);
	let showDeleteConfirm = $state(false);
	let editName = $state(false);
	let newName = $state("");
	let tracks: String[] = [];


	onMount(() => {
		getTripData();
	});

	function getTripData(){
		fetch('/api/Trip?tripId='+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
					requestedTripData = response_data[0];
					newName = requestedTripData.name;
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

	function addCrew(username:string) {
		let usernameList = requestedTripData.crew.map((member)=>{
			return member.username;
		});
		usernameList.push(username);
		fetch('/api/Trip?tripId='+requestedTrip+'&crew='+usernameList, {method: 'PUT'}).then((response)=>{
			if(!response.ok){
			$errorStore = response;
			}else{
				getTripData();
			}
		});
	}

	function changeSkipper(username:string) {
		fetch('/api/Trip?tripId='+requestedTrip+'&skipper='+username, {method: 'PUT'}).then((response)=>{
			if(!response.ok){
			$errorStore = response;
			}else{
				getTripData();
			}
		});
	}

	function saveEditor(html:string){
		editDescription = false;
		fetch('/api/Trip?tripId='+requestedTrip+'&description='+html, {method: 'PUT'}).then((response)=>{
			if(!response.ok){
			$errorStore = response;
			}else{
				getTripData();
			}
		});
	}

	function saveTripName(name:string){
		editName = false;
		fetch('/api/Trip?tripId='+requestedTrip+'&name='+name, {method: 'PUT'}).then((response)=>{
			if(!response.ok){
			$errorStore = response;
			}else{
				getTripData();
			}
		});
	}
	async function search(searchTerm:string) {
		let response = await fetch('/api/User?search='+searchTerm, {method: 'GET'});
		if(!response.ok){
			$errorStore = response;
		}else{
			let usernameArray:String[] = await response.json();
			return usernameArray;
		}
		return [];
	}


	function deleteTrip() {
		fetch('/api/Trip?tripId='+requestedTrip, {method: 'DELETE'}).then((response)=>{
			if(!response.ok){
			$errorStore = response;
			}else{
				window.location.assign("/trips");
			}
		});
	}
</script>

{#if showDeleteConfirm}
	<div class="fixed flex h-full inset-0 content-center items-center place-content-center bg-black bg-opacity-80 z-1002">
		<div class="preset-tonal-surface rounded-3xl p-4 shadow-lg content-center justify-center w-11/12 md:w-1/3">
			<label for="options" class="h3 mb-2">Do you really want to delete this trip?</label>
			<button 
				class="btn preset-filled-error-500"
				onclick={() => {
					showDeleteConfirm=false;
					deleteTrip();
					}}>
				Yes
			</button>
			<button 
				class="btn preset-filled-success-500"
				onclick={() => {showDeleteConfirm=false}}>
				No
			</button>
		</div>
	</div>
{/if}

<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
	<div class="flex-1 basis-full md:basis-1/3 w-1/3 md:h-full flex flex-col">
		<div class="rounded-3xl bg-surface-100-900 p-3 justify-center mb-2 flex flex-row">
			{#if editName}
			<input 	class="text-xl! input w-min" 
					type="text" 
					name="tripName"
					bind:value={newName}
					required
					placeholder="{requestedTripData.name}">
			<button class="text-4xl! material-symbols-outlined max-h" onclick={()=>{saveTripName(newName)}}>save</button>
			{:else}
			<h1 class="h1 text-center">
				{requestedTripData.name}
				<button class="text-4xl! material-symbols-outlined" onclick={()=>{editName=true}}>edit</button>
				<button class="text-4xl! material-symbols-outlined" onclick={()=>{showDeleteConfirm=true}}>delete</button>
			</h1>
			{/if}
		</div>
		<div class="rounded-3xl bg-surface-100-900 p-1 content-center mb-2 flex flex-wrap justify-center items-center space-x-2">
			<div class="flex flex-wrap items-center">
				<h3 class="h5 align-middle mr-2">Skipper:</h3>
				<button onclick={()=>{showSkipperSearch = true}} class="btn btn-sm preset-tonal-secondary border border-secondary-500 mr-1 pl-1 group hover:preset-filled-warning-500">
					<Avatar name={requestedTripData.skipper?.firstName + " " + requestedTripData.skipper?.lastName}
							src={getProfilePicture(requestedTripData?.skipper)}
							background="bg-primary-500"
							classes="!size-6 group-hover:hidden"
							rounded="rounded-full"
					/>
					<span class="h-6 !w-6 !text-md material-symbols-outlined hidden! group-hover:block!">autorenew</span>
					{requestedTripData.skipper?.username}
				</button>
				<SearchBar bind:displayed={showSkipperSearch} onSelected={changeSkipper} getList={search}/>
			</div>
		
			<div class="flex flex-wrap items-center">
				<h3 class="h5 align-middle mr-2">Crew:</h3>
				{#each requestedTripData?.crew as member, i}
					<button onclick={()=>{deleteUser(member.username)}} class="btn btn-sm preset-tonal-secondary border border-secondary-500 mr-1 pl-1 group hover:preset-filled-error-500 text-sm">
						<Avatar name={member.firstName + " " + member.lastName}
								src={getProfilePicture(member)}
								background="bg-primary-500"
								classes="!ml-0 !size-6 group-hover:hidden"
								rounded="rounded-full"
						/>
						<span class="h-6 !w-6 !text-md material-symbols-outlined hidden! group-hover:block!">close</span>
						{member.username}
					</button>
				{/each}
				<button onclick={()=>{showCrewSearch = true}} class="btn btn-sm !p-1 preset-tonal-secondary border border-secondary-500 mr-1 group hover:preset-filled-primary-500 content-center">
					<Avatar name="+" classes="!size-6" rounded="rounded-full" background="color-secondary-500">
						<span class="material-symbols-outlined">add</span>
					</Avatar>
				</button>
				<SearchBar bind:displayed={showCrewSearch} onSelected={addCrew} getList={search} inputClass="w-32"/>
			</div>
		</div>
		
		
		<div class="h-full rounded-3xl p-3 bg-surface-100-900 relative overflow-hidden">
		  
			{#if editDescription}
			  <!-- TipTap editor with scrolling -->
			  <div class="h-full z-0">
				<Tiptap {saveEditor} usernameToFetch={user?.username} description={requestedTripData.description} />
			  </div>
			{:else}
				<!-- Edit Button -->
				<button 
				class="btn-icon preset-tonal-secondary border border-secondary-500 absolute t-2 r-2 z-1 opacity-80"
				aria-label="Edit"
				onclick={() => { editDescription = true }}
				>
				<span class="material-symbols-outlined">edit</span>
				</button>
				<!-- Scrollable description with rounded corners -->
				<div class="h-full overflow-auto md:mx-1 md:my-0 text-wrap z-0">
					{@html requestedTripData.description}
				</div>
			{/if}
		  </div>
		  
    </div>
</div>
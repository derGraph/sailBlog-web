<script lang="ts">
	import { Avatar, ListBox } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore.js';
	import Tiptap from '$lib/Tiptap/+Tiptap.svelte';
	import MediaPicker from '$lib/mediaPicker.svelte';
	import { getProfilePicture } from '$lib/functions.js';

	let { data } = $props();
	let newFirstName = $state('');
	let newLastName = $state('');

	let requestedUserName = $derived(data.requestedUser);

	let requestedUser: {
        description: string | null;
        username: string;
        firstName: string | null;
        lastName: string | null;
        profilePictureId: string | null;
        dateOfBirth: Date | null;
        roleId: string;
        activeTripId: string;
        lastPing: Date;
    } | null = $state(null);

	let editName = $state(false);
	let editDescription = $state(false);
	let mediaPickerOpen = $state(false);
	

	onMount(async () => {
		getUserData();
	});

	$effect(()=>{
		requestedUserName;
		getUserData();
	});

	async function getUserData(){
		await fetch('/api/User?username=' + requestedUserName).then((response) => {
			if (response.ok) {
				response.json().then((response_data) => {
					requestedUser = response_data[Object.keys(response_data)[0]];
					requestedUser!.username = Object.keys(response_data)[0];
				});
			} else {
				$errorStore = response;
			}
		});
	}

	function getInitials(user: any) {
		if (
			user != null &&
			Object.keys(user).includes('firstName') &&
			Object.keys(user).includes('lastName')
		) {
			return user.firstName.charAt(0) + user.lastName.charAt(0);
		}
	}

	function changePicture(owner:String, imageId:String){
		fetch('/api/User?username=' + requestedUserName + 
				  '&picture=' + imageId,
				  {method: 'PUT'})
				  .then((response)=>{
				if(!response.ok){
					$errorStore = response;
				}else{
					getUserData();
				}
			});
	}

	function editNameChange() {
		if (editName) {
			editName = false;
			fetch('/api/User?username=' + requestedUserName + 
				  '&firstName=' + newFirstName + 
				  '&lastName=' + newLastName, 
				  {method: 'PUT'})
				  .then((response)=>{
				if(!response.ok){
					$errorStore = response;
				}else{
					getUserData();
				}
			});
		} else {
			if(requestedUser?.firstName != null){
				newFirstName = requestedUser.firstName;
			}
			if(requestedUser?.lastName != null){
				newLastName = requestedUser.lastName;
			}
			editName = true;
		}
	}

	let user = $derived(data.user);
	let session = $derived(data.session);
	const saveEditor = (message: any) => {
		fetch(
			'/api/User?username=' + requestedUserName + '&description=' + encodeURIComponent(message),
			{
				method: 'PUT'
			}
		)
			.then(async (response_data) => {
				await getUserData();
				editDescription = false;
				if (response_data.ok) {
					return true;
				} else {
					$errorStore = response_data;
					return false;
				}
			})
			.catch((error) => {
				console.log(error);
				return false;
			});
	};
</script>

<div class="md:container md:mx-auto py-3 h-full w-full flex flex-col items-center justify-center">
	{#if requestedUser}
		{#if requestedUserName == user?.username}
			<MediaPicker bind:isOpen = {mediaPickerOpen} usernameToFetch = {requestedUserName} onFinished={(owner:String, imageId:String)=>{changePicture(owner, imageId)}}/>
		{/if}
		<div class="flex flex-col mb-2 p-3 w-min bg-surface-100-800-token rounded-3xl items-center">
			{#if requestedUser.firstName && requestedUser.lastName}
				{#if requestedUserName == user?.username}
				<button onclick={()=>{mediaPickerOpen = true}}>
					<Avatar
						initials={getInitials(requestedUser)}
						src={getProfilePicture(requestedUser)}
						class="mt-3 shrink-0"
						background="bg-primary-500"
						width="w-40"
						rounded="rounded-full"
					/>
				</button>
				{:else}
					<Avatar
						initials={getInitials(requestedUser)}
						src={getProfilePicture(requestedUser)}
						class="mt-3 shrink-0"
						background="bg-primary-500"
						width="w-40"
						rounded="rounded-full"
					/>
				{/if}
			{:else}
				<div class="placeholder-circle w-40 mt-3 shrink-0"></div>
			{/if}
			{#if requestedUser.firstName && requestedUser.lastName}
			<div class="flex flex-row mt-3">
				{#if editName == false}
						<h1 class="h1 text-nowrap">{requestedUser.firstName + ' ' + requestedUser.lastName}</h1>
						{#if user?.username == requestedUserName}
							<button class="h1 material-symbols-outlined max-h" onclick={editNameChange}
								>edit</button>
						{/if}
				{:else}
						<input 	class="!text-xl input w-min" 
							name="firstName"
							bind:value={newFirstName}
							type="text"
							placeholder={requestedUser.firstName}
							required
						/>
						<input 	class="!text-xl input w-min" 
							name="lastName"
							bind:value={newLastName}
							type="text"
							placeholder={requestedUser.lastName}
							required
						/>
						{#if user?.username == requestedUserName}
							<button class="h1 material-symbols-outlined max-h" onclick={editNameChange}
								>check</button
							>
						{/if}
				{/if}
			</div>
			{/if}
			{#if requestedUser.username}
				<h4 class="h4">@{requestedUser.username}</h4>
			{/if}
		</div>
		<div class="h-full rounded-3xl p-3 bg-surface-100-800-token relative overflow-hidden min-w-20">
			{#if editDescription}
				<!-- TipTap editor with scrolling -->
				<div class="h-full z-0">
					<Tiptap {saveEditor} usernameToFetch={user?.username} description={requestedUser.description} />
				</div>
			{:else}
				{#if requestedUserName == user?.username}
					<!-- Edit Button -->
					<button 
					class="btn-icon variant-ghost-secondary absolute t-2 r-2 z-1"
					aria-label="Edit"
					onclick={() => { editDescription = true }}
					>
					<span class="material-symbols-outlined">edit</span>
					</button>
				{/if}
				<!-- Scrollable description with rounded corners -->
				<div class="h-full overflow-auto md:mx-1 md:my-0 text-wrap z-0">
					{@html requestedUser.description}
				</div>
			{/if}
		</div>
	{/if}
</div>

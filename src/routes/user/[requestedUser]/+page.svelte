<script lang="ts">
	import { Avatar, ListBox } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore.js';
	import Tiptap from '$lib/Tiptap/+Tiptap.svelte';

	let { data } = $props();
	let newFirstName = $state('');
	let newLastName = $state('');

	let requestedUserName = $derived(data.requestedUser);

	let requestedUser = $state({
		firstName: '',
		lastName: '',
		username: '',
		description: ''
	});

	let editName = $state(false);
	

	onMount(async () => {
		fetch('/api/User?username=' + requestedUserName).then((response) => {
			if (response.ok) {
				response.json().then((response_data) => {
					requestedUser = response_data[Object.keys(response_data)[0]];
					requestedUser.username = Object.keys(response_data)[0];
				});
			} else {
				$errorStore = response;
			}
		});
	});

	function getInitials(user: any) {
		if (
			user != null &&
			Object.keys(user).includes('firstName') &&
			Object.keys(user).includes('lastName')
		) {
			return user.firstName.charAt(0) + user.lastName.charAt(0);
		}
	}

	function getPictureUrl(user: {
		firstName: string;
		lastName: string;
		username: string;
		description: string;
	}) {
		return '';
	}

	function editNameChange() {
		if (editName) {
			editName = false;
		} else {
			newFirstName = requestedUser.firstName;
			newLastName = requestedUser.lastName;
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
			.then((response_data) => {
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

<div class="md:container md:mx-auto py-3 h-full w-full flex flex-row">
	<div class="flex flex-col w-full bg-surface-100-800-token rounded-3xl items-center">
		{#if requestedUser.firstName && requestedUser.lastName}
			<Avatar
				initials={getInitials(requestedUser)}
				src={getPictureUrl(requestedUser)}
				class="mt-3"
				background="bg-primary-500"
				width="w-40"
				rounded="rounded-full"
			/>
		{:else}
			<div class="placeholder-circle w-40 mt-3"></div>
		{/if}
		{#if requestedUser.firstName && requestedUser.lastName}
			{#if editName == false}
				<div class="flex flex-row">
					<h1 class="h1 mt-3">{requestedUser.firstName + ' ' + requestedUser.lastName}</h1>
					{#if user?.username == requestedUserName}
						<button class="h1 mt-3 material-symbols-outlined max-h" onclick={editNameChange}
							>edit</button>
					{/if}
				</div>
			{:else}
				<div class="flex flex-row">
					<input
						name="firstName"
						class="mt-3 input min-w"
						bind:value={newFirstName}
						type="text"
						placeholder={requestedUser.firstName}
						required
					/>
					<input
						name="lastName"
						class="mt-3 ml-3 input min-w"
						bind:value={newLastName}
						type="text"
						placeholder={requestedUser.lastName}
						required
					/>
					{#if user?.username == requestedUserName}
						<button class="h1 mt-3 material-symbols-outlined max-h" onclick={editNameChange}
							>check</button
						>
					{/if}
				</div>
			{/if}
		{/if}
		{#if requestedUser.username}
			<h4 class="h4">@{requestedUser.username}</h4>
		{/if}
		{#if user?.username == requestedUserName}
			<Tiptap {saveEditor} usernameToFetch={user?.username} description={requestedUser.description} />
		{:else if requestedUser.description}
			<div class="remove-all">
				{@html requestedUser.description}
			</div>
		{/if}
	</div>
</div>

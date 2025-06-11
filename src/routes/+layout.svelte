<script lang="ts">
	import '../app.css';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore';
	import { getProfilePicture } from '$lib/functions';

	let navHeight = 2;
	let { data, children } = $props();
	let checked = $state(false);

	$effect(() => {
		const mode = localStorage.getItem('mode') || 'light';
		checked = mode === 'dark';
	});

	onMount(() => {
		const mode = localStorage.getItem('mode') || 'light';
		document.documentElement.setAttribute('data-mode', mode);
	});

	function changeDarkMode() {
		const mode = !checked ? 'dark' : 'light';
		document.documentElement.setAttribute('data-mode', mode);
		localStorage.setItem('mode', mode);
		checked = !checked;
	}

	function getInitials() {
		if (user != null && user.firstName && user.lastName) {
			return user.firstName.charAt(0) + user.lastName.charAt(0);
		}
	}

	function getPictureUrl() {
		return 'https://uapload.wikimedia.org/wikipedia/en/9/9a/Trollface_non-free.png';
	}

	function resetError() {
		$errorStore = new Response();
	}

	let user = $derived(data.user);
	let session = $derived(data.session);
</script>

<link
	rel="stylesheet"
	href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
/>
	<div class="h-dvh flex flex-col">
		<div class="md:container md:mx-auto justify-center items-center">
			<AppBar classes="rounded-b-3xl" padding="p-3 pt-2" leadClasses="flex items-end" leadSpaceX="space-x-2" centerAlign="flex flex-auto items-end" trailClasses="flex items-end" trailSpaceX="space-x-2">
				{#snippet lead()}
					
						<a href="/" class="material-symbols-outlined" style="font-size: {navHeight}rem">map</a>
						<a href="/" class="text-2xl">sailBlog</a>
					
					{/snippet}
				{#snippet trail()}
					
						{#if !user}
							<div class="btn-md btn preset-tonal-secondary border border-secondary-500">
								<a href="/sign_in"><button type="button" class="">Sign in!</button></a>
								<span class="divider-vertical h-6"></span>
								<a href="/sign_up"><button type="button" class="">Sign up!</button></a>
							</div>
						{:else}
							<div
								class="btn-sm btn preset-tonal-secondary border border-secondary-500 material-symbols-outlined grow flex flex-auto"
								style="margin:0;"
							>
								<button onclick={changeDarkMode} style="s"
									>{checked ? 'dark_mode' : 'light_mode'}</button
								>
								<span
									class="divider-vertical h-8"
									style="border-color:rgb(var(--color-secondary-500)); margin:0; padding:0;"
								></span>
								<a href="/sign_out" style="margin:0;padding:0;"
									><button type="button" style="">logout</button></a
								>
							</div>
							{#if user.firstName && user.lastName}
								<a href="/user" class="grow flex flex-auto btn-sm"
								aria-label="Get to the Users page!"
									><Avatar
										name={user.firstName + " " + user.lastName}
										src={getProfilePicture(user)}
										background="bg-primary-500"
										size="grow flex flex-auto"
										rounded="rounded-full"
									/></a
								>
							{:else}
								<a href="/user" aria-label="profile Picture" ><div class="placeholder-circle w-11" ></div></a>
							{/if}
						{/if}
					
					{/snippet}
					{#if user}
						{#if user.firstName && user.lastName}
							<button type="button" class="text-xl" onclick={() => {window.location.href = "/trips"}}>Trips</button>
							<span class="divider-vertical h-3"></span>
						{/if}
					{/if}
			</AppBar>
		</div>
		{#if $errorStore.status && $errorStore.status != 200}
			<div class="md:container md:mx-auto flex flex-row flex flex-col pt-3 rounded-t-3xl">
				<aside class="alert preset-tonal-warning border border-warning-500 text-warning-500">
					<div class="material-symbols-outlined">warning</div>
					<div class="alert-message">
						{#await $errorStore.json()}
							<h3 class="h3">"Loading..."</h3>
						{:then parsed}
							<h3 class="h3">{$errorStore.status} {$errorStore.statusText}: {parsed.message}</h3>
						{:catch parsingError}
							<h3 class="h3">Error in response: {parsingError}</h3>
						{/await}
					</div>
					<div class="alert-actions">
						<button class="btn preset-filled-warning-500" onclick={resetError}>
							<span>Ok</span>
						</button>
					</div>
				</aside>
			</div>
		{/if}
		<div class="grow min-h-0 flex flex-col">
			{@render children?.()}
		</div>
		<div
			class="container rounded-t-3xl mx-auto justify-center bg-surface-100-900"
			style="text-align: center"
		>
			<a href="https://github.com/derGraph">© derGraph</a>
		</div>
	</div>

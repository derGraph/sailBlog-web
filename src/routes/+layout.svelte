<script lang="ts">
	import '../app.postcss';
	import { AppBar } from '@skeletonlabs/skeleton';
	import { AppShell } from '@skeletonlabs/skeleton';
	import { Avatar } from '@skeletonlabs/skeleton';
	import { setModeCurrent, setModeUserPrefers, modeCurrent } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore';
	import { storePopup } from '@skeletonlabs/skeleton';

	let navHeight = 2;
	export let data;

	onMount(() => {
		setModeCurrent($modeCurrent);
	});

	function changeDarkMode() {
		setModeCurrent(!$modeCurrent);
		setModeUserPrefers(!$modeCurrent);
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

	$: user = data.user;
	$: session = data.session;
</script>

<link
	rel="stylesheet"
	href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
/>
	<div class="h-screen flex flex-col">
		<div class="md:container h-20 md:mx-auto justify-center items-center">
			<AppBar class="rounded-b-3xl">
				<svelte:fragment slot="lead">
					<a href="/" class="material-symbols-outlined" style="font-size: {navHeight}rem">map</a>
					<a href="/" class="text-2xl">sailBlog</a>
				</svelte:fragment>
				<svelte:fragment slot="default">
					{#if user}
						{#if user.firstName && user.lastName}
							<button type="button" class="text-xl" on:click={() => {window.location.href = "/trips"}}>Trips</button>
							<span
								class="divider-vertical h-3"
							/>
						{/if}
					{/if}
				</svelte:fragment>
				<svelte:fragment slot="trail">
					{#if !user}
						<div class="btn-md btn variant-ghost-secondary">
							<a href="/sign_in"><button type="button" class="">Sign in!</button></a>
							<span
								class="divider-vertical h-6"
							/>
							<a href="/sign_up"><button type="button" class="">Sign up!</button></a>
						</div>
					{:else}
						<div
							class="btn-sm btn variant-ghost-secondary material-symbols-outlined"
							style="margin:0;"
						>
							<button on:click={changeDarkMode} style="font-size: {navHeight}rem"
								>{$modeCurrent ? 'dark_mode' : 'light_mode'}</button
							>
							<span
								class="divider-vertical h-8"
								style="border-color:rgb(var(--color-secondary-500)); margin:0; padding:0;"
							/>
							<a href="/sign_out" style="margin:0;padding:0;"
								><button type="button" style="font-size: {navHeight}rem">logout</button></a
							>
						</div>
						{#if user.firstName && user.lastName}
							<a href="/user" aria-label="Get to the Users page!"
								><Avatar
									initials={getInitials()}
									src={getPictureUrl()}
									background="bg-primary-500"
									width="w-11"
									link
									rounded="rounded-full"
								/></a
							>
						{:else}
							<a href="/user"><div class="placeholder-circle w-11" /></a>
						{/if}
					{/if}
				</svelte:fragment>
			</AppBar>
		</div>
		{#if $errorStore.status && $errorStore.status != 200}
			<div class="md:container md:mx-auto flex flex-row flex flex-col pt-3 rounded-t-3xl">
				<aside class="alert variant-ghost-warning text-warning-400-500-token">
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
						<button class="btn variant-filled-warning" on:click={resetError}>
							<span>Ok</span>
						</button>
					</div>
				</aside>
			</div>
		{/if}
		<div class="flex-grow min-h-0 flex flex-col">
			<slot />
		</div>
		<div
			class="container rounded-t-3xl mx-auto justify-center bg-surface-100-800-token"
			style="text-align: center"
		>
			<a href="https://github.com/derGraph">&copy; derGraph</a>
		</div>
	</div>

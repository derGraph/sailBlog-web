<script lang="ts">
	import '../app.css';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { onMount } from 'svelte';
	import errorStore from '$lib/errorStore';
	import { getProfilePicture } from '$lib/functions';
	import {dark} from '$lib/darkMode.svelte';
	import { page } from '$app/stores';

	let navHeight = 2;
	let { data, children } = $props();

	onMount(() => {
		const mode = localStorage.getItem('mode') || 'light';
		document.documentElement.setAttribute('class', mode);
		dark.mode = mode === 'dark';
	});

	function changeDarkMode() {
		const mode = dark.mode ? 'light' : 'dark';
		document.documentElement.setAttribute('class', mode);
		localStorage.setItem('mode', mode);
		dark.mode = !dark.mode;
	}

	function getPictureUrl() {
		return 'https://uapload.wikimedia.org/wikipedia/en/9/9a/Trollface_non-free.png';
	}

	function resetError() {
		$errorStore = new Response();
	}
	
	async function parseErrorResponse(response: Response) {
		try {
			return { kind: 'json', value: await response.clone().json() };
		} catch {
			try {
				return { kind: 'text', value: await response.clone().text() };
			} catch {
				return { kind: 'unknown', value: '' };
			}
		}
	}

	let user = $derived(data.user);
	let role = $derived(data.role);
	let session = $derived(data.session);
	let pathname = $derived($page.url.pathname);
</script>

<link
	rel="stylesheet"
	href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0"
/>
	<div class="h-dvh flex flex-col">
		<div class="md:container md:mx-auto">
			<AppBar class="rounded-b-3xl p-2">
				<AppBar.Toolbar class="grid-cols-[auto_1fr_auto]">
					<AppBar.Lead class="flex items-end">
						<a href="/" class="material-symbols-outlined" style="font-size: {navHeight}rem">map</a>
						<a href="/" class="text-2xl">sailBlog</a>
					</AppBar.Lead>

					<AppBar.Headline>
						{#if user?.username}
							<div class="inline-flex items-center">
								<button
									type="button"
									class={`px-4 py-1.5 text-sm font-semibold rounded-md hover:bg-surface-200-800 ${pathname.startsWith('/trips') ? 'underline underline-offset-4' : ''}`}
									onclick={() => {window.location.href = "/trips"}}
								>
									Trips
								</button>
								{#if role?.canCreateUser}
									<span class="mx-2 h-5 w-px bg-surface-400/60"></span>
									<button
										type="button"
										class={`px-4 py-1.5 text-sm font-semibold rounded-md hover:bg-surface-200-800 ${pathname.startsWith('/createUser') ? 'underline underline-offset-4' : ''}`}
										onclick={() => {window.location.href = "/createUser"}}
									>
										Create User
									</button>
								{/if}
							</div>
						{/if}
					</AppBar.Headline>

					<AppBar.Trail class="flex items-end">
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
									>{dark.mode ? 'dark_mode' : 'light_mode'}</button
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
								<a href="/user" class="grow flex flex-auto space-x-2 h-auto ml-1 items-center justify-center"
								aria-label="Get to the Users page!"
									><Avatar class="!size-[32px]">
										<Avatar.Image src={getProfilePicture(user)} class="!size-[32px]"/>
										<Avatar.Fallback>{user.firstName.charAt(0)+user.lastName.charAt(0)}</Avatar.Fallback>
										<!-- background="bg-primary-500"
										fallbackClasses="btn px-2"
										rounded="rounded-full" -->
									</Avatar>
								</a>
							{:else}
								<a href="/user" aria-label="profile Picture" ><div class="placeholder-circle !size-[32px]" ></div></a>
							{/if}
						{/if}
					</AppBar.Trail>

				</AppBar.Toolbar>
					
			</AppBar>
		</div>
		{#if $errorStore.status >= 400}
			<div class="md:container md:mx-auto px-3 pt-3">
				<aside class="alert preset-tonal-warning border border-warning-600 text-warning-900 dark:border-warning-500 dark:text-warning-200 rounded-2xl flex items-stretch gap-3">
					<div class="flex items-center self-stretch px-3">
						<span class="material-symbols-outlined leading-none" style="font-size: 4.5rem;">warning</span>
					</div>
					<div class="flex-1 flex flex-col">
						<div class="alert-message">
						{#await parseErrorResponse($errorStore)}
							<p class="text-base">{$errorStore.status} {$errorStore.statusText}</p>
						{:then parsed}
							{#if parsed.kind === 'json'}
								<p class="text-base">{$errorStore.status} {$errorStore.statusText}: {parsed.value?.message ?? JSON.stringify(parsed.value)}</p>
							{:else if parsed.kind === 'text'}
								<p class="text-base">{$errorStore.status} {$errorStore.statusText}: {parsed.value}</p>
							{:else}
								<p class="text-base">{$errorStore.status} {$errorStore.statusText}</p>
							{/if}
						{:catch parsingError}
							<p class="text-base">Error in response: {parsingError}</p>
						{/await}
						</div>
						<div class="alert-actions mt-2 flex justify-end pr-2 pb-2">
							<button class="btn preset-filled-warning-500" onclick={resetError}>
								<span>Ok</span>
							</button>
						</div>
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

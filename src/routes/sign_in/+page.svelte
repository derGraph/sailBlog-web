<script lang="ts">
	import { run } from 'svelte/legacy';
	import { onMount } from 'svelte';
	import { tick } from 'svelte';

	import errorStore from '$lib/errorStore.js';
	let { form } = $props();
	let magicLink = $state('');
	let magicLinkForm: HTMLFormElement | null = null;

	run(() => {
		if (form?.error) {
			$errorStore = new Response(
				JSON.stringify({
					message: form.error
				}),
				{
					statusText: 'Bad request!',
					status: 400
				}
			);
		}
	});

	onMount(() => {
		void (async () => {
			const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
			const params = new URLSearchParams(hash);
			const token = params.get('magicLink');
			if (token) {
				magicLink = token;
				// Ensure bound hidden input value is updated before submitting.
				await tick();
				// Remove token from the visible URL before request submission.
				window.history.replaceState({}, document.title, window.location.pathname);
				magicLinkForm?.requestSubmit();
			}
		})();
	});
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-900">
	<form method="post" action="?/magicLink" bind:this={magicLinkForm} class="hidden">
		<input name="magicLink" type="hidden" bind:value={magicLink} />
	</form>
	<form method="post" action="?/login" class="md:mx-auto max-w-max space-y-3.5">
		<h3 class="h3 md:mx-auto">Sign in!</h3>
		<label class="label">
			<span>Username/Email</span>
			<input name="identifier" class="input" type="text" placeholder="Username/Email" required />
		</label>
		<label class="label">
			<span>Password</span>
			<input name="password" class="input" type="password" placeholder="password" required />
		</label>
		<button type="submit" class="btn preset-filled">
			<span>Submit</span>
		</button>
	</form>
</div>

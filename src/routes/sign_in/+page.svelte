<script lang="ts">
	import { run } from 'svelte/legacy';

	import errorStore from '$lib/errorStore.js';
	let { form } = $props();

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
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-800-token">
	<form method="post" class="md:mx-auto max-w-max space-y-3.5">
		<h3 class="h3 md:mx-auto">Sign in!</h3>
		<label class="label">
			<span>Username/Email</span>
			<input name="identifier" class="input" type="text" placeholder="Username/Email" required />
		</label>
		<label class="label">
			<span>Password</span>
			<input name="password" class="input" type="password" placeholder="password" required />
		</label>
		<button type="submit" class="btn variant-filled">
			<span>Submit</span>
		</button>
	</form>
</div>

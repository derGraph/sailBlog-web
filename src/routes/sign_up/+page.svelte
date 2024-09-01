<script lang="ts">
	import errorStore from '$lib/errorStore.js';

	export let form;

	$: if (form?.error) {
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
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-800-token">
	<form method="post" class="md:mx-auto max-w-max space-y-3.5">
		<h3 class="h3 md:mx-auto">Sign up!</h3>
		<label class="label">
			<span>Username</span>
			<input name="username" class="input" type="text" placeholder="Username" required />
		</label>
		<label class="email">
			<span>Email</span>
			<input name="email" class="input" type="text" placeholder="Email" required />
		</label>
		<label class="label">
			<span>First Name</span>
			<input name="firstName" class="input" type="text" placeholder="First Name" required />
		</label>
		<label class="label">
			<span>Last Name</span>
			<input name="lastName" class="input" type="text" placeholder="Last Name" required />
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

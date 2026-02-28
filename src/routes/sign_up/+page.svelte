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

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-900">
	<form method="post" class="md:mx-auto max-w-max space-y-3.5">
		<h3 class="h3 md:mx-auto">Sign up!</h3>
		<div class="text-sm rounded-xl border border-surface-400 p-3 bg-surface-50-950/40">
			<p>
				<strong>DE:</strong> Die Registrierung ist nur fuer Personen ab 16 Jahren erlaubt. Mit der
				Registrierung akzeptierst du den
				<a class="underline" href="/terms">Nutzungsvertrag</a> und die
				<a class="underline" href="/privacy">Datenschutzerklaerung</a>.
			</p>
			<p class="mt-2">
				<strong>EN:</strong> Registration is only permitted for persons aged 16 or older. By
				registering, you accept the
				<a class="underline" href="/terms">Terms of Use</a> and
				<a class="underline" href="/privacy">Privacy Notice</a>.
			</p>
		</div>
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
		<label class="label flex flex-row items-start gap-2">
			<input name="ageConfirmed" type="checkbox" value="true" class="mt-1" required />
			<span>I confirm that I am at least 16 years old.</span>
		</label>
		<label class="label flex flex-row items-start gap-2">
			<input name="legalAccepted" type="checkbox" value="true" class="mt-1" required />
			<span>
				I accept the <a class="underline" href="/terms">Terms</a> and
				<a class="underline" href="/privacy">Privacy Notice</a>.
			</span>
		</label>
		<button type="submit" class="btn preset-filled">
			<span>Submit</span>
		</button>
	</form>
</div>

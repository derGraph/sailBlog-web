<script lang="ts">
	export let form;

	function resetForm() {
		form!.error = '';
	}
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-800-token">
	<form method="post" class="md:mx-auto max-w-max space-y-3.5">
		<h3 class="h3 md:mx-auto">Sign up!</h3>
		{#if form?.error}
			<aside class="alert variant-ghost-warning text-warning-400-500-token">
				<div class="material-symbols-outlined">warning</div>
				<div class="alert-message">
					<h3 class="h3">{form?.error}</h3>
				</div>
				<div class="alert-actions">
					<button class="btn variant-filled-warning" on:click={resetForm}>
						<span>Ok</span>
					</button>
				</div>
			</aside>
		{/if}
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

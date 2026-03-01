<script lang="ts">
	import { page } from '$app/stores';

	let { data } = $props();
	let requestedTrip = $derived(data.requestedTrip);
	let googlePhotosConfigured = $derived(data.googlePhotosConfigured);

	let imported = $derived(Number.parseInt($page.url.searchParams.get('imported') ?? '0', 10) || 0);
	let duplicates = $derived(Number.parseInt($page.url.searchParams.get('duplicates') ?? '0', 10) || 0);
	let nonImages = $derived(Number.parseInt($page.url.searchParams.get('nonImages') ?? '0', 10) || 0);
	let failed = $derived(Number.parseInt($page.url.searchParams.get('failed') ?? '0', 10) || 0);
	let total = $derived(Number.parseInt($page.url.searchParams.get('total') ?? '0', 10) || 0);
	let importError = $derived($page.url.searchParams.get('importError') ?? '');
</script>

<div class="h-full md:container md:mx-auto p-3 rounded table-container">
	<div class="rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700">
		<h2 class="h3">Import Google Photos</h2>
		<p class="text-sm text-surface-700-300 mt-1">
			Import images from a shared album into this trip.
		</p>
		<p class="text-xs text-surface-700-300 mt-1">
			Each imported image uses the Google Photo ID as <code>alt</code> to prevent duplicates on repeated imports.
		</p>

		{#if !googlePhotosConfigured}
			<div class="mt-3 rounded-xl border border-warning-500 bg-warning-100-900 p-3 text-sm">
				Google Photos is not configured on the server. Set
				<code>GOOGLE_PHOTOS_CLIENT_ID</code> and <code>GOOGLE_PHOTOS_CLIENT_SECRET</code>.
			</div>
		{/if}

		<form method="GET" action="/api/GooglePhotos/auth" class="mt-4 space-y-3">
			<input type="hidden" name="tripId" value={requestedTrip} />
			<label class="label">
				<span>Shared Album ID or Shared Album URL</span>
				<input
					class="input"
					name="albumId"
					required
					placeholder="Google Photos shared album ID or URL"
				/>
			</label>

			<label class="label">
				<span>Visibility for imported images</span>
				<select class="select" name="visibility">
					<option value="0">private</option>
					<option value="1" selected>logged in</option>
					<option value="2">public</option>
				</select>
			</label>

			<div class="flex flex-wrap gap-2">
				<button class="btn preset-tonal-primary border border-primary-500" type="submit" disabled={!googlePhotosConfigured}>
					<span class="material-symbols-outlined mr-1">photo_library</span>
					Connect and Import
				</button>
				<a class="btn preset-tonal border border-surface-500" href="/trips/uploadImages/{requestedTrip}">
					Back
				</a>
			</div>
		</form>
	</div>

	{#if total > 0 || importError}
		<div class="mt-3 rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700">
			<h3 class="h5">Last Import Result</h3>
			{#if importError}
				<p class="text-sm text-error-500 mt-1">{importError}</p>
			{:else}
				<div class="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
					<div class="rounded-xl border border-surface-300-700 p-2">Total seen: {total}</div>
					<div class="rounded-xl border border-success-500 p-2">Imported: {imported}</div>
					<div class="rounded-xl border border-warning-500 p-2">Duplicates: {duplicates}</div>
					<div class="rounded-xl border border-surface-300-700 p-2">Non-images: {nonImages}</div>
					<div class="rounded-xl border border-error-500 p-2">Failed: {failed}</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

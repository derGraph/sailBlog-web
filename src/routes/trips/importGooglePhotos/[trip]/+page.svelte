<script lang="ts">
	import errorStore from '$lib/errorStore';
	import { page } from '$app/stores';

	let { data } = $props();
	let requestedTrip = $derived(data.requestedTrip);
	let googlePhotosConfigured = $derived(data.googlePhotosConfigured);

	let pickerSessionId = $derived($page.url.searchParams.get('pickerSessionId') ?? '');
	let pickerUri = $derived($page.url.searchParams.get('pickerUri') ?? '');
	let importError = $derived($page.url.searchParams.get('importError') ?? '');

	let isImporting = $state(false);
	let importResult: null | {
		imported: number;
		duplicates: number;
		nonImages: number;
		failed: number;
		total: number;
	} = $state(null);

	let visibility = $state('1');
	let maxItemCount = $state('200');

	function openPicker() {
		if (!pickerUri) {
			return;
		}
		const autocloseUri = pickerUri.endsWith('/autoclose') ? pickerUri : `${pickerUri}/autoclose`;
		window.open(autocloseUri, '_blank', 'noopener,noreferrer');
	}

	async function importSelected() {
		if (!pickerSessionId) {
			return;
		}
		isImporting = true;
		importResult = null;

		const response = await fetch(
			`/api/GooglePhotos/import?pickerSessionId=${encodeURIComponent(pickerSessionId)}`,
			{ method: 'POST' }
		);
		isImporting = false;

		if (!response.ok) {
			$errorStore = response;
			return;
		}
		const payload = await response.json();
		if (!payload.ready) {
			$errorStore = new Response(JSON.stringify({ message: payload.message }), {
				status: 409,
				statusText: 'Selection Not Ready'
			});
			return;
		}
		importResult = payload;
	}
</script>

<div class="h-full md:container md:mx-auto p-3 rounded table-container">
	<div class="rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700">
		<h2 class="h3">Import Google Photos</h2>
		<p class="text-sm text-surface-700-300 mt-1">
			Use Google Photos Picker, select images, then import them into this trip.
		</p>
		<p class="text-xs text-surface-700-300 mt-1">
			Imported image <code>alt</code> is set to Google Photo ID for dedupe on repeated imports.
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
				<span>Visibility for imported images</span>
				<select class="select" name="visibility" bind:value={visibility}>
					<option value="0">private</option>
					<option value="1">logged in</option>
					<option value="2">public</option>
				</select>
			</label>
			<label class="label">
				<span>Max item count in picker session</span>
				<input class="input" name="maxItemCount" type="number" min="1" max="2000" bind:value={maxItemCount} />
			</label>

			<div class="flex flex-wrap gap-2">
				<button class="btn preset-tonal-primary border border-primary-500" type="submit" disabled={!googlePhotosConfigured}>
					<span class="material-symbols-outlined mr-1">link</span>
					Connect Google Photos
				</button>
				<a class="btn preset-tonal border border-surface-500" href="/trips/uploadImages/{requestedTrip}">
					Back
				</a>
			</div>
		</form>
	</div>

	{#if pickerSessionId && pickerUri}
		<div class="mt-3 rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700 space-y-3">
			<h3 class="h5">Picker Session Ready</h3>
			<p class="text-xs text-surface-700-300">Session: {pickerSessionId}</p>
			<div class="flex flex-wrap gap-2">
				<button class="btn preset-tonal-secondary border border-secondary-500" type="button" onclick={openPicker}>
					<span class="material-symbols-outlined mr-1">open_in_new</span>
					Open Google Photos Picker
				</button>
				<button class="btn preset-tonal-success border border-success-500" type="button" onclick={importSelected} disabled={isImporting}>
					<span class="material-symbols-outlined mr-1">{isImporting ? 'hourglass_top' : 'download'}</span>
					{isImporting ? 'Importing...' : 'Import Selected Items'}
				</button>
			</div>
			<p class="text-xs text-surface-700-300">
				After selecting items in the picker, return here and click "Import Selected Items".
			</p>
		</div>
	{/if}

	{#if importError}
		<div class="mt-3 rounded-3xl bg-surface-100-900 p-4 border border-error-500">
			<p class="text-sm text-error-500">{importError}</p>
		</div>
	{/if}

	{#if importResult}
		<div class="mt-3 rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700">
			<h3 class="h5">Last Import Result</h3>
			<div class="mt-2 grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
				<div class="rounded-xl border border-surface-300-700 p-2">Total seen: {importResult.total}</div>
				<div class="rounded-xl border border-success-500 p-2">Imported: {importResult.imported}</div>
				<div class="rounded-xl border border-warning-500 p-2">Duplicates: {importResult.duplicates}</div>
				<div class="rounded-xl border border-surface-300-700 p-2">Non-images: {importResult.nonImages}</div>
				<div class="rounded-xl border border-error-500 p-2">Failed: {importResult.failed}</div>
			</div>
		</div>
	{/if}
</div>

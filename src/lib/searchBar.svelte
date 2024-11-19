<script lang="ts">
	import { onMount } from "svelte";

    // Sample data for demonstration purposes
    let {displayed = $bindable(false), onSelected = function(id: string) {}, getList = (searchTerm: string) => Promise.resolve([] as String[])}:
        {displayed: boolean, onSelected: Function, getList: (searchTerm: string) => Promise<String[]>} = $props();

    let items: String[] = $state([]);
    let searchTerm = $state('');
    let filteredItems: String[] = $state([]);
    let isDropdownOpen = $state(true);
    let highlightedIndex = $state(-1); // To keep track of the currently highlighted item

    onMount(async () => {
      items = await getList('');
      filteredItems = items;
    });

    // Function to filter items based on search input
    async function handleInput() {
      isDropdownOpen = true; // Show dropdown when typing
      items = await getList(searchTerm);
      filteredItems = items.filter(item =>
        item.toLowerCase().includes(searchTerm.toLowerCase())
      );
      highlightedIndex = -1; // Reset the highlighted index when typing
    }

    function handleFocus() {
      isDropdownOpen = true; // Show dropdown when input is focused
    }

    function handleBlur() {
      // Close dropdown after a brief delay to allow clicking items
      setTimeout(() => {
        isDropdownOpen = false;
      }, 200);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isDropdownOpen || filteredItems.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          // Move highlight down
          highlightedIndex = (highlightedIndex + 1) % filteredItems.length;
          event.preventDefault();
          break;
        case 'ArrowUp':
          // Move highlight up
          highlightedIndex = (highlightedIndex - 1 + filteredItems.length) % filteredItems.length;
          event.preventDefault();
          break;
        case 'Enter':
          // Select the highlighted item if any
          if (highlightedIndex >= 0) {
            selectUser(filteredItems[highlightedIndex]);
          }
          event.preventDefault();
          break;
      }
    }

    function selectUser(item: String) {
      displayed = false;
      onSelected(item); // Notify parent or callback
    }

    $effect(() => {
      if (displayed) {
        document.getElementById('search')?.focus();
      }
    });
</script>

{#if displayed}
  <div class="relative w-32 mx-auto">
    <input
      type="text"
      id="search"
      placeholder="Search..."
      class="w-full px-3 py-1 input"
      bind:value={searchTerm}
      oninput={handleInput}
      onfocus={handleFocus}
      onblur={handleBlur}
      onkeydown={handleKeyDown}
    />

    {#if isDropdownOpen && filteredItems.length > 0}
      <ul class="absolute left-0 w-full mt-1 card rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
        {#each filteredItems as item, index}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li
            onclick={() => { selectUser(item); }}
            class="px-4 py-2 hover:bg-surface-600 cursor-pointer"
            class:hover={highlightedIndex === index}
            class:bg-surface-600={highlightedIndex === index}
          >
            {item}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

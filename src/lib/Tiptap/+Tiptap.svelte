<script lang="ts">
	import { run } from 'svelte/legacy';

	import { onMount, onDestroy } from 'svelte';
	import { Editor, isActive, mergeAttributes, type JSONContent } from '@tiptap/core';
	import Heading from '@tiptap/extension-heading';
	import Document from '@tiptap/extension-document';
	import Paragraph from '@tiptap/extension-paragraph';
	import Blockquote from '@tiptap/extension-blockquote';
	import HorizontalRule from '@tiptap/extension-horizontal-rule';
	import ImageResize from 'tiptap-extension-resize-image';
	import Typography from '@tiptap/extension-typography';
	import ListItem from '@tiptap/extension-list-item';
	import BulletList from '@tiptap/extension-bullet-list';
	import OrderedList from '@tiptap/extension-ordered-list';
	import TextAlign from '@tiptap/extension-text-align';
	import Text from '@tiptap/extension-text';
	import MediaPicker from '$lib/mediaPicker.svelte';

	let element: Element = $state();
	let editor: Editor = $state();
	let editing = true;
	interface Props {
		saveEditor: any;
		description?: string;
	}

	let { saveEditor, description = '' }: Props = $props();


	function setContent(description: string) {
		if (editor) {
			editor.commands.setContent(description);
		}
	}

	onMount(() => {
		editor = new Editor({
			element: element,
			extensions: [
				Document,
				Paragraph,
				ListItem,
				Text,
				Blockquote.configure({
					HTMLAttributes: {
						class: 'pl-3 border-l-8 border-secondary-500 bg-surface-300-600-token'
					}
				}),
				Heading.configure({ levels: [2, 3] }).extend({
					levels: [2, 3],
					renderHTML({ node, HTMLAttributes }) {
						const level = this.options.levels.includes(node.attrs.level)
							? node.attrs.level
							: this.options.levels[0];
						const classes = {
							2: 'h2 break-words',
							3: 'h3 break-words'
						};
						return [
							`h${level}`,
							mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
								class: `${classes[level as keyof typeof classes]}`
							}),
							0
						];
					}
				}),
				HorizontalRule.configure({
					HTMLAttributes: {
						class: '!border-secondary-500'
					}
				}),
				BulletList.configure({
					keepAttributes: true,
					keepMarks: true,
					itemTypeName: 'listItem',
					HTMLAttributes: {
						class: 'list-disc pl-5'
					}
				}),
				OrderedList.configure({
					keepAttributes: true,
					keepMarks: true,
					HTMLAttributes: {
						class: 'list-decimal pl-5'
					}
				}),
				TextAlign.configure({
					types: ['heading', 'paragraph']
				}),
				ImageResize.configure({
					inline: false,
					HTMLAttributes: {
						class: ''
					}
				}),
				Typography
			],
			editorProps: {
				attributes: {
					class: ''
				}
			},
			content: description,
			onTransaction: () => {
				// force re-render so `editor.isActive` works as expected
				editor = editor;
			}
		});
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	function save() {
		let html = editor.getHTML();
		saveEditor(html);
	}
	run(() => {
		setContent(description);
	});
</script>

<div class="bg-surface-200-700-token mx-3 rounded-3xl items-center px-4 py-3">
	{#if editing && editor}
		<div class="btn-group variant-ghost-secondary m-1 [&>*+*]:border-secondary-500">
			<button
				onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				class:active={editor.isActive('heading', { level: 2 })}
				class="!pl-1 !pr-1 !py-1 !text-end material-symbols-outlined"
				style="font-size: 1.5rem">title</button
			>
			<button
				onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
				class:active={editor.isActive('heading', { level: 3 })}
				class="!px-1 !py-1 material-symbols-outlined"
				style="font-size: 1.25rem">title</button
			>
			<button
				onclick={() => editor.chain().focus().setParagraph().run()}
				class:active={editor.isActive('paragraph')}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				style="font-size: 1rem">title</button
			>
			<button
				onclick={() => editor.chain().focus().toggleBlockquote().run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive('blockquote')}
				style="font-size: 1.5rem">read_more</button
			>
			<button
				onclick={() => editor.chain().focus().toggleBulletList().run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive('bulletList')}
				style="font-size: 1.5rem">format_list_bulleted</button
			>
			<button
				onclick={() => editor.chain().focus().toggleOrderedList().run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive('orderedList')}
				style="font-size: 1.5rem">format_list_numbered</button
			>
			<button
				onclick={() => editor.chain().focus().setTextAlign('left').run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive({ textAlign: 'left' })}
				style="font-size: 1.5rem">format_align_left</button
			>
			<button
				onclick={() => editor.chain().focus().setTextAlign('center').run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive({ textAlign: 'center' })}
				style="font-size: 1.5rem">format_align_center</button
			>
			<button
				onclick={() => editor.chain().focus().setTextAlign('right').run()}
				class="!px-1 !py-1 !py-1 material-symbols-outlined"
				class:active={editor.isActive({ textAlign: 'right' })}
				style="font-size: 1.5rem">format_align_right</button
			>
			<button
				onclick={() =>
					editor.commands.setImage({
						src: 'http://192.168.0.7:5173/api/Media/derGeisler/clwpdtde70001p0dvtj3lmwto.avif'
					})}
				class="!pl-1 !pr-2 !py-1 material-symbols-outlined"
				style="font-size: 1.5rem">add_photo_alternate</button
			>
		</div>
		<button
			onclick={save}
			class="!pl-1 !pr-2 !py-1 material-symbols-outlined"
			style="font-size: 1.5rem">save</button
		>
	{/if}

	<div bind:this={element}></div>
</div>

<style lang="css">
	button.active {
		background: rgb(var(--color-secondary-500));
	}
</style>

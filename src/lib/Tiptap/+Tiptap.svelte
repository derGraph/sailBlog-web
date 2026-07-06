<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, onDestroy } from 'svelte';
  import { Editor, mergeAttributes } from '@tiptap/core';
  import Heading from '@tiptap/extension-heading';
  import Document from '@tiptap/extension-document';
  import Paragraph from '@tiptap/extension-paragraph';
  import Blockquote from '@tiptap/extension-blockquote';
  import HorizontalRule from '@tiptap/extension-horizontal-rule';
  import Image from '@tiptap/extension-image';
  import Typography from '@tiptap/extension-typography';
  import ListItem from '@tiptap/extension-list-item';
  import BulletList from '@tiptap/extension-bullet-list';
  import OrderedList from '@tiptap/extension-ordered-list';
  import TextAlign from '@tiptap/extension-text-align';
  import Text from '@tiptap/extension-text';
  import MediaPicker from '$lib/mediaPicker.svelte';

  // Helper function to map our alignment keywords to standard CSS blocks
  function getAlignmentStyles(alignment: string) {
    if (alignment === 'center') {
      return 'display: block; margin-left: auto; margin-right: auto;';
    }
    if (alignment === 'right') {
      return 'display: block; margin-left: auto; margin-right: 0;';
    }
    // Default left alignment
    return 'display: block; margin-left: 0; margin-right: auto;';
  }

  // Custom Extended Resizable Image Extension
  const ResizableImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        width: {
          default: '100%',
          // 1. Export as inline style string with safety aspect ratios built in
          renderHTML: (attributes) => ({
            style: `width: ${attributes.width}; max-width: 100%; height: auto !important; ${getAlignmentStyles(attributes.alignment || 'left')}`
          }),
          // 2. Parse from inline style string on reload
          parseHTML: (element) => {
            return element.style.width || '100%';
          }
        },
        height: {
          default: 'auto',
          renderHTML: () => ({}), // Handled combined inside the width block above
          parseHTML: (element) => {
            return element.style.height || 'auto';
          }
        },
        alignment: {
          default: 'left',
          renderHTML: () => ({}), // Handled combined inside the width block above
          parseHTML: (element) => {
            // Infer alignment based on margins found in the inline style string
            const marginStyle = element.style.marginLeft;
            if (marginStyle === 'auto') {
              return element.style.marginRight === 'auto' ? 'center' : 'right';
            }
            return 'left';
          }
        }
      };
    },
    addNodeView() {
      return ({ node, theme, getPos, editor }) => {
        // Main structural block container
        const container = document.createElement('div');
        container.className = 'tiptap-resizable-image-wrapper'; 
        container.style.position = 'relative';
        container.style.maxWidth = '100%';

        // Set wrapper layout block alignments dynamically
        const align = node.attrs.alignment || 'left';
        if (align === 'center') {
          container.style.display = 'block';
          container.style.marginLeft = 'auto';
          container.style.marginRight = 'auto';
        } else if (align === 'right') {
          container.style.display = 'inline-block';
          container.style.float = 'right';
          container.style.marginLeft = 'auto';
          container.style.marginRight = '0';
        } else {
          container.style.display = 'inline-block';
          container.style.float = 'none';
          container.style.marginLeft = '0';
          container.style.marginRight = 'auto';
        }

        const img = document.createElement('img');
        img.src = node.attrs.src;
        img.style.width = node.attrs.width;
        img.style.height = 'auto'; // Fluid calculation prevents squishing in editor view window frames
        img.style.display = 'block';
        img.style.maxWidth = '100%';
        img.style.userSelect = 'none';

        container.style.width = node.attrs.width;
        container.appendChild(img);

        // Four corners configuration map
        const corners = [
          { name: 'tl', top: '-4px', left: '-4px', cursor: 'nwse-resize', xDir: -1 },
          { name: 'tr', top: '-4px', right: '-4px', cursor: 'nesw-resize', xDir: 1 },
          { name: 'bl', bottom: '-4px', left: '-4px', cursor: 'nesw-resize', xDir: -1 },
          { name: 'br', bottom: '-4px', right: '-4px', cursor: 'nwse-resize', xDir: 1 }
        ];

        corners.forEach((corner) => {
          const handle = document.createElement('div');
          handle.className = 'tiptap-image-resize-handle';

          // Placement styles
          handle.style.position = 'absolute';
          if (corner.top) handle.style.top = corner.top;
          if (corner.bottom) handle.style.bottom = corner.bottom;
          if (corner.left) handle.style.left = corner.left;
          if (corner.right) handle.style.right = corner.right;

          // Aesthetic styles matching your theme design
          handle.style.width = '12px';
          handle.style.height = '12px';
          handle.style.background = 'rgb(var(--color-secondary-500, 59 130 246))';
          handle.style.border = '2px solid #ffffff';
          handle.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
          handle.style.cursor = corner.cursor;
          handle.style.zIndex = '50';
          handle.style.borderRadius = '50%'; 

          container.appendChild(handle);

          // Multi-corner mouse drag calculations
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startWidth = img.clientWidth;
            const aspectRatio = img.naturalWidth / img.naturalHeight;

            // Calculate the absolute maximum width allowed by the parent canvas frame element
            const parentElement = container.parentElement || editor.view.dom;
            const maxAllowedWidth = parentElement.clientWidth;

            document.body.style.cursor = corner.cursor;

            const onMouseMove = (moveEvent: MouseEvent) => {
              // Calculate change in width based on direction vectors
              const deltaX = (moveEvent.clientX - startX) * corner.xDir;
              let currentWidth = startWidth + deltaX;

              // 1. Constrain minimum sizing threshold
              if (currentWidth < 50) currentWidth = 50;
              // 2. Bound maximum size to the canvas component container framework limit
              if (currentWidth > maxAllowedWidth) currentWidth = maxAllowedWidth;

              const nextWidth = `${currentWidth}px`;

              img.style.width = nextWidth;
              container.style.width = nextWidth;
            };

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove);
              document.removeEventListener('mouseup', onMouseUp);
              document.body.style.cursor = '';

              if (typeof getPos === 'function') {
                editor.commands.command(({ tr }) => {
                  tr.setNodeMarkup(getPos(), undefined, {
                    ...node.attrs,
                    width: img.style.width,
                    height: 'auto'
                  });
                  return true;
                });
              }
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
          });
        });

        return {
          dom: container,
          contentDOM: null,
          update: (updatedNode) => {
            if (updatedNode.type !== node.type) return false;
            img.src = updatedNode.attrs.src;
            img.style.width = updatedNode.attrs.width;
            container.style.width = updatedNode.attrs.width;

            const newAlign = updatedNode.attrs.alignment || 'left';
            if (newAlign === 'center') {
              container.style.display = 'block';
              container.style.marginLeft = 'auto';
              container.style.marginRight = 'auto';
            } else if (newAlign === 'right') {
              container.style.display = 'inline-block';
              container.style.float = 'right';
              container.style.marginLeft = 'auto';
              container.style.marginRight = '0';
            } else {
              container.style.display = 'inline-block';
              container.style.float = 'none';
              container.style.marginLeft = '0';
              container.style.marginRight = 'auto';
            }
            return true;
          }
        };
      };
    }
  });

  let element: Element | undefined = $state();
  let editor: Editor | undefined = $state();
  let editing = true;

  let isOpen = $state(false);
  interface Props {
    saveEditor: any;
    description: string | null;
    usernameToFetch?: string;
    canUpload?: boolean;
  }

  let { saveEditor, description = '', usernameToFetch = '', canUpload = true }: Props = $props();

  function setContent(description: string | null) {
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
            class: 'pl-3 border-l-8 border-secondary-500 bg-surface-300-700'
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
        ResizableImage,
        Typography
      ],
      editorProps: {
        attributes: {
          class: 'outline-none max-h-full min-h-96 overflow-auto text-wrap'
        }
      },
      content: description,
      onTransaction: () => {
        editor = editor;
      }
    });
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  function finishedImageUpload(owner: string, imageId: string) {
    editor
      ?.chain()
      .focus()
      .setImage({ src: '/api/Media/' + owner + '/' + imageId + '.avif' })
      .run();
  }

  function handleAlign(alignment: 'left' | 'center' | 'right') {
    if (!editor) return;

    if (editor.isActive('image')) {
      editor.commands.command(({ tr, state }) => {
        const { selection } = state;
        if (selection.node && selection.node.type.name === 'image') {
          tr.setNodeMarkup(selection.from, undefined, {
            ...selection.node.attrs,
            alignment
          });
        }
        return true;
      });
    } else {
      editor.chain().focus().setTextAlign(alignment).run();
    }
  }

  function save() {
    let html = editor?.getHTML();
    saveEditor(html);
  }
  $effect(() => {
    setContent(description);
  });
  let buttonClass = 'material-symbols-outlined p-1';
</script>

<div class="items-center h-full flex flex-col">
  {#if editing && editor}
    <div>
      <div
        class="rounded-full preset-tonal-secondary border border-secondary-500 [&>*+*]:border-secondary-500 flex overflow-hidden"
      >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          class={buttonClass +
            (editor.isActive('heading', { level: 2 }) ? ' !bg-secondary-200-800' : ' aaa')}
          style="font-size: 1.5rem">title</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          class:active={editor.isActive('heading', { level: 3 })}
          class={buttonClass}
          style="font-size: 1.25rem">title</button
        >
        <button
          onclick={() => editor?.chain().focus().setParagraph().run()}
          class:active={editor.isActive('paragraph')}
          class={buttonClass}
          style="font-size: 1rem">title</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleBlockquote().run()}
          class={buttonClass}
          class:active={editor.isActive('blockquote')}
          style="font-size: 1.5rem">read_more</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleBulletList().run()}
          class={buttonClass}
          class:active={editor.isActive('bulletList')}
          style="font-size: 1.5rem">format_list_bulleted</button
        >
        <button
          onclick={() => editor?.chain().focus().toggleOrderedList().run()}
          class={buttonClass}
          class:active={editor.isActive('orderedList')}
          style="font-size: 1.5rem">format_list_numbered</button
        >
        <button
          onclick={() => handleAlign('left')}
          class={buttonClass}
          class:active={editor.isActive({ textAlign: 'left' }) ||
            editor.isActive('image', { alignment: 'left' })}
          style="font-size: 1.5rem">format_align_left</button
        >
        <button
          onclick={() => handleAlign('center')}
          class={buttonClass}
          class:active={editor.isActive({ textAlign: 'center' }) ||
            editor.isActive('image', { alignment: 'center' })}
          style="font-size: 1.5rem">format_align_center</button
        >
        <button
          onclick={() => handleAlign('right')}
          class={buttonClass}
          class:active={editor.isActive({ textAlign: 'right' }) ||
            editor.isActive('image', { alignment: 'right' })}
          style="font-size: 1.5rem">format_align_right</button
        >
        <button onclick={() => (isOpen = true)} class={buttonClass} style="font-size: 1.5rem"
          >add_photo_alternate</button
        >
      </div>
      <button
        onclick={save}
        class="pl-1! pr-2! py-1! material-symbols-outlined"
        style="font-size: 1.5rem">save</button
      >
    </div>
  {/if}

  <div
    bind:this={element}
    class="overflow-hidden h-full w-full card p-2 m-1 preset-tonal-secondary border border-secondary-500"
  ></div>
  <MediaPicker {usernameToFetch} bind:isOpen onFinished={finishedImageUpload} {canUpload} />
</div>

<style lang="css">
  button.active {
    background: rgb(var(--color-secondary-500));
  }

  :global(.tiptap-resizable-image-wrapper) {
    margin: 12px 0;
    transition: outline 0.15s ease;
    outline: 2px solid transparent;
  }

  :global(.tiptap-resizable-image-wrapper:hover) {
    outline: 2px solid rgb(var(--color-secondary-500, 59 130 246));
  }

  :global(.tiptap-image-resize-handle) {
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  :global(.tiptap-resizable-image-wrapper:hover .tiptap-image-resize-handle) {
    opacity: 1;
  }
</style>
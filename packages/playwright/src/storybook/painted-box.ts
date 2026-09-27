import { type Box, clip, union } from './box';

export type { Box } from './box';

const MEDIA = new Set([
	'svg',
	'img',
	'canvas',
	'video',
	'input',
	'textarea',
	'button',
	'iframe',
]);

/**
 * The union of what is actually painted — text, media, a background, a border
 * or a shadow — so a small component is not lost in a blank viewport. Portals
 * (menus, dialogs, toasts) live in `body` too and are included.
 */
export function paintedBox(root: Element = document.body): Box | undefined {
	let box: Box | undefined;
	for (const element of root.querySelectorAll<HTMLElement>('*')) {
		if (!paints(element)) continue;
		const rect = visibleRect(element, root);
		if (!rect) continue;
		box = box ? union(box, rect) : rect;
	}
	return box;
}

/**
 * The element's rect clipped by every ancestor up to `root` that clips its
 * overflow: a scroller's or an editor's inner layer (Monaco's is 16,777,216px
 * wide) only shows what its viewport shows. Undefined when nothing is left.
 * Approximate on purpose: an absolutely positioned descendant is clipped by a
 * scroller that is not its containing block, which can only shrink the crop.
 */
function visibleRect(element: Element, root: Element): Box | undefined {
	let rect: Box | undefined = element.getBoundingClientRect();
	// A fixed element (a toast, an overlay) escapes every scroller around it.
	if (getComputedStyle(element).position === 'fixed') return rect;
	for (
		let ancestor = element.parentElement;
		rect && ancestor && ancestor !== root;
		ancestor = ancestor.parentElement
	) {
		const { overflowX, overflowY } = getComputedStyle(ancestor);
		if (overflowX === 'visible' && overflowY === 'visible') continue;
		rect = clip(rect, ancestor.getBoundingClientRect(), {
			x: overflowX !== 'visible',
			y: overflowY !== 'visible',
		});
	}
	return rect;
}

function paints(element: HTMLElement): boolean {
	const style = getComputedStyle(element);
	if (
		style.visibility === 'hidden' ||
		style.display === 'none' ||
		style.opacity === '0'
	) {
		return false;
	}
	if (MEDIA.has(element.tagName.toLowerCase())) return true;
	const hasText = [...element.childNodes].some(
		(node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
	);
	return (
		hasText ||
		style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
		style.backgroundImage !== 'none' ||
		style.boxShadow !== 'none' ||
		Number.parseFloat(style.borderTopWidth) > 0 ||
		Number.parseFloat(style.borderLeftWidth) > 0
	);
}

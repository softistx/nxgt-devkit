export type Box = { left: number; top: number; right: number; bottom: number };

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
		const rect = element.getBoundingClientRect();
		if (rect.width < 1 || rect.height < 1) continue;
		box = box
			? {
					left: Math.min(box.left, rect.left),
					top: Math.min(box.top, rect.top),
					right: Math.max(box.right, rect.right),
					bottom: Math.max(box.bottom, rect.bottom),
				}
			: {
					left: rect.left,
					top: rect.top,
					right: rect.right,
					bottom: rect.bottom,
				};
	}
	return box;
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

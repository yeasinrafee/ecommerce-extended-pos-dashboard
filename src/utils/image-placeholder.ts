export type InitialsPlaceholder = {
	initials: string;
	backgroundColor: string;
};

export function initialsPlaceholder(nameOrEmail?: string | null): InitialsPlaceholder {
	const source = (nameOrEmail ?? '').trim();

	if (!source) {
		return { initials: '', backgroundColor: 'var(--muted)' };
	}

	const parts = source.split(/\s+/).filter(Boolean);
	let initials = '';

	if (parts.length === 1) {
		initials = (parts[0][0] ?? '').toUpperCase();
	} else {
		const first = parts[0][0] ?? '';
		const last = parts[parts.length - 1][0] ?? '';
		initials = (first + last).toUpperCase();
	}

	const color = 'var(--muted)';

	return { initials, backgroundColor: color };
}

export default initialsPlaceholder;


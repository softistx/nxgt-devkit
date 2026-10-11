import { enableMocking } from '../../src/browser';

// The page's entry: `?mocks=1` starts the worker, as an app's flag would.
const enabled = new URLSearchParams(location.search).get('mocks') === '1';
const worker = await enableMocking({
	enabled,
	handlers: () => import('./handlers'),
});

const response = await fetch('/graphql', {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ query: '{ student(id: "7") { id name } }' }),
});
const text = await response.text();
document.body.dataset.worker = String(worker !== null);
document.body.dataset.status = String(response.status);
document.body.dataset.answer = text;

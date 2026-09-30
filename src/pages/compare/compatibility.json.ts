// The compatibility matrix as JSON, served from the same file the page renders.
import data from '../../data/compatibility.json';

export function GET() {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

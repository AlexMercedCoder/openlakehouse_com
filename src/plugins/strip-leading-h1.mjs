// Remark plugin: remove the first top-level H1 from markdown content.
// KB article pages render their own <h1>{title}</h1>, and the markdown body
// begins with the same '# title', producing a duplicate H1.
export default function stripLeadingH1() {
  return (tree) => {
    const idx = tree.children.findIndex(
      (node) => node.type === 'heading' && node.depth === 1
    );
    if (idx !== -1) tree.children.splice(idx, 1);
  };
}

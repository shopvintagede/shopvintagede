const API = 'https://api.github.com';

export const handler = async (event) => {
  const out = (c, b) => ({ statusCode: c, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  if (event.httpMethod !== 'POST') return out(405, { error: 'Nur POST erlaubt' });
  try {
    const { password, action, products, images = [] } = JSON.parse(event.body || '{}');
    if (!process.env.SHOP_ADMIN_PASSWORD || password !== process.env.SHOP_ADMIN_PASSWORD) return out(401, { error: 'Falsches Passwort' });

    const repo = process.env.GITHUB_REPO, branch = process.env.GITHUB_BRANCH || 'main';
    const gh = async (path, method = 'GET', body) => {
      const r = await fetch(`${API}/repos/${repo}${path}`, {
        method,
        headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'shop-admin' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || 'GitHub-Fehler');
      return j;
    };

    if (action === 'load') {
      const f = await gh('/contents/products.json?ref=' + branch);
      return out(200, { products: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')) });
    }

    if (action === 'save') {
      if (!Array.isArray(products)) return out(400, { error: 'Ungültige Daten' });
      const ref = await gh('/git/ref/heads/' + branch);
      const parent = ref.object.sha;
      const parentCommit = await gh('/git/commits/' + parent);
      const blob = async (content, encoding) => (await gh('/git/blobs', 'POST', { content, encoding })).sha;

      const tree = [{ path: 'products.json', mode: '100644', type: 'blob', sha: await blob(JSON.stringify(products, null, 1), 'utf-8') }];
      for (const im of images) {
        if (!/^Art\d+$/.test(im.folder) || ![1, 2, 3].includes(im.n)) continue;
        tree.push({ path: `images/${im.folder}/A${im.n}.jpeg`, mode: '100644', type: 'blob', sha: await blob(im.data, 'base64') });
      }
      const newTree = await gh('/git/trees', 'POST', { base_tree: parentCommit.tree.sha, tree });
      const commit = await gh('/git/commits', 'POST', { message: 'Shop-Admin: Artikel aktualisiert', tree: newTree.sha, parents: [parent] });
      await gh('/git/refs/heads/' + branch, 'PATCH', { sha: commit.sha });
      return out(200, { ok: true });
    }

    return out(400, { error: 'Unbekannte Aktion' });
  } catch (e) {
    return out(500, { error: e.message });
  }
};

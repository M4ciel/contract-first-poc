/** Stylesheet inlined in every portal page: no build step, no external CSS. */
export const PORTAL_STYLE = `
:root {
  --bg: #f7f8fa; --surface: #ffffff; --text: #1d2330; --muted: #5d6677; --border: #dfe3ea;
  --accent: #3157d5; --code-bg: #eef1f6;
  --stable: #1f7a4d; --beta: #2f6fb0; --alpha: #a35b00; --draft: #6b6f7a; --deprecated: #b3261e;
  --production: #1f7a4d; --experimental: #a35b00;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12151b; --surface: #1a1f27; --text: #e6e9ef; --muted: #9aa3b2; --border: #2c3340;
    --accent: #7d9bff; --code-bg: #232a35;
    --stable: #5cc68d; --beta: #6aa8e8; --alpha: #e3a34a; --draft: #a3a8b3; --deprecated: #f08a83;
    --production: #5cc68d; --experimental: #e3a34a;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.top { background: var(--surface); border-bottom: 1px solid var(--border); padding: 14px 16px; }
.brand { font-weight: 700; color: var(--text); }
main { max-width: 1040px; margin: 0 auto; padding: 24px 16px 48px; }
footer { max-width: 1040px; margin: 0 auto; padding: 16px; color: var(--muted); font-size: 14px; }
h1 { font-size: 30px; line-height: 1.2; margin: 4px 0 8px; }
h2 { font-size: 21px; margin: 36px 0 12px; }
.eyebrow { margin: 0; color: var(--muted); font-size: 13px; text-transform: uppercase; letter-spacing: .06em; }
.lead { font-size: 18px; color: var(--muted); max-width: 760px; }
.muted { color: var(--muted); font-weight: 400; }
.stats { color: var(--muted); }
.hero { padding: 8px 0 4px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
.card { display: flex; flex-direction: column; gap: 4px; padding: 14px; background: var(--surface);
  border: 1px solid var(--border); border-radius: 10px; color: var(--text); }
.card:hover { border-color: var(--accent); text-decoration: none; }
.card-kind { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600;
  vertical-align: middle; border: 1px solid currentColor; color: var(--muted); }
.badge-stable, .badge-production { color: var(--stable); }
.badge-beta { color: var(--beta); }
.badge-alpha, .badge-experimental { color: var(--alpha); }
.badge-draft { color: var(--draft); }
.badge-deprecated { color: var(--deprecated); }
.tag { display: inline-block; padding: 1px 8px; border-radius: 6px; background: var(--code-bg); font-size: 13px; }
.facts { display: grid; grid-template-columns: max-content 1fr; gap: 6px 20px; padding: 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
.facts dt { color: var(--muted); }
.facts dd { margin: 0; }
pre { background: var(--code-bg); padding: 12px 14px; border-radius: 8px; overflow-x: auto; font-size: 14px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .92em; }
.table-wrap { overflow-x: auto; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
th { font-size: 13px; color: var(--muted); font-weight: 600; }
tr.deprecated td { opacity: .7; }
.method { font-weight: 700; margin-right: 4px; }
.method-get { color: var(--beta); } .method-post { color: var(--stable); }
.method-put, .method-patch { color: var(--alpha); } .method-delete { color: var(--deprecated); }
.teams li { margin-bottom: 10px; }
.mermaid { background: var(--surface); border: 1px solid var(--border); text-align: center; }
.markdown { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px 18px; }
.markdown h1 { font-size: 22px; } .markdown h2 { font-size: 18px; margin-top: 20px; }
.markdown h3 { font-size: 16px; }
#asyncapi { background: #ffffff; color: #1d2330; border-radius: 10px; overflow: hidden; }
`;

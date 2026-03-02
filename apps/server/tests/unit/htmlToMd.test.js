const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { htmlToMarkdown } = require('../../src/lib/htmlToMd');

let document;

before(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    // Expose Node globals so htmlToMarkdown can reference Node.TEXT_NODE etc.
    global.Node = dom.window.Node;
    document = dom.window.document;
});

function convert(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return htmlToMarkdown(container);
}

describe('htmlToMarkdown', () => {
    it('converts plain paragraph', () => {
        assert.equal(convert('<p>Hello world</p>'), 'Hello world');
    });

    it('converts bold', () => {
        assert.ok(convert('<p><strong>bold</strong></p>').includes('**bold**'));
    });

    it('converts italic', () => {
        assert.ok(convert('<p><em>italic</em></p>').includes('*italic*'));
    });

    it('converts strikethrough', () => {
        assert.ok(convert('<p><del>removed</del></p>').includes('~~removed~~'));
    });

    it('converts inline code', () => {
        assert.ok(convert('<p>Use <code>foo()</code></p>').includes('`foo()`'));
    });

    it('converts code block with language', () => {
        const md = convert('<pre><code class="language-js">const x = 1;</code></pre>');
        assert.ok(md.includes('```js'));
        assert.ok(md.includes('const x = 1;'));
    });

    it('converts code block without language', () => {
        const md = convert('<pre><code>plain code</code></pre>');
        assert.ok(md.includes('```\n'));
        assert.ok(md.includes('plain code'));
    });

    it('converts h1', () => {
        assert.ok(convert('<h1>Title</h1>').includes('# Title'));
    });

    it('converts h2', () => {
        assert.ok(convert('<h2>Sub</h2>').includes('## Sub'));
    });

    it('converts h3', () => {
        assert.ok(convert('<h3>Deep</h3>').includes('### Deep'));
    });

    it('converts unordered list', () => {
        const md = convert('<ul><li>a</li><li>b</li></ul>');
        assert.ok(md.includes('- a'));
        assert.ok(md.includes('- b'));
    });

    it('converts ordered list', () => {
        const md = convert('<ol><li>first</li><li>second</li></ol>');
        assert.ok(md.includes('1. first'));
        assert.ok(md.includes('2. second'));
    });

    it('converts links', () => {
        assert.ok(convert('<a href="https://x.com">click</a>').includes('[click](https://x.com)'));
    });

    it('converts images', () => {
        assert.ok(convert('<img src="pic.png" alt="photo">').includes('![photo](pic.png)'));
    });

    it('converts blockquote', () => {
        assert.ok(convert('<blockquote>quoted</blockquote>').includes('> quoted'));
    });

    it('converts horizontal rule', () => {
        assert.ok(convert('<hr>').includes('---'));
    });

    it('converts line break', () => {
        assert.ok(convert('a<br>b').includes('a\nb'));
    });

    it('collapses multiple blank lines', () => {
        const md = convert('<p>a</p><p>b</p><p>c</p>');
        assert.ok(!md.includes('\n\n\n'));
    });

    it('handles nested bold inside paragraph', () => {
        const md = convert('<p>This is <strong>very</strong> important</p>');
        assert.ok(md.includes('**very**'));
    });

    it('handles empty element gracefully', () => {
        const md = convert('<div></div>');
        assert.equal(md, '');
    });

    // Table conversion uses element.innerText which requires a layout engine.
    // JSDOM doesn't fully support innerText on table cells, so this test
    // verifies table conversion only in the real browser (via integration tests).
    it('converts table (skipped — requires real browser for innerText)', { skip: true }, () => {
        const md = convert(
            '<table><tr><th>Name</th><th>Age</th></tr><tr><td>Alice</td><td>30</td></tr></table>'
        );
        assert.ok(md.includes('| Name | Age |'));
        assert.ok(md.includes('| --- | --- |'));
        assert.ok(md.includes('| Alice | 30 |'));
    });
});

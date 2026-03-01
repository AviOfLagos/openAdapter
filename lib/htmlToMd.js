/**
 * lib/htmlToMd.js
 *
 * Converts Claude's rendered HTML to Markdown.
 * The core function `htmlToMarkdown` is designed to be serialised and run
 * inside the browser via Playwright's page.evaluate(), so it must be
 * self-contained (no require / imports).
 */

/**
 * The serialisable converter — runs inside Chromium via page.evaluate().
 * Do NOT reference any Node.js globals here.
 *
 * @param {Element} rootEl  The Claude message container element
 * @returns {string}        Markdown string
 */
function htmlToMarkdown(rootEl) {
    const BLOCK_TAGS = new Set(['P', 'DIV', 'BLOCKQUOTE', 'PRE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'TR', 'THEAD', 'TBODY', 'HR', 'BR']);

    function processNode(node, ctx) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            // Inside code blocks, preserve raw text
            if (ctx.inCode) return text;
            if (ctx.inPre) return text;
            // Escape markdown characters in regular text
            // (but not aggressively — just the most dangerous ones)
            text = text.replace(/([\\`*_{}[\]()#+\-.!])/g, (m, c) => {
                // Only escape * _ ` ~
                if (['*', '_', '`', '~'].includes(c)) return '\\' + c;
                return c;
            });
            return text;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toUpperCase();
        const children = () => Array.from(node.childNodes).map(n => processNode(n, ctx)).join('');

        // --- Headings ---
        if (/^H[1-6]$/.test(tag)) {
            const level = parseInt(tag[1]);
            const prefix = '#'.repeat(level);
            return `\n\n${prefix} ${children().trim()}\n\n`;
        }

        // --- Bold ---
        if (tag === 'STRONG' || tag === 'B') {
            const inner = children().trim();
            return inner ? `**${inner}**` : '';
        }

        // --- Italic ---
        if (tag === 'EM' || tag === 'I') {
            const inner = children().trim();
            return inner ? `*${inner}*` : '';
        }

        // --- Strikethrough ---
        if (tag === 'S' || tag === 'DEL') {
            const inner = children().trim();
            return inner ? `~~${inner}~~` : '';
        }

        // --- Inline code ---
        if (tag === 'CODE' && node.parentElement.tagName !== 'PRE') {
            return '`' + node.textContent + '`';
        }

        // --- Code block ---
        if (tag === 'PRE') {
            const codeEl = node.querySelector('code');
            let lang = '';
            if (codeEl) {
                const cls = codeEl.className || '';
                const m = cls.match(/language-(\S+)/);
                if (m) lang = m[1];
            }
            const code = (codeEl || node).textContent;
            return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        }

        // --- Horizontal rule ---
        if (tag === 'HR') return '\n\n---\n\n';

        // --- Line break ---
        if (tag === 'BR') return '\n';

        // --- Links ---
        if (tag === 'A') {
            const href = node.getAttribute('href') || '';
            const inner = children().trim();
            if (!inner) return href;
            return href ? `[${inner}](${href})` : inner;
        }

        // --- Images ---
        if (tag === 'IMG') {
            const src = node.getAttribute('src') || '';
            const alt = node.getAttribute('alt') || 'image';
            return `![${alt}](${src})`;
        }

        // --- Blockquote ---
        if (tag === 'BLOCKQUOTE') {
            const inner = children().trim();
            return '\n\n' + inner.split('\n').map(l => '> ' + l).join('\n') + '\n\n';
        }

        // --- Lists ---
        if (tag === 'UL' || tag === 'OL') {
            const items = Array.from(node.children)
                .filter(c => c.tagName === 'LI')
                .map((li, i) => {
                    const isChecked = li.querySelector('input[type="checkbox"]')?.checked;
                    const hasCheckbox = li.querySelector('input[type="checkbox"]') !== null;
                    // Strip the checkbox input from rendering
                    let liCtx = { ...ctx, listType: tag, listIndex: i + 1 };
                    const innerText = Array.from(li.childNodes)
                        .filter(n => n.tagName !== 'INPUT')
                        .map(n => processNode(n, liCtx))
                        .join('').trim();
                    if (hasCheckbox) {
                        return (tag === 'UL' ? '- ' : `${i + 1}. `) + (isChecked ? '[x] ' : '[ ] ') + innerText;
                    }
                    return (tag === 'UL' ? '- ' : `${i + 1}. `) + innerText;
                });
            return '\n\n' + items.join('\n') + '\n\n';
        }

        // Skip bare LI (already handled above via parent)
        if (tag === 'LI') {
            return children();
        }

        // --- Tables ---
        if (tag === 'TABLE') {
            const rows = Array.from(node.querySelectorAll('tr'));
            if (rows.length === 0) return children();

            const mdRows = rows.map(row => {
                const cells = Array.from(row.querySelectorAll('th, td'));
                return '| ' + cells.map(c => c.innerText.trim().replace(/\n/g, ' ')).join(' | ') + ' |';
            });

            // Insert separator after header row
            const headerCells = Array.from(rows[0].querySelectorAll('th, td')).length;
            const separator = '| ' + Array(headerCells).fill('---').join(' | ') + ' |';
            mdRows.splice(1, 0, separator);

            return '\n\n' + mdRows.join('\n') + '\n\n';
        }

        // --- Table sub-elements handled by TABLE ---
        if (['THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'].includes(tag)) {
            return children();
        }

        // --- Paragraphs and block divs ---
        if (tag === 'P') {
            const inner = children().trim();
            return inner ? `\n\n${inner}\n\n` : '';
        }

        // --- Generic block elements ---
        if (BLOCK_TAGS.has(tag)) {
            return '\n' + children().trim() + '\n';
        }

        // --- Inline / span / unknown ---
        return children();
    }

    const raw = processNode(rootEl, {});

    // Normalize multiple blank lines to at most two
    return raw
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Exported for use with Playwright's page.evaluate().
 * Usage:
 *   const { htmlToMarkdown } = require('./lib/htmlToMd');
 *   const md = await page.evaluate(htmlToMarkdown, elementHandle);
 */
module.exports = { htmlToMarkdown };

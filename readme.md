# mdast-util-to-hast

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[**mdast**][mdast] utility to transform to [**hast**][hast].

> **Note**: You probably want to use [`remark-rehype`][remark-rehype].

## Install

[npm][]:

```sh
npm install mdast-util-to-hast
```

## Usage

Say we have the following `example.md`:

```markdown
## Hello **World**!
```

…and next to it, `example.js`:

```js
var inspect = require('unist-util-inspect')
var unified = require('unified')
var parse = require('remark-parse')
var vfile = require('to-vfile')
var toHast = require('mdast-util-to-hast')

var tree = unified()
  .use(parse)
  .parse(vfile.readSync('example.md'))

console.log(inspect(toHast(tree)))
```

Which when running with `node example` yields:

```txt
root[1] (1:1-2:1, 0-20)
└─ element[3] (1:1-1:20, 0-19) [tagName="h2"]
   ├─ text: "Hello " (1:4-1:10, 3-9)
   ├─ element[1] (1:10-1:19, 9-18) [tagName="strong"]
   │  └─ text: "World" (1:12-1:17, 11-16)
   └─ text: "!" (1:19-1:20, 18-19)
```

## API

### `toHast(node[, options])`

Transform the given [mdast][] [tree][] to a [hast][] [tree][].

##### Options

###### `options.allowDangerousHTML`

Whether to allow [`html`][mdast-html] nodes and inject them as raw HTML
(`boolean`, default: `false`).
Only do this when using [`hast-util-to-html`][to-html]
([`rehype-stringify`][rehype-stringify]) or [`hast-util-raw`][raw]
([`rehype-raw`][rehype-raw]) later: `raw` nodes are not a standard part of
[hast][].

###### `options.commonmark`

Set to `true` (default: `false`) to prefer the first when duplicate definitions
are found.
The default behaviour is to prefer the last duplicate definition.

###### `options.handlers`

Object mapping [mdast][] [nodes][mdast-node] to functions handling them.
Take a look at [`lib/handlers/`][handlers] for examples.

##### Returns

[`HastNode`][hast-node].

##### Notes

*   [`yaml`][mdast-yaml] and `toml` nodes are ignored (created by
    [`remark-frontmatter`][remark-frontmatter])
*   [`html`][mdast-html] nodes are ignored if `allowDangerousHTML` is `false`
*   [`position`][position]s are properly patched
*   Unknown nodes with [`children`][child] are transformed to `div` elements
*   Unknown nodes with `value` are transformed to [`text`][hast-text] nodes
*   [`node.data.hName`][hname] configures the hast element’s tag-name
*   [`node.data.hProperties`][hproperties] is mixed into the hast element’s
    properties
*   [`node.data.hChildren`][hchildren] configures the hast element’s children

##### Examples

###### `hName`

`node.data.hName` sets the tag-name of an element.
The following [mdast][]:

```js
{
  type: 'strong',
  data: {hName: 'b'},
  children: [{type: 'text', value: 'Alpha'}]
}
```

Yields, in [hast][]:

```js
{
  type: 'element',
  tagName: 'b',
  properties: {},
  children: [{type: 'text', value: 'Alpha'}]
}
```

###### `hProperties`

`node.data.hProperties` in sets the properties of an element.
The following [mdast][]:

```js
{
  type: 'image',
  src: 'circle.svg',
  alt: 'Big red circle on a black background',
  title: null
  data: {hProperties: {className: ['responsive']}}
}
```

Yields, in [hast][]:

```js
{
  type: 'element',
  tagName: 'img',
  properties: {
    src: 'circle.svg',
    alt: 'Big red circle on a black background',
    className: ['responsive']
  },
  children: []
}
```

###### `hChildren`

`node.data.hChildren` sets the children of an element.
The following [mdast][]:

```js
{
  type: 'code',
  lang: 'js',
  data: {
    hChildren: [
      {
        type: 'element',
        tagName: 'span',
        properties: {className: ['hljs-meta']},
        children: [{type: 'text', value: '"use strict"'}]
      },
      {type: 'text', value: ';'}
    ]
  },
  value: '"use strict";'
}
```

Yields, in [hast][] (**note**: the `pre` and `language-js` class are normal
`mdast-util-to-hast` functionality):

```js
{
  type: 'element',
  tagName: 'pre',
  properties: {},
  children: [{
    type: 'element',
    tagName: 'code',
    properties: {className: ['language-js']},
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: {className: ['hljs-meta']},
        children: [{type: 'text', value: '"use strict"'}]
      },
      {type: 'text', value: ';'}
    ]
  }]
}
```

## Security

Use of `mdast-util-to-hast` can open you up to a
[cross-site scripting (XSS)][xss] attack.
Embedded hast properties (`hName`, `hProperties`, `hChildren`), custom handlers,
and the `allowDangerousHTML` option all provide openings.

The following example shows how a script is injected where a benign code block
is expected with embedded hast properties:

```js
var code = {type: 'code', value: 'alert(1)'}

code.data = {hName: 'script'}
```

Yields:

```html
<script>alert(1)</script>
```

The following example shows how an image is changed to fail loading and
therefore run code in a browser.

```js
var image = {type: 'image', url: 'existing.png'}

image.data = {hProperties: {src: 'missing', onError: 'alert(2)'}}
```

Yields:

```html
<img src="missing" onerror="alert(2)">
```

The following example shows the default handling of embedded HTML:

```markdown
# Hello

<script>alert(3)</script>
```

Yields:

```html
<h1>Hello</h1>
```

Passing `allowDangerousHTML: true` to `mdast-util-to-hast` is typically still
not enough to run unsafe code:

```html
<h1>Hello</h1>
&#x3C;script>alert(3)&#x3C;/script>
```

If `allowDangerousHTML: true` is also given to `hast-util-to-html` (or
`rehype-stringify`), the unsafe code runs:

```html
<h1>Hello</h1>
<script>alert(3)</script>
```

Use [`hast-util-santize`][sanitize] to make the hast tree safe.

## Related

*   [`mdast-util-to-nlcst`](https://github.com/syntax-tree/mdast-util-to-nlcst)
    — Transform mdast to nlcst
*   [`hast-util-sanitize`](https://github.com/syntax-tree/hast-util-sanitize)
    — Sanitize hast nodes
*   [`hast-util-to-mdast`](https://github.com/syntax-tree/hast-util-to-mdast)
    — Transform hast to mdast
*   [`remark-rehype`](https://github.com/remarkjs/remark-rehype)
    — rehype support for remark
*   [`rehype-remark`](https://github.com/rehypejs/rehype-remark)
    — remark support for rehype

## Contribute

See [`contributing.md` in `syntax-tree/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [Code of Conduct][coc].
By interacting with this repository, organisation, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://img.shields.io/travis/syntax-tree/mdast-util-to-hast.svg

[build]: https://travis-ci.org/syntax-tree/mdast-util-to-hast

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-to-hast.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-to-hast

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-to-hast.svg

[downloads]: https://www.npmjs.com/package/mdast-util-to-hast

[size-badge]: https://img.shields.io/bundlephobia/minzip/mdast-util-to-hast.svg

[size]: https://bundlephobia.com/result?p=mdast-util-to-hast

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/join%20the%20community-on%20spectrum-7b16ff.svg

[chat]: https://spectrum.chat/unified/syntax-tree

[npm]: https://docs.npmjs.com/cli/install

[license]: license

[author]: https://wooorm.com

[contributing]: https://github.com/syntax-tree/.github/blob/master/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/master/support.md

[coc]: https://github.com/syntax-tree/.github/blob/master/code-of-conduct.md

[position]: https://github.com/syntax-tree/unist#positional-information

[tree]: https://github.com/syntax-tree/unist#tree

[child]: https://github.com/syntax-tree/unist#child

[mdast]: https://github.com/syntax-tree/mdast

[mdast-node]: https://github.com/syntax-tree/mdast#nodes

[mdast-yaml]: https://github.com/syntax-tree/mdast#yaml

[mdast-html]: https://github.com/syntax-tree/mdast#html

[hast]: https://github.com/syntax-tree/hast

[hast-text]: https://github.com/syntax-tree/hast#text

[hast-node]: https://github.com/syntax-tree/hast#nodes

[to-html]: https://github.com/syntax-tree/hast-util-to-html

[raw]: https://github.com/syntax-tree/hast-util-raw

[sanitize]: https://github.com/syntax-tree/hast-util-sanitize

[remark-rehype]: https://github.com/remarkjs/remark-rehype

[remark-frontmatter]: https://github.com/remarkjs/remark-frontmatter

[rehype-raw]: https://github.com/rehypejs/rehype-raw

[rehype-stringify]: https://github.com/rehypejs/rehype/tree/master/packages/rehype-stringify

[handlers]: lib/handlers

[hname]: #hname

[hproperties]: #hproperties

[hchildren]: #hchildren

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

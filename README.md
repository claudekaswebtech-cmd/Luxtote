# Luxtote

A Shopify theme for fashion and accessories stores, built on Online Store 2.0 with theme blocks, JSON templates and a lean asset footprint.

## Requirements

- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
- A Shopify development store
- Recommended: [Shopify Liquid for VS Code](https://shopify.dev/docs/storefronts/themes/tools/shopify-liquid-vscode)

## Development

Start a local preview connected to your development store:

```bash
shopify theme dev --store your-store.myshopify.com
```

Run Theme Check before every push:

```bash
shopify theme check
```

## Structure

```
.
├── assets      # critical.css and static files loaded on every page
├── blocks      # Theme blocks merchants can add, remove and reorder
├── config      # Global theme settings (settings_schema.json, settings_data.json)
├── layout      # theme.liquid and password.liquid
├── locales     # Storefront and theme editor translations
├── sections    # Page sections and section groups
├── snippets    # Reusable Liquid partials
└── templates   # JSON templates for each page type
```

## Global settings

| Group | What it controls |
| --- | --- |
| Typography | Primary, heading, subheading, body and accent fonts, sizes, line height, letter spacing |
| Logo and favicon | Main logo, inverse logo, widths, favicon |
| Layout | Page width, page margin, section spacing, grid spacing |
| Colors | Background, foreground, input radius and border |
| Buttons | Corner radius, border thickness, case |
| Product cards | Image ratio, hover image, vendor, sale and sold out badges |
| Variant picker | Dropdown, pills, color or image swatches |
| Cart | Drawer or page, order notes |
| Search | Search suggestions |
| Currency format | Currency code after prices |
| Animations | Reveal on scroll, image hover effect |
| Social media | Profile links |

Settings that map to a CSS value are exposed as custom properties in `snippets/css-variables.liquid`, for example `--button-radius`, `--section-spacing-desktop` and `--card-image-ratio`.

## Conventions

- **CSS and JavaScript** live inside each section, block or snippet using `{% stylesheet %}` and `{% javascript %}`. Only styles needed on every page go in `assets/critical.css`.
- **Translations:** all storefront text uses `{{ 'key' | t }}` with keys in `locales/en.default.json`. All theme editor labels use `t:` keys in `locales/en.default.schema.json`.
- **Snippets** start with a `{% doc %}` header that lists their parameters.
- **Text** in the theme editor and on the storefront uses sentence case.

## License

See [LICENSE.md](./LICENSE.md).

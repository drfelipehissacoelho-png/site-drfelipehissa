# CLAUDE.md — Site Dr. Felipe Hissa Coelho

## Project Overview

Professional medical practice website for Dr. Felipe Hissa Coelho, a plastic surgeon in Recife, Pernambuco, Brazil. The site is a **static HTML website** — no framework, no build tools, no package manager.

- **Language**: Portuguese (pt-BR)
- **Domain**: https://www.drfelipehissacoelho.com.br
- **Technology**: Pure HTML5, CSS3, vanilla JavaScript
- **Hosting**: Static file hosting (no server-side rendering)

---

## Repository Structure

```
site-drfelipehissa/
├── index.html                        # Main homepage (~1756 lines)
├── abdominoplastia-recife.html       # Procedure landing pages (10 files)
├── mamoplastia-recife.html
├── blefaroplastia-recife.html
├── cirurgia-face-recife.html
├── explante-recife.html
├── lipoaspiracao-recife.html
├── pos-bariatrica-recife.html
├── preenchimento-recife.html
├── rinoplastia-recife.html
├── toxina-botulinica-recife.html
├── img/
│   └── consultorio/                  # Office photos (.jpg and .webp)
├── procedure_svgs_refinados/         # SVG icons for each procedure (13 files)
├── robots.txt                        # SEO robots file
├── sitemap.xml                       # XML sitemap (11 URLs)
├── logo-*.png                        # Multiple logo variants
├── favicon.ico / favicon-32.png / favicon-64.png
├── hero-background.jpg               # Homepage hero image
├── dr-felipe-jaleco.jpeg/jpg         # Doctor photos
└── [Legacy version files]            # indexv1.html, indexv2.html, etc. (do not edit)
```

### Legacy Files (do not modify)
- `indexv1.html`, `indexv2.html`, `indexv5.html`, `index_v3_luxo.html`, `index versao 01.html`
- `bannerv1.png`, `logo_v1.png`

These are archived snapshots of previous design iterations kept for reference.

---

## No Build Process

There is **no build step**. No npm, yarn, webpack, Vite, or any other tooling. To "run" the site:
- Open any `.html` file directly in a browser, or
- Serve with any static file server (e.g., `python3 -m http.server 8080`)

No `package.json`, `tsconfig.json`, `tailwind.config.js`, or `.env` files exist or should be created.

---

## Design System (CSS Variables)

All CSS is **inline within each HTML file's `<style>` tag**. The design system uses CSS custom properties defined in `:root`:

```css
:root {
  --navy:      #0d2340;   /* Primary brand color */
  --navy-deep: #08182d;   /* Darker variant */
  --gold:      #b8913a;   /* Accent / CTA color */
  --gold-light:#d4a955;   /* Lighter accent */
  --white:     #ffffff;
  --off-white: #f8f6f2;
  --gray-light:#f0eeea;
  --gray:      #6b7280;
  --text:      #1a1a2e;   /* Primary text */
  --shadow:    0 18px 50px rgba(0, 0, 0, 0.18);
  --radius:    14px;
}
```

Always use these variables — never hardcode hex values for brand colors.

---

## Page Anatomy (index.html)

Each section uses an `id` for anchor navigation:

| Section ID       | Content                                    |
|------------------|--------------------------------------------|
| `#hero`          | Full-screen hero with CTA button           |
| `#sobre`         | Doctor bio, credentials, photo             |
| `#consultorio`   | Office photo gallery                       |
| `#avaliacoes`    | Patient testimonials / Google reviews      |
| `#procedimentos` | Procedure carousel (Swiper.js)             |
| `#videos`        | YouTube video playlist                     |
| `#paciente`      | Pre/post-op patient guidance               |
| `#contato`       | Contact CTA section                        |

---

## External Libraries (CDN only)

All dependencies are loaded via CDN — no local copies:

- **Google Fonts**: Playfair Display, Inter
- **Swiper.js**: Procedure carousel (`#procedimentos`)
- **Font Awesome**: Icon set
- **Google Analytics**: `gtag.js` with ID `G-HZQXP7GBXN`

Do not add npm packages or bundled assets. If a new library is needed, add it via CDN `<script>` or `<link>` tag.

---

## Hardcoded Business Data

The following values are embedded directly in HTML (no env vars):

| Data                   | Value                               |
|------------------------|-------------------------------------|
| WhatsApp / Phone       | `+55-81-99479-5101`                 |
| CRM                    | CRM-PE 15420                        |
| RQE                    | 18425                               |
| Google Analytics ID    | `G-HZQXP7GBXN`                     |
| Google Site Verify     | `kerHB19nDEP2zVgqs1F4Ugqmptd0M4SOB-lrpc6ftEk` |

If any of these values need updating, search all `.html` files for the old value and replace in each file.

---

## SEO Implementation

Each HTML page includes a full SEO block in `<head>`:

1. **Meta tags**: `description`, `keywords`, `author`, `robots`, canonical URL
2. **Open Graph**: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
3. **Twitter Cards**: `twitter:card`, `twitter:title`, etc.
4. **Schema.org structured data** (JSON-LD):
   - `Physician` schema on homepage
   - `MedicalProcedure` schema on procedure pages
   - `LocalBusiness` information with Recife, PE address
5. **sitemap.xml**: Must be updated if new pages are added
6. **robots.txt**: References the sitemap URL

When adding a new page, replicate this full SEO block and add the URL to `sitemap.xml`.

---

## CSS Conventions

- **All CSS lives inside `<style>` tags** within each HTML file — no external `.css` files
- **Mobile-first responsive**: Uses `clamp()` for fluid typography and CSS Grid/Flexbox layouts
- **Media queries**: Break at common widths (`768px`, `1024px`, `1200px`)
- **Naming**: BEM-like class names (`nav-logo`, `hero-text`, `btn-primary`, `section-title`)
- **Effects**: `backdrop-filter: blur()`, `linear-gradient`, `radial-gradient` used extensively for the luxury aesthetic
- **Typography**: Playfair Display for headings, Inter for body text

---

## JavaScript Conventions

- **Vanilla JS only** — no jQuery, no frameworks
- Scripts are inline in `<script>` tags at the bottom of `<body>`
- Scroll detection: navigation bar changes style on scroll
- Swiper.js initialization: in `#procedimentos` section
- WhatsApp float button: persistent across all pages

---

## Image Guidelines

- **Format**: Prefer `.webp` for photos; fallback `.jpg` kept alongside
- **Location**: Office/doctor photos in `img/consultorio/`; other images at root level
- **SVG icons**: Procedure icons in `procedure_svgs_refinados/`
- **Do not commit large unoptimized images** — convert to WebP before adding

---

## Procedure Pages Pattern

Each procedure page (e.g., `abdominoplastia-recife.html`) follows this structure:

1. Same `<head>` SEO block as homepage (with procedure-specific title/description/schema)
2. Same navigation bar (copy exactly from `index.html`)
3. Procedure hero section
4. Candidate/indication section
5. Before/after expectations
6. Recovery and care
7. CTA / contact section
8. Same footer + WhatsApp button (copy exactly from `index.html`)

When updating the nav or footer in `index.html`, apply the same changes to all 10 procedure pages.

---

## Workflow for Common Tasks

### Adding a new procedure page
1. Copy an existing procedure HTML file (e.g., `rinoplastia-recife.html`)
2. Update all SEO meta tags, Schema.org data, and page title
3. Update content sections with procedure-specific text
4. Add SVG icon to `procedure_svgs_refinados/` if needed
5. Add the new page to `sitemap.xml`
6. Add a link/card to the `#procedimentos` section in `index.html`

### Updating navigation or footer
- Edit in `index.html` first, then apply the same change to all 10 procedure pages
- Search for the nav/footer HTML structure across files to find all instances

### Updating contact information
- Search all `.html` files for the phone number / WhatsApp link
- Update every occurrence (typically in the float button, contact section, and footer)

### Adding images
1. Optimize to WebP format first
2. Keep a `.jpg` fallback if needed for compatibility
3. Place in `img/consultorio/` for office photos, or root for general assets

---

## Git Branch Convention

- **`main`**: Production branch
- **`claude/<description>`**: Feature branches for AI-assisted changes

Commit messages are in Portuguese (informal, brief), matching the existing history style.

---

## What NOT to Do

- Do not introduce any build tooling (npm, webpack, Vite, etc.)
- Do not create separate `.css` or `.js` files — keep styles and scripts inline
- Do not use TypeScript or JSX
- Do not add a `package.json`
- Do not edit legacy version files (`indexv1.html`, `indexv2.html`, etc.)
- Do not hardcode colors or fonts outside the CSS variable system
- Do not remove the Schema.org structured data blocks from any page
- Do not update the sitemap without adding/removing a page

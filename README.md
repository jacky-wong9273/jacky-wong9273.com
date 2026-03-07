# jacky-wong9273.com

My personal portfolio and blog — built with [Astro](https://astro.build), authored in MDX, and deployed on [Cloudflare Pages](https://pages.cloudflare.com).

**Live:** [https://jacky-wong9273.com](https://jacky-wong9273.com)

## Tech Stack

- **Framework:** Astro (static output)
- **Content:** MDX via Astro Content Collections
- **Language:** TypeScript
- **Styling:** Vanilla CSS with custom properties
- **Deployment:** Cloudflare Pages (auto-deploys on push to `main`)

## Project Structure

```
src/
├── components/       # Reusable Astro components
│   └── icons/        # SVG icon components
├── content/
│   ├── profile.ts    # Centralised profile data (education, experience, certs)
│   ├── blogs/        # Blog posts (.mdx)
│   └── projects/     # Project write-ups (.mdx)
├── layouts/          # Page layouts and <head> config
├── pages/            # File-based routing
│   ├── blogs/        # /blogs and /blogs/[slug]
│   └── projects/     # /projects and /projects/[slug]
└── styles/           # Global CSS
```

## Getting Started

```sh
pnpm install
pnpm dev          # http://localhost:4321
```

## Commands

| Command        | Action                                 |
| :------------- | :------------------------------------- |
| `pnpm dev`     | Start dev server at `localhost:4321`   |
| `pnpm build`   | Build production site to `./dist/`     |
| `pnpm preview` | Preview production build locally       |

## Deployment

Cloudflare Pages is connected to this repository. Every push to `main` triggers an automatic build and deploy.

Build configuration:
- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Node.js version:** 22

## License

Content and code in this repository are personal work. All rights reserved.

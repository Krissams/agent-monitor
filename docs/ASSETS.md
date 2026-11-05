# Artwork and screenshots

## Animated SVG characters

The role artwork and shared mascot geometry are project-authored SVG code in `public/roles.js`, `public/mascot.js`, and `public/outfits.js`, with motion in `public/style.css`. The twenty workspaces, tools, clothing/accessories, and laptop badges are included under the project's MIT license.

The characters are intentionally decorative. Typing and thinking poses illustrate a working state; they are not a claim about a model's current internal action or reasoning.

## Sleeping illustration

`public/assets/sleeping-agent.png` is an AI-generated illustration created for Agent Monitor using OpenAI image generation, based on the project's cream-robot, hoodie, headset, and lavender-studio visual direction. Its prompt/provenance note is in `public/assets/sleeping-agent.md`. It is distributed with this project under the MIT license, without a claim of exclusivity over AI-generated visual elements.

The supplied dashboard reference image used during local prototyping is not included in this repository. The fallback, working, and attention characters use project SVGs instead.

## Screenshots

Files in `docs/screenshots/` show the actual interface with fictional demo data or the character gallery. They contain no private Codex conversation titles, progress snippets, user answers, or local filesystem paths.

To reproduce the dashboard screenshots:

```sh
python3 server.py --demo --port 4318
```

Open the demo in a browser, select Light or Dark, and capture the page. For the style collection, capture `/variants`. Screenshots are still frames from an animated interface.

When contributing new screenshots, use demo mode and review them before publication. Do not replace these with screenshots of private work.

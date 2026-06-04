This folder now uses a per-page subfolder structure. To change images for a page,
drop or replace the `background.svg` file inside the page folder.

Recommended structure:
- images/pages/home/background.svg
- images/pages/history/background.svg
- images/pages/uniforms/background.svg
- images/pages/weaponry/background.svg
- images/pages/contact/background.svg

Shared assets:
- images/pages/shared/soldier-silhouettes.svg (used as a faint background overlay)

If you prefer different filenames, update the `img` `src` in the matching HTML
page (e.g., `home.html`, `clothing.html`, `weaponry.html`, `history.html`, `contact.html`) or
adjust the CSS background-image URL in `css/style.css`.

# Phase 0: CI/CD — GitHub Actions + HTML5 Web Export

## Goal
Every push to `main` automatically:
1. Exports the Godot project to HTML5
2. Deploys it to GitHub Pages
3. Gives you a live playable URL to share and test

Every push to any other branch:
1. Builds the HTML5 export (verifies it compiles)
2. Does NOT deploy (just validates the build)

---

## How It Works

```
You push a commit
    → GitHub Actions starts
        → Spins up Ubuntu runner
        → Installs Godot 4 + HTML5 export templates
        → Runs: godot --headless --export-release "HTML5" build/index.html
        → On main: deploys build/ to GitHub Pages
        → You get: https://{your-username}.github.io/{repo-name}/
```

---

## Step 1: Enable GitHub Pages

In your GitHub repo:

1. **Settings → Pages**
2. Source: **GitHub Actions** (not a branch)
3. Save

That's it. The workflow below handles the deployment.

---

## Step 2: Create the Workflow File

Create this file in your Godot project root (NOT in one_app — in the Godot project you'll create):

```
survivor_deckbuilder/
└── .github/
    └── workflows/
        └── export.yml
```

```yaml
# .github/workflows/export.yml
name: Export & Deploy

on:
  push:
    branches:
      - main        # deploy on main
      - '**'        # build-check on all branches
  pull_request:
    branches:
      - main

env:
  GODOT_VERSION: "4.3"
  EXPORT_NAME: "survivor_deckbuilder"

jobs:
  export-html5:
    name: HTML5 Export
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout your code
      - name: Checkout
        uses: actions/checkout@v4
        with:
          lfs: true  # if you use Git LFS for large sprites/assets

      # 2. Install Godot 4 + export templates
      - name: Install Godot
        uses: chickensoft-games/setup-godot@v2
        with:
          version: ${{ env.GODOT_VERSION }}
          use-dotnet: false          # GDScript project, not C#
          include-templates: true    # downloads HTML5 export templates

      # 3. Import project assets (Godot needs this before export)
      - name: Import project
        run: |
          godot --headless --import --quit || true
        working-directory: ./

      # 4. Export HTML5
      - name: Export HTML5
        run: |
          mkdir -p build/html5
          godot --headless \
            --export-release "HTML5" \
            "build/html5/index.html" \
            --quit
        working-directory: ./

      # 5. Upload build artifact (available for download on any branch)
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: html5-export
          path: build/html5/
          retention-days: 7

      # 6. Deploy to GitHub Pages (main branch only)
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: build/html5/
          cname: ""   # leave blank unless you have a custom domain
```

---

## Step 3: Create the Export Preset

Godot needs an export configuration file in your project. Create it at the project root:

```
# export_presets.cfg
[preset.0]

name="HTML5"
platform="Web"
runnable=true
dedicated_server=false
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
export_path="build/html5/index.html"
encryption_include_filters=""
encryption_exclude_filters=""
encrypt_pck=false
encrypt_directory=false

[preset.0.options]

custom_template/debug=""
custom_template/release=""
variant/extensions_support=false
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=""
html/head_include=""
html/canvas_resize_policy=1      # 1 = Adaptive (fits to browser window)
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=false
progressive_web_app/enabled=false
progressive_web_app/offline_page=""
progressive_web_app/display=1
progressive_web_app/orientation=1   # 1 = Portrait
progressive_web_app/icon_144x144=""
progressive_web_app/icon_180x180=""
progressive_web_app/icon_512x512=""
progressive_web_app/background_color=Color(0, 0, 0, 1)
```

**OR** create it in the Godot editor:
1. **Project → Export**
2. **Add** → **Web**
3. Name it `HTML5`
4. Export path: `build/html5/index.html`
5. **Save** — this writes `export_presets.cfg` automatically

---

## Step 4: Add a .gitignore

```gitignore
# .gitignore (in your Godot project root)

# Godot cache
.godot/
*.import

# Build output (CI builds it, don't commit it)
build/

# Editor files
.DS_Store
Thumbs.db

# GDScript analysis
.gdignore
```

---

## Step 5: Verify the Workflow

Push your first commit with the workflow file:

```bash
git add .github/ export_presets.cfg .gitignore
git commit -m "Add CI/CD: GitHub Actions HTML5 export + Pages deploy"
git push origin main
```

Go to **GitHub → Actions tab** → watch the workflow run.

On success:
- **Any branch**: Build artifact downloadable from the Actions run
- **main branch**: Live at `https://{username}.github.io/{repo-name}/`

---

## What Each Commit Gives You

| Branch | Build | Deploy | URL |
|--------|-------|--------|-----|
| `main` | ✓ | ✓ | `https://username.github.io/survivor/` |
| `feature/*` | ✓ | ✗ | Download artifact from Actions tab |
| Pull Request | ✓ | ✗ | Build status shows in PR checks |

---

## Debugging CI Failures

**"Export templates not found"**
→ The `include-templates: true` flag in `setup-godot` handles this. If it still fails, pin a specific Godot version: `version: "4.3.1"`.

**"Cannot open file" errors during import**
→ The `--import --quit` step needs to finish. Add `|| true` to not fail on warnings (already in the workflow above).

**"Black screen" in the deployed HTML5**
→ In Project Settings → Display → Window, ensure **Stretch Mode** is `canvas_items`, **Stretch Aspect** is `expand`. See Phase 1 for mobile-specific window settings.

**Cross-origin audio/asset issues in browser**
→ Add this to a `build/html5/.htaccess` (if on Apache) or configure COOP/COEP headers. GitHub Pages works fine with Godot HTML5 without this.

---

## Optional: Build Badge in README

```markdown
![Build](https://github.com/{username}/{repo}/actions/workflows/export.yml/badge.svg)
```

---

## Next

[Phase 1: Project Setup & Grid (Mobile-First) →](./phase-1-setup-and-grid.md)

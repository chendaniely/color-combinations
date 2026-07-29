NPM := npm

.PHONY: help install dev test test-browser install-browser build preview update-data clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-16s %s\n", $$1, $$2}'

install: ## Install dependencies (needs Node.js >= 20 — see README)
	$(NPM) install
	$(NPM) run copy-mediapipe

dev: ## Run the site locally with live reload
	$(NPM) run dev

test: ## Run all tests once (fast — no browser needed)
	$(NPM) test

install-browser: ## One-time: download the browser the layout tests drive
	npx playwright install chromium

test-browser: ## Run the real-browser tests (needs `make install-browser` first)
	npx playwright test

build: ## Typecheck and build the production site into dist/
	$(NPM) run build

preview: ## Serve the built dist/ locally
	$(NPM) run preview

update-data: ## Re-download source data and regenerate data/processed/
	curl -fsSL https://sanzo-wada.dmbk.io/assets/colors.json -o data/raw/colors.json
	date +%F > data/raw/retrieved-on.txt
	$(NPM) run ingest

clean: ## Remove build output, copied assets, and installed dependencies
	rm -rf dist node_modules public/mediapipe

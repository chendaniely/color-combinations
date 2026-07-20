NPM := npm

.PHONY: help install dev test build preview clean

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-14s %s\n", $$1, $$2}'

install: ## Install dependencies (needs Node.js >= 20 — see README)
	$(NPM) install

dev: ## Run the site locally with live reload
	$(NPM) run dev

test: ## Run all tests once
	$(NPM) test

build: ## Typecheck and build the production site into dist/
	$(NPM) run build

preview: ## Serve the built dist/ locally
	$(NPM) run preview

clean: ## Remove build output and installed dependencies
	rm -rf dist node_modules

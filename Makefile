.PHONY: setup deploy deploy-all list-workflows build

setup: ## First-time setup: create credentials + workflows on n8n
	python3 n8n/deploy.py --setup

deploy-all: ## Deploy all workflows to n8n
	python3 n8n/deploy.py

deploy-%: ## Deploy a specific workflow (e.g. make deploy-02-pr-ai-review)
	python3 n8n/deploy.py $*

build-%: ## Build a specific workflow JSON to stdout (e.g. make build-02-pr-ai-review)
	python3 n8n/deploy.py --build-only $*

list-workflows: ## List available workflows and their IDs
	python3 n8n/deploy.py --list

help: ## Show this help
	@grep -E '^[a-zA-Z_%-]+:.*##' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'

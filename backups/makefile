REGISTRY ?= https://registry.npmjs.org/
ARGS ?=

export npm_config_registry := $(REGISTRY)
export pnpm_config_registry := $(REGISTRY)

.PHONY: install
install:
	@echo "registry: $(REGISTRY)"
	pnpm i $(ARGS)

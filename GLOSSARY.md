# Foundry

Foundry's model-connection context. These terms describe how the application names, discovers, and references model services.

## Provider

**Provider**:
A named, uniquely identified connection configuration for a model service, bound to one supported request protocol. A Provider is not a vendor account and is not a model.
_Avoid_: Provider Profile, vendor account

**Protocol**:
The request contract a Provider uses: OpenAI Responses, Anthropic Messages, or OpenAI-compatible Chat Completions.
_Avoid_: vendor, provider type (when the protocol is meant)

**Remote model**:
A model identifier fetched from a Provider's model-discovery request for the current Provider form session. Remote models are transient, refreshed when connection fields change or the user fetches models, and are not persisted.
_Avoid_: fetched model, saved model

**Custom model**:
A model identifier and optional display name entered by the user and persisted on a Provider as a fallback or extension to the current remote model list.
_Avoid_: manual model (in persisted data)

**Provider usage**:
An application setting that references a Provider by ID for a feature or service. A Provider cannot be disabled or logically deleted while a setting still uses it.
_Avoid_: default Provider, current Provider

**Disabled Provider**:
A Provider retained in storage but excluded from new use until it is enabled again.
_Avoid_: inactive Provider

**Deleted Provider**:
A logically deleted Provider retained in storage for references and audit history, but excluded from normal Provider listings and new use.
_Avoid_: permanently deleted Provider

## Collection

**Capture**:
A user-created saved record for a link in Foundry. A Capture preserves the user's original URL and may later receive fetched page information; it is not yet a curated concept or grouped collection.
_Avoid_: Item (for an unorganized Capture), Source (when referring to the Foundry record)

**Library**:
Foundry's product area for saved reusable material, including Prompts and Captures. Library is not a model-service Provider.

**Fetcher**:
A configured external service used by a Scrape Job to retrieve page information. A Fetcher is not a model-service Provider.

**Scrape Job**:
A background operation that retrieves page information for a Capture using the currently configured fetcher. A Capture may have multiple Scrape Jobs over its lifetime.

**Latest Scrape Job**:
The most recently created Scrape Job for a Capture, regardless of whether it succeeded or failed. It represents the Capture's current fetch activity.

**Latest Successful Scrape Job**:
The most recent Scrape Job that successfully produced page content for a Capture. Its result is the current captured content for that Capture.

**Successful Capture**:
A Capture with at least one successful Scrape Job. This is a derived condition rather than a persisted Capture status.
_Avoid_: capturable, fetched Capture

**Re-capture**:
A user-triggered request to create a new Scrape Job for an existing Capture. Re-capture refreshes the captured page data regardless of whether the previous job succeeded or failed.

# Foundry

Foundry manages a canonical local collection of agent skills and makes selected skills available to local agent environments.

## Language

**Skill Package**:
A self-contained directory containing a skill manifest and any supporting resources. It is the unit that Foundry imports and distributes.
_Avoid_: Skill definition, skill file

**Recognized Skill Package**:
A directory whose root contains an entry named exactly `SKILL.md`. Recognition makes no claim about the contents or metadata of that entry.
_Avoid_: Valid skill, reviewed skill

**Skill ID**:
A stable identity assigned by Foundry to a Skill Package, independent of its name, source, and current contents.
_Avoid_: Skill name, directory name

**Skill Name**:
The logical name declared by a Skill Package for use within a Distribution Target. It is not globally unique within the Skill Store.
_Avoid_: Skill ID

**Distribution Name**:
The stable directory name Foundry uses when creating new Skill Installations for a Skill Package. It is initially derived from the manifest name when readable, otherwise from the imported directory name, and does not change automatically when Stored Skill Content changes.
_Avoid_: Skill ID, display name

**Skill Source**:
An origin from which a Skill Package was obtained. A Skill Package may retain multiple Skill Sources when identical content is available from more than one origin.
_Avoid_: Repository, registry

**Tracked Source**:
A Skill Source whose moving branch, channel, or tag is compared during an Update Check. Each imported result still records the exact remote revision that was fetched.
_Avoid_: Automatic update, current version

**Fixed Source**:
A Skill Source pinned to an immutable commit or exact registry version and therefore excluded from Update Checks.
_Avoid_: Tracked Source

**Unavailable Source**:
A Skill Source that Foundry can no longer resolve or access. Its failure does not remove the associated Skill Package, Stored Skill Content, or Skill Installations.
_Avoid_: Deleted skill, missing package

**Local Package**:
A Skill Package that has no remaining remote Skill Source. Its Stored Skill Content is an import snapshot that remains distributable but is not updated in the current product scope.
_Avoid_: Unsourced skill, local installation

**Git Source**:
A Skill Source identified by a Git remote and the path of a Recognized Skill Package within that repository.
_Avoid_: Git repository

**Skill Registry**:
A remote Skill Source that owns searchable package identities and their published revisions. ClawHub is the initial supported Skill Registry.
_Avoid_: Skill Directory, Distribution Target

**Skill Directory**:
A searchable remote index that points to packages owned by other Skill Sources. It is not a package or revision authority.
_Avoid_: Skill Registry, marketplace

**Skill Store**:
The canonical local collection of Skill Packages whose contents can be changed only through Foundry operations. Skill Installations are derived from packages in this collection.
_Avoid_: Skill library, skill registry

**Stored Skill Content**:
The authoritative content of a Skill Package held in an application-private representation within the Skill Store. It is not exposed as an editable package directory.
_Avoid_: Store Working Copy, installed skill

**Store Corruption**:
Stored Skill Content that cannot be decoded or whose decoded Content Fingerprint differs from its recorded value. It is an operation failure, not a persistent Skill Package status.
_Avoid_: BLOB problem, Store drift

**Skill Installation**:
A Skill Package materialized in a specific Distribution Target by Foundry. It is treated as unchanged except through Foundry operations.
_Avoid_: Installed skill, skill copy

**Distribution**:
A user-directed synchronization that makes a Skill Package's destination in a selected Distribution Target match its Stored Skill Content. Existing destination content does not retain ownership or conflict status against this command.
_Avoid_: Deployment, download

**Distributed Fingerprint**:
The Content Fingerprint most recently written to a Skill Installation by Foundry. Comparing it with the Stored Skill Content identifies whether another Distribution is needed without inspecting the Target.
_Avoid_: Target observation, Target fingerprint

**Distribution Target**:
A physical local skill root to which Foundry can distribute selected Skill Packages.
_Avoid_: Agent runtime, install location

**Generic Target**:
A Distribution Target that follows the community-wide `.agents/skills` convention and is presented without runtime-specific branding.
_Avoid_: Shared runtime target

**Native Target**:
A Distribution Target owned by a specific agent runtime and presented with that runtime's branding.
_Avoid_: Generic target, runtime binding

**Discovery Root**:
A user-approved local location that Foundry scans for existing Skill Packages. Its scan boundaries are governed by the relevant runtime convention or an explicit user configuration.
_Avoid_: Search path, scan folder

**Discovery Scan**:
A user-initiated, point-in-time inspection of enabled Discovery Roots for Skill Packages not yet known to the Skill Store. It does not observe changes to existing Skill Installations.
_Avoid_: Manual watch, background scan

**Import Existing**:
The user action that runs a Discovery Scan across enabled Distribution Targets and automatically imports its newly discovered Skill Packages.
_Avoid_: Watch Session, automatic scan

**Automatic Import**:
The process that adds a newly discovered Skill Package to the Skill Store without requiring prior user confirmation. When discovered in a Distribution Target, the existing package is also recorded as a Skill Installation.
_Avoid_: Discovery, distribution

**Content Fingerprint**:
A value representing a Skill Package's paths, entry kinds, file bytes, symbolic-link targets, and executable bits. Timestamps and other incidental filesystem metadata do not affect it.
_Avoid_: Version, Skill ID

**Update Check**:
A user-initiated comparison between recorded Skill Sources and their current remote state. It may identify an Update Candidate but never downloads or distributes content.
_Avoid_: Automatic update, refresh

**Update Candidate**:
An ephemeral remote source revision found by an Update Check that differs from the Stored Skill Content. It replaces that content only when the user explicitly applies the update.
_Avoid_: Stored Skill Content, available update

**Uninstall**:
The direct removal of a Skill Installation from one Distribution Target without removing its Skill Package from the Skill Store.
_Avoid_: Delete skill, detach

**Store Deletion**:
The placement of a Skill Package in Foundry Trash after all of its Skill Installations have been removed. It remains recoverable.
_Avoid_: Uninstall, remove from Foundry

**Remove from Foundry**:
The logical removal of a Skill Package from active and Trash views without physically deleting its metadata or Stored Skill Content. It is not recoverable through the product.
_Avoid_: Permanently delete, Store Deletion

**Foundry Trash**:
A recoverable state for a Skill Package removed by Store Deletion. Removing it from Foundry hides it permanently without physically deleting its Stored Skill Content.
_Avoid_: Archive, recycle bin

**Restore from Trash**:
The restoration of a Skill Package from Foundry Trash without recreating any of its former Skill Installations.
_Avoid_: Distribute, restore Target

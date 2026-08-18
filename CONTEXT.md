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
The stable directory name Foundry uses when creating new Skill Installations for a Skill Package. It is initially derived from the manifest name when readable, otherwise from the imported directory name, and does not change automatically with later content edits.
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
A Skill Source that Foundry can no longer resolve or access. Its failure does not remove the associated Skill Package, Skill Revisions, or Skill Installations.
_Avoid_: Deleted skill, missing package

**Local Package**:
A Skill Package that has no remaining remote Skill Source. It remains fully manageable and distributable from the Skill Store.
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
The canonical local collection of Skill Packages managed by Foundry. Skill Installations are derived from packages in this collection.
_Avoid_: Skill library, skill registry

**Store Working Copy**:
The current readable contents of a Skill Package in the Skill Store. It is the source of the package's latest observed Content Fingerprint.
_Avoid_: Installed skill

**Skill Installation**:
A Skill Package made available to a specific Distribution Target. It remains distinct from the canonical package in the Skill Store.
_Avoid_: Installed skill, skill copy

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
A bounded, point-in-time inspection of configured Discovery Roots for new, changed, or missing Skill Packages.
_Avoid_: Manual watch, background scan

**Watch Session**:
Temporary observation of configured Discovery Roots while the Skills interface is active. It supplements, but does not replace, a Discovery Scan.
_Avoid_: Background service, continuous scan

**Automatic Import**:
The process that adds a newly discovered Skill Package to the Skill Store without requiring prior user confirmation. When discovered in a Distribution Target, the existing package is also recorded as a Skill Installation.
_Avoid_: Discovery, distribution

**Content Fingerprint**:
A value representing the complete contents of a Skill Package at a point in time. Foundry uses it to recognize identical content and detect change.
_Avoid_: Version, Skill ID

**Skill Revision**:
An immutable snapshot of a Skill Package created at an import, remote update, distribution, or promotion boundary. Distribution Records refer to the exact Skill Revision that was distributed.
_Avoid_: Skill version, backup

**Update Check**:
A user-initiated comparison between recorded Skill Sources and their current remote state. It may identify an Update Candidate but never downloads or distributes content.
_Avoid_: Automatic update, refresh

**Update Candidate**:
A remote source revision found by an Update Check that differs from the Skill Package content currently held in the Skill Store. It becomes current Store content only when the user explicitly adds it as a Skill Revision.
_Avoid_: Skill Revision, available update

**Distribution Record**:
The record that associates a Skill Installation with the Skill Package content last distributed to its Distribution Target.
_Avoid_: Install log, deployment history

**Skill Conflict**:
The condition in which different Skill Packages with the same normalized Distribution Name would occupy the same location in a Distribution Target.
_Avoid_: Duplicate skill

**Uninstall**:
The direct removal of a Skill Installation from one Distribution Target without removing its Skill Package from the Skill Store.
_Avoid_: Delete skill, detach

**Store Deletion**:
The removal of a Skill Package from the Skill Store after all of its Skill Installations have been removed.
_Avoid_: Uninstall

**Restore from Store**:
The replacement of a changed Skill Installation with the current contents of its Skill Package in the Skill Store.
_Avoid_: Update, distribute

**Promote to Store**:
The replacement of a Skill Package's current Store contents with the changed contents of one of its Skill Installations, creating a new Skill Revision.
_Avoid_: Automatic import, restore

**Import as New Skill**:
The creation of a new Skill Package and Skill ID from the changed contents of an existing Skill Installation, without changing its original Skill Package.
_Avoid_: Promote to Store, duplicate

**Foundry Trash**:
A recoverable holding area for content removed by Store Deletion. Content remains there until the user explicitly deletes it permanently.
_Avoid_: Archive, recycle bin

### Store States

**Available Store Package**:
A Skill Package whose Store Working Copy is readable and whose latest Content Fingerprint has been recorded.

**Missing Store Package**:
A recorded Skill Package whose Store Working Copy is no longer present.

**Unreadable Store Package**:
A Skill Package whose Store Working Copy cannot currently be inspected by Foundry.

### Installation States

**Synced Installation**:
A Skill Installation whose contents match both its last Distribution Record and the current Skill Revision in the Skill Store.

**Outdated Installation**:
A Skill Installation that still matches its last Distribution Record after the Skill Store records a newer Skill Revision.

**Drifted Installation**:
A Skill Installation whose contents no longer match its last Distribution Record while the current Skill Revision remains unchanged.

**Diverged Installation**:
A Skill Installation whose contents changed independently after the Skill Store recorded a newer Skill Revision.

**Missing Installation**:
A recorded Skill Installation whose expected contents are no longer present in its Distribution Target.

---
title: Moving from the Ledger version
description: How to move from sealctl 0.5 and 0.6, which keep keys on a Ledger, to the phone version.
---
# Moving from the Ledger version

sealctl up to 0.6 keeps its keys on a Ledger (the OpenPGP app). The phone version ({{release.phoneVersion}}) uses different keys, made from new 24 words on your phone, and doesn't read the Ledger at all. So the move has three steps: hand everything back with 0.6, install the phone version, and seal it again.

> **Status.** {{release.unsealVersion}}, the release with `sealctl unseal`, is the next release; the latest today is {{release.current}}. The phone version is in development. This page is ready ahead of both.

## 1. Hand everything back with 0.6

0.6 is the last release that reads the Ledger. Its `sealctl unseal --all` puts every secret, volume, backup and SSH key back in plain, standard form, in one folder you delete once everything works.

```sh
sealctl unseal --all --dry-run     # the plan; changes nothing
sealctl unseal --all               # shows the plan again, then asks you to type: unseal
```

- Volumes and backups **stay encrypted**, under a new random password saved in `~/sealctl-unsealed-<date>/passwords.txt`.
- SSH keys become standard key files; secrets go to `secrets.env` in the same folder.
- A stopped run continues with `sealctl unseal --resume`.
- The run ends with `handback.json`: every object and where its password went, with no passwords in it.

Details, and what happens to each kind of object: [Leaving sealctl](/docs/leaving).

## 2. Install the phone version

`brew upgrade sealctl`, or a newer package from [Install](/install). Then install the app, write your new 24 words on the card, and run `sealctl pair`.

If the phone version finds objects from the Ledger version still in place, it stops and says so:

```text
sealctl: Found objects from sealctl 0.5 (Ledger). Hand them back first with sealctl 0.6: sealctl unseal --all. See https://sealctl.com/docs/from-ledger
```

If you upgraded before running `unseal`, install 0.6 next to it to finish step 1 first. A versioned Homebrew formula for this, `sealctl/tap/sealctl@0.6`, is planned.

## 3. Seal it again

```sh
sealctl seal --from ~/sealctl-unsealed-<date>/handback.json
```

`sealctl seal` takes over the volumes, backups, SSH keys and secrets listed in the hand-back file, under keys from your new words. Your phone confirms with Face ID or a fingerprint and lists exactly what it takes over. Then delete the folder.

Keep your Ledger and its paper card until no old copies of your backups or volumes remain: those still open only with the Ledger.

---
title: Leaving sealctl
description: sealctl unseal --all hands every secret, volume, backup and SSH key back under passwords of your own.
---
# Leaving sealctl

`sealctl unseal` is the inverse of sealing: everything sealctl holds comes back in plain, standard form. Volumes and backups **stay encrypted**, under a new random password saved for you. SSH keys become ordinary key files. Secrets become a plain dotenv file. By default nothing goes to Keychain, 1Password or Bitwarden: it all lands in one folder, `~/sealctl-unsealed-<date>`, which you delete once everything works.

> **Status.** This page describes `sealctl unseal` in {{release.unsealVersion}}, the next release of the Ledger version. In the phone version the same command needs a confirmation on your phone (see [confirmation levels](/crypto#levels)), and the app adds Leave sealctl, which also deletes your relay data.

```sh
sealctl unseal --all --dry-run     # the plan; changes nothing
sealctl unseal --all               # shows the plan again, then asks you to type: unseal
sealctl unseal --resume            # continue a run that stopped
sealctl unseal volume work         # one object (asks y)
```

## The folder

Mode 0700, every file in it 0600. sealctl never deletes it.

| File | Content |
| --- | --- |
| `README.txt` | What is in the folder and the commands to check each item by hand |
| `passwords.txt` | One line per volume and backup: its new passphrase or restic password |
| `backup-<volume>.env` | `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` and the storage credentials |
| `secrets.env` | Every secret of the store, plain |
| `handback.json` | Every object and where its password went; no passwords |
| `files/` | A copy of every file sealctl edited |
| `kept/` | sealctl's originals, still encrypted |

On macOS the folder is excluded from Time Machine, and AI agents get rules that keep them out of `~/sealctl-unsealed-*`. Those rules stay after sealctl is gone.

## The rules it keeps

- **Plan first.** Nothing changes before you confirm the plan: `y` for one object, the typed word `unseal` for `--all`.
- **A person at a terminal.** It refuses inside AI coding agents and when there is no terminal.
- **Write ahead.** Each new password is written, synced to disk and read back before it is set, and each object is opened with it before sealctl's key is removed.
- **A journal.** Every step is journaled, so a run stopped by Ctrl-C, a crash or a power cut continues with `--resume`.
- **Nothing deleted that could be needed.** Old store and key files move to `kept/`.

## After `unseal --all`

- Volumes: the passphrase is the line `volume <name>` in `passwords.txt`. Change it to one of your own with Disk Utility, `diskutil apfs changePassphrase`, `hdiutil chpass` or `cryptsetup luksChangeKey`.
- Backups: `set -a; . ~/sealctl-unsealed-<date>/backup-<volume>.env; set +a; restic snapshots`. `restic key passwd` sets a password of your own. Backups no longer run by themselves.
- SSH: the keys work as they are. Add a passphrase with `ssh-keygen -p -f ~/.ssh/<name>`.
- Secrets: in `secrets.env`. Move them to your password manager.
- Then delete the folder, and remove the program: `brew uninstall sealctl/tap/sealctl`.

Want password stores instead of the folder? `--to keychain`, `--to op` (1Password), `--to bw` (Bitwarden) or `--to show`. The full reference ships as `docs/unseal.md` in the repository with {{release.unsealVersion}}.

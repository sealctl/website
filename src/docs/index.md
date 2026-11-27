---
title: Docs
description: Everything about sealctl on one page: install, pairing, secrets, AI agents, SSH, volumes, backups, the phone, your 24 words, leaving, and the CLI reference.
---
# sealctl docs

sealctl keeps API keys, SSH keys and disk passwords off your laptop's disk. Your phone holds the keys, made from 24 words you write on a paper card. When a command or an AI agent needs a key, your computer asks the phone, you approve, and the key goes into that one command. The 24 words alone open everything, with no phone, relay or company.

This page explains all of it, top to bottom. Use the contents below to jump, or your browser's find. For the cryptography, see [Cryptographic design](/crypto) and the [protocol]({{protocol.base}}).

<!-- contents -->

## Install {#install}

The command line tool runs on macOS and Linux. The [Install](/install) page has every package and how to verify a download. The short version:

```sh
brew install sealctl/tap/sealctl          # macOS, or Homebrew on Linux
sudo apt install ./sealctl_*_amd64.deb    # Debian, Ubuntu (package from the latest release)
sudo dnf install ./sealctl-*.x86_64.rpm   # Fedora, RHEL, Rocky
nix profile install github:sealctl/sealctl
```

Backups need [restic](https://restic.net). Volumes on Linux need `cryptsetup`.

Shell completions:

```sh
sealctl completions zsh    # or bash, fish; prints a script for your shell's completion folder
```

Upgrading needs no extra step. The background daemon notices a new version and restarts itself, and AI agent hooks call the stable path, so nothing needs reinstalling after `brew upgrade`.

### The phone app {#app}

The sealctl app for iPhone and Android holds your words and answers requests. Get it on the [App Store]({{app.appStore}}) or [Google Play]({{app.googlePlay}}). Its source is at [github.com/sealctl/app]({{github.app}}).

The app needs a screen lock or passcode. It has no account, no analytics and no ads, and it never shows a price.

## Quick start {#quick-start}

1. **Install** the command line tool (above) and the app.
2. **Create your words.** The app shows 24 words. Write them by hand on a paper card, then the app asks for three of them back. Nothing can be paired before the card passes that check. See [Your 24 words](#words).
3. **Pair this computer.** Run `sealctl pair` and scan the code with the app.
4. **Store a secret** and **run** a program with it.
5. **Set up your AI agents**, so they use secrets without seeing them.

```sh
sealctl pair                                            # scan the QR code with the app
sealctl status                                          # Locked · dev@mbp.example.com #k7m2 · seed qHWf
sealctl secret set shop/openai-api-key --from-clipboard # or pipe it in, or type it at a hidden prompt
sealctl run -e OPENAI_API_KEY=shop/openai-api-key -- npm test
sealctl ai install                                      # Claude Code, Codex, Gemini CLI, ...
```

The first command that needs a key prints `Waiting for your phone`. Tap Allow on the phone. That opens a session on this computer, and nothing asks again until the session locks. See [Sessions and states](#sessions).

Already have keys lying around in `.env` files or your shell profile? `sealctl scan` finds them and moves them into the store. See [Finding keys](#scan).

## Pairing {#pairing}

Pairing connects one computer to your phone. The computer gets a pairing key of its own; it holds no key that opens your data.

```sh
sealctl pair                          # QR code in the terminal, waits up to 10 minutes
sealctl pair --name dev@workstation   # the name the phone shows (default: user@full-hostname)
sealctl pair --force                  # replace this computer's pairing without asking
```

On the phone, open sealctl, go to **Machines**, tap **Pair a machine** and scan the code. The phone asks for Face ID or a fingerprint. When it is done, the terminal prints `Paired: dev@mbp.example.com #k7m2`.

`sealctl pair` also installs the session daemon as a login service (launchd on macOS, a systemd user unit on Linux). Where there is no service manager, the command line tool starts the daemon itself when it needs one. Set `SEALCTL_NO_SERVICE=1` to skip the login service.

### No terminal in front of you {#pair-link}

The terminal also prints a link, `https://sealctl.com/p#...`. Without a terminal (a remote session, an agent on the web) only the link is printed. Open it in a browser on the computer you sit at, and the [/p](/p) page draws the QR code there. The part after `#` never reaches this site. The app's own camera must scan the code: that is how the phone knows you can see the machine.

### Names and tags {#tags}

Every machine has a 4-character tag, such as `#k7m2`. `sealctl status` always shows it, and so does the machine's page in the app, so you can match the two. If you pair a machine under a name that is already paired, the phone asks whether to replace the old one or keep both ("Pair as new", for cloned virtual machines). You can give a machine a nickname on the phone; the computer doesn't know it.

### Unpairing {#unpair}

```sh
sealctl unpair    # asks first; --yes without a terminal
```

This locks the session and removes the pairing. Your sealed objects stay and open again after you pair with the same phone or words. You can also unpair from the phone: **Machines**, the machine, **Unpair**.

### The relay {#relay}

Requests and replies travel through the relay at `relay.sealctl.com`. Each is encrypted end to end between the computer and the phone; the relay sees ids, sizes and timing, never a key or a secret name. A machine records its relay when it pairs. To use another relay (for example a test one), pass `--relay <origin>` or set `SEALCTL_RELAY` when pairing; a paired machine refuses a different one. What the relay can and cannot see: [Cryptographic design](/crypto#relay-view).

## Secrets {#secrets}

The secret store keeps API keys and tokens, each under a name like `shop/openai-api-key`. Values are encrypted on disk; names are not, so listing needs no key.

### Store and list {#secret-set}

```sh
sealctl secret set shop/openai-api-key --from-clipboard   # the clipboard is cleared afterwards
pbpaste | sealctl secret set shop/openai-api-key          # or from stdin
sealctl secret set shop/openai-api-key                    # or a hidden prompt
sealctl secret set shop/openai-api-key --force            # replace an existing value
sealctl secret ls                                         # names only; no key needed
sealctl secret mv shop/openai-api-key shop/openai
sealctl secret rm shop/openai                             # asks first
```

`sealctl secret get` prints a value. It refuses inside an AI agent, and prints to a terminal only with `--show`. `--clip` copies the value and clears the clipboard after 30 seconds. To a pipe it writes the exact bytes. You rarely need it: `sealctl run` is the usual way to use a secret.

### Use a secret: `sealctl run` {#run}

`sealctl run` starts a program with secrets in its environment. The program reads them as usual; nothing is written to a file.

```sh
sealctl run -e OPENAI_API_KEY=shop/openai-api-key -- npm test
sealctl run -e GITHUB_TOKEN=git/github.com -- gh release list
sealctl run -- npm start          # variables from .sealctl.toml
```

- Before the program starts, sealctl lists on stderr what it gets, by name: `sealctl: OPENAI_API_KEY ← shop/openai-api-key`.
- A `.sealctl.toml` is used only once you trust it on this machine (see [below](#sealctl-toml)).
- Inside an AI agent, or when the output is not a terminal, every value in the program's output is replaced by `****` (raw, base64 and URL-encoded forms). `SEALCTL_NO_MASK=1` turns this off, except inside an agent.
- `sealctl run` exits with the program's own exit code.

### `.sealctl.toml` {#sealctl-toml}

Put a `.sealctl.toml` in a repository to say which secrets each command gets. It holds names, not values, so it is safe to commit.

```toml
[env]
OPENAI_API_KEY = "shop/openai-api-key"

[command."npm run deploy"]
DEPLOY_TOKEN = "shop/deploy-token"
```

sealctl uses the nearest `.sealctl.toml` above the working folder. `[env]` applies to every command. A `[command."..."]` section applies when the command line starts with those words; the longest match wins. `-e` on the command line wins over both. `--no-project` ignores the file.

A file in a repository never grants anything. It only names which secrets a command asks for, and sealctl trusts it on first use:

- The first time `sealctl run` uses a `.sealctl.toml`, and again whenever its content changes, it lists every secret the file names and asks `Trust this file? [y/N]`. A cloned repository can bring one, so you decide before any of your secrets go to its commands.
- Without a terminal (a script, CI), `sealctl run` refuses and says how to trust the file once: `sealctl project trust` (the file, or a folder; by default the one you are in).
- Files that `sealctl seal env` and `sealctl scan` write are trusted already, unless they added to a file you had not trusted.
- sealctl keeps the trusted files' paths and a hash of their content in its state folder, never names or values.
- An AI agent never trusts a file: its use of a secret goes to your phone, which shows the agent, the repository and the names.

### Own approval {#own-approval}

Some keys should ask every time, such as a production deploy token:

```sh
sealctl secret set deploy/token --own-approval
```

Every use asks the phone, even inside an open session. The key stays in memory only until that command exits. `sealctl secret ls` marks these secrets `own approval`.

### Finding keys: `sealctl scan` {#scan}

`sealctl scan` finds keys in files and moves them into the store, leaving references behind.

```sh
sealctl scan --dry-run       # list only: file, line, kind and the first 4 characters
sealctl scan                 # .env files in this repository, then asks: Seal 6 keys? [y/N]
sealctl scan --home          # also shell rc files, shell histories and ~/.aws/credentials
```

| Found in | Stored as | Left behind |
| --- | --- | --- |
| `.env`, `.env.*` | `<repo-name>/<variable>` | A `.sealctl.toml` mapping; the line removed |
| `~/.zshrc`, `~/.bashrc`, `~/.profile` and similar | `env/<variable>` | A comment saying how to run with it |
| Shell histories | Not stored (they are copies) | The value replaced by `****` |
| `~/.aws/credentials` | `aws/<profile>` | A `credential_process` line in `~/.aws/config` |

The same value found twice becomes one secret. sealctl makes no backup copies of these files, because the copies would hold the keys. To move one `.env` file under a prefix of your choice, use `sealctl seal env .env --prefix shop --delete` (see [Bring what you have](#seal)).

### Where the store lives {#store-backup}

The store is a folder of `.sealed` files under a store id, by default `~/.local/share/sealctl/store/<store-id>`. Its key depends only on the store id and your words, so the same folder works on every machine paired with your phone.

```sh
sealctl secret store                       # the folder and its id
sealctl secret store --use ~/Sync/sealctl  # use a store folder in a synced folder or git clone
```

To back up the store, keep it in a synced folder or a git repository, or copy the folder. The copies are encrypted; your words open them with or without sealctl (see [recover](#recover)). If two machines write the same secret at once, the last write wins; `sealctl secret ls --json` shows when each was modified.

## AI agents {#agents}

AI coding agents run commands on your machine and read their output. sealctl lets them **use** your secrets without **seeing** them.

```sh
sealctl ai install           # every agent found on this machine
sealctl ai install claude    # or only the ones you name
sealctl ai status
sealctl ai uninstall         # removes exactly what install added
```

Then, in any agent, copy an API key and say "store it as myapp/openai". The agent runs `sealctl secret set myapp/openai --from-clipboard`, and later `sealctl run -- <command>`. The program gets the key; the agent sees `****`.

### What is installed {#ai-layers}

1. **sealctl itself**, with no setup. `sealctl run` masks values whenever it runs inside an agent. `secret get`, `recover`, `seal`, `unseal`, `buy`, `unpair`, `project trust` and the credential helpers refuse inside an agent. sealctl knows it is inside one by the environment variables agents set (`CLAUDECODE`, `CODEX_THREAD_ID`, `GEMINI_CLI`, `QWEN_CODE`, `COPILOT_AGENT_SESSION_ID`, `OPENCODE`, `CURSOR_AGENT`, `AI_AGENT`); `SEALCTL_AGENT=1` forces it.
2. **Hooks** the agent runs every time. A prompt that contains something that looks like a key is blocked before the model sees it. Commands that would reveal secrets (`cat .env`, `printenv`, `echo $API_KEY`, `pbpaste`, `sealctl secret get`) are denied with a hint. Variables that only name a socket, folder or file, such as `echo $SSH_AUTH_SOCK`, may be printed. Text in a quoted here-document (`python3 - <<'EOF'`, `cat > notes.md <<'EOF'`) is text, not commands, unless it is fed to a shell. A script that `cat` or `tee` only writes to a file (`cat > voices.mjs <<'EOF'`) may mention `process.env.API_KEY` or a `.env` file. A body that runs (fed to a shell, `node -` or `python3 -`, or run by the same command line) is still checked, so dumping the environment or opening a `.env` file in it is denied. A reference to a key kept elsewhere, such as `process.env.API_KEY`, is not taken for a key. Reading `.env` files, private keys, `*.sealed` files or sealctl's state folder is denied. Each session starts with one line naming the secrets available through `sealctl run`, never their values. Where git signs through sealctl, the line adds that signed commits, `git push` over SSH and `ssh` wait silently for approval on your phone.
3. **A skill and deny rules.** The `sealctl-secrets` skill explains the workflow: when a command prints `Waiting for your phone`, tell you and wait, don't retry; a decline means stop and ask you. Signed git commits, `git push` over SSH and `ssh` print no such line: they wait silently for your phone, and a [desktop notification](#notifications) shows you what waits. That request is the approval, so the agent commits as usual, without asking you first. `agent refused operation` means it was declined or not answered in time. Deny rules block the dangerous sealctl commands where the agent supports them.

| Agent | Skill | Hooks | Deny rules |
| --- | --- | --- | --- |
| Claude Code | yes | yes | yes |
| Codex | yes | yes (run `/hooks` once to trust them) | yes |
| Gemini CLI | yes | yes | yes |
| Qwen Code | yes | yes | yes |
| GitHub Copilot CLI | yes | yes (prompt blocking depends on its version) | no |
| Cursor | yes | yes (its CLI doesn't fire every hook) | no |
| Antigravity CLI, Kiro | yes | no | no |

Files sealctl changes are backed up once as `<file>.before-sealctl`.

### Per-agent answers {#answers}

The first time an agent uses a secret in a repository during a session, the phone asks: the card shows the agent, the repository, the command and the secret names. Tap **Allow** and the answer is remembered for that agent, key and repository. You, typing at the keyboard, are never asked inside an open session.

```sh
sealctl rules    # remembered answers and this session's allowances
```

Remove answers on the phone: **Settings**, **Answers**. An answer unused for 90 days is removed by itself.

### Limits {#ai-limits}

- **Don't paste keys into an agent.** A blocked prompt never reaches the model, but your AI tool may still keep it in its local history. If you pasted a real key, change it at its provider.
- Hooks fail open in most agents: if sealctl is missing or crashes, the action goes ahead. Deny rules match command text, not programs. They stop accidents, not a determined attacker.
- A program you run with `sealctl run` can always read the secrets you give it.
- Keys are found by pattern. Start a prompt with `#nosecret` to get past a false alarm.

## Cloud and CI {#cloud-ci}

### AWS {#aws}

`sealctl scan --home` moves each profile in `~/.aws/credentials` into the secret `aws/<profile>` and sets `credential_process` in `~/.aws/config`. The AWS CLI and SDKs then ask sealctl for the keys when they need them, and the phone approves as usual.

```sh
sealctl scan --home --dry-run   # see which profiles it would move
sealctl scan --home
aws s3 ls                       # asks your phone if the session is Locked
```

### GitHub and git over HTTPS {#git-credentials}

```sh
sealctl secret set git/github.com --from-clipboard   # a personal access token
sealctl git credentials github.com                   # git asks sealctl for it
sealctl git credentials github.com --undo
```

git then gets the token from the secret `git/<host>` whenever it talks to that host.

### Other tools {#other-tools}

Anything that reads a key from an environment variable works with `sealctl run`:

```sh
sealctl run -e CLOUDFLARE_API_TOKEN=cf/token -- wrangler deploy
sealctl run -e GOOGLE_API_KEY=gcp/api-key -- ./script.sh
```

### Remote machines and CI runners {#ci}

- **A dev box over SSH** pairs like any machine; open the printed link in your local browser to see the code. Sensitive steps there use the [number match](#levels), which works over SSH.
- **CI runners and containers** have no daemon that lives long. Set `SEALCTL_NO_DAEMON=1`: each command asks the phone itself and keeps keys only while it runs. With `CI` set, sealctl never prompts.

## SSH and git {#ssh-git}

sealctl keeps SSH keys in the store and serves them from the daemon's SSH agent. Private keys never sit in `~/.ssh`.

```sh
sealctl ssh keygen                  # new Ed25519 key ssh/ed25519; prints the public key
sealctl ssh keygen github           # another key, ssh/github
sealctl ssh pubkey github           # the public key line again
sealctl ssh setup                   # prints the lines for ~/.ssh/config
```

`sealctl ssh setup` prints a `Host *` block with an `IdentityAgent` line pointing at sealctl's agent socket. Add it to `~/.ssh/config`. Public keys are written to `~/.ssh/sealctl_<name>.pub`.

To take over a key you already have:

```sh
sealctl seal ssh ~/.ssh/id_ed25519 --name github
```

It asks for the key's passphrase if it has one, stores the key, and checks the stored key matches. The original file stays; once logins work, delete it.

### Signed git commits {#git-signing}

```sh
sealctl git setup                 # sign commits and tags with ssh/ed25519, for all repositories
sealctl git setup --local         # only this repository
sealctl git setup --key github    # with another key
sealctl git setup --undo
```

git signs through the daemon's SSH agent. When the session is Locked, the commit waits for your phone. git shows nothing meanwhile, so a [desktop notification](#notifications) says what waits: `Sign a git commit · shop`, with the agent's name when an agent committed. `git push` over SSH and `ssh` logins do the same (`SSH login to github.com`).

## Volumes and backups {#volumes-backups}

### Volumes {#volumes}

A volume is an encrypted disk that mounts when your session opens and unmounts when it locks.

| Kind | Where | What it is |
| --- | --- | --- |
| `apfs` | macOS (default) | An encrypted APFS volume in an APFS container, like Disk Utility makes |
| `sparsebundle` | macOS | An encrypted disk image in a folder, easy to move or sync |
| `luks` | Linux (default) | A LUKS2 file with ext4 inside; opening needs `sudo` |

```sh
diskutil list internal                                 # find your APFS container, e.g. disk3
sealctl volume create work --container disk3           # macOS APFS, mounted at /Volumes/work
sealctl volume create clients --kind sparsebundle      # ~/Vaults/clients.sparsebundle
sealctl volume create work --size 50g                  # Linux: ~/Vaults/work.luks, mounted at ~/Vaults/work
sealctl volume create archive --manual                 # not mounted when the session opens
sealctl volume ls
sealctl volume open archive
sealctl volume close archive
sealctl volume rm archive                              # forget it; --delete-data destroys it
```

The volume's passphrase is derived from your words and given to `diskutil`, `hdiutil` or `cryptsetup` on stdin only.

To take over a volume you already have, see [Bring what you have](#seal).

### Backups {#backups}

Backups use restic: encrypted, versioned and deduplicated, to a folder or any S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO) and the other restic backends.

```sh
sealctl backup init work --from work --repo s3:https://<account>.r2.cloudflarestorage.com/<bucket>
sealctl backup init docs --from ~/Documents --repo /Volumes/External/restic
sealctl backup schedule install     # every 60 minutes while the session is Open
sealctl backup run work             # now
sealctl backup run --all
```

- `--from` is a volume name or a folder.
- Storage credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `B2_ACCOUNT_ID`, ...) are asked at a hidden prompt, or given with `-e VAR=value`, and stored as secrets `backup/<name>/<VAR>`.
- The repository password is derived from your words and given to restic on a pipe, never as an argument or environment variable.
- Backups also run when the session locks, before volumes unmount (at most 15 minutes).

```sh
sealctl backup snapshots work
sealctl backup restore work --target ~/restored                  # latest snapshot
sealctl backup restore work --target ~/restored --snapshot 1a2b3c4d --include /Volumes/work/notes
sealctl backup check work --read-data 5                         # also read 5% of the data
sealctl backup policy work --keep-daily 7 --keep-weekly 4 --keep-monthly 12
sealctl backup policy work --on-lock false                      # no backup when the session locks
sealctl backup schedule uninstall
```

The default keeps 7 daily, 4 weekly and 12 monthly snapshots.

### Busy volumes {#busy}

A volume that a program still uses cannot unmount. sealctl names it:

```text
sealctl: Volume safe is busy: node (pid 4211) has files open.
```

Close the program, or force it:

```sh
sealctl volume close safe --force
sealctl lock --force
```

## The phone {#phone}

### The approval card {#approval-card}

When a machine asks for a key, the phone shows a card, or a notification you can answer with one tap:

```text
WAITING · 0:12
Allow OPENAI_API_KEY?
For    npm test
In     ~/dev/shop
From   dev@mbp.example.com · claude
[ Allow for this session ]
[ Allow once ]
  Deny
```

- **Allow for this session** opens the session on that machine: no more taps until it locks.
- **Allow once** hands the key to that one command; the session stays Locked.
- **Deny** refuses. The command exits with code 4.

The card shows the command, the folder, the machine and the agent, if any. A request the phone doesn't answer in 5 minutes expires, and the command exits with code 5.

How often the phone asks:

| Asking | When | What you do |
| --- | --- | --- |
| **Automatic** | Reopening a machine whose day began at a trusted place, while you are there, the phone is unlocked and near the machine; an agent's use you already allowed | Nothing |
| **One tap** | The first approval of the day; reopening anywhere else; an agent's first use of a key in a repository; every use of an own-approval secret | Tap the notification |
| **In the app** | Pairing, handing objects back, typing old words, showing the words | Open the app; Face ID or a fingerprint |

None of this is a setting. "Near" means the phone, on Wi-Fi, reaches the relay from the same network as the machine; on mobile data or a VPN it falls back to one tap.

### Desktop notifications {#notifications}

When a request waits for your phone and nothing on your screen says so, the computer shows a desktop notification. It says what waits, by name only, never a value:

```text
Approve on your phone
Sign a git commit · shop · Claude Code
```

Other examples: `SSH login to github.com`, `Open volume safe`, `Back up safe`, `Use 2 secrets for npm test`. When you answer, the same notification changes to `Signed` or `Approved`, `Declined`, or `Expired: nothing was signed`.

- It shows for git signing and SSH logins, the git and AWS credential helpers, scheduled backups, and commands whose output nobody sees, also when an AI agent made the request. A command you watch in a terminal prints `Waiting for your phone` instead.
- **macOS:** notifications come from `sealctl Notifier.app`, which Homebrew installs with sealctl. The first one makes macOS ask whether sealctl may send notifications; allow it.
- **Linux:** notifications go over D-Bus, with the sealctl icon.
- To turn them off, add `notifications = false` to `~/.config/sealctl/config.toml`.

### Sessions and states {#sessions}

Each machine is in one state:

| State | Means |
| --- | --- |
| **Locked** | No keys in memory; volumes unmounted |
| **Open** | Keys in memory; you and agents you allowed use them without asking |
| **Waiting** | A request is on the phone. The terminal prints `Waiting for your phone` |

```sh
sealctl status       # never asks the phone
sealctl open         # open the session now
sealctl lock         # back up, unmount volumes, wipe keys
```

```text
Open · active · locks after 4 h idle · hard stop 02:00
dev@mbp.example.com #k7m2 · seed qHWf
Store     7 secrets · ~/.local/share/sealctl/store/0f8c6d2e…
Volumes   safe (APFS) mounted at /Volumes/safe · backup 12 min ago
SSH       2 keys: ed25519, github
This month: 214 keys used, 0 requests declined, nothing written to disk.
```

The first line says `active` while you work: you used the keyboard or mouse, or a key was used, in the last 2 minutes. Once the machine is idle, it counts down to the lock in whole minutes: `Open · locks in 3 h 47 min · hard stop 02:00`. The phone's **Machines** tab says the same: `Open · active` or `Open · locks in 3 h 47 min`.

**When a session locks.** An Open session locks by itself when you stop working for longer than its idle allowance. The allowance starts short and grows the more you work that day, up to 4 hours at a trusted place, 1 hour without places, and 10 minutes away from your places. A minute counts as worked when you used the keyboard or mouse, or a key was used. Sleep counts as idle. The machine tells the phone when it goes idle and when you start working again.

Every session also stops at 02:00 or 24 hours after the first approval of the day, whichever comes first, so a day begun in the morning lasts until 02:00. You can lock any machine from the phone at any time: **Machines**, the machine, **Lock now**, or **Lock all**.

### Places {#places}

Places let the phone know where you work. Locations stay on the phone; there is no map.

- **Learned.** After you open your machines at the same spot on three different days, the phone asks once: "Trust this place?" You name it.
- **Trust where I am now.** You can also add the place you are at by hand: **Settings**, **Places**, **Trust where I am now**, with Face ID or a fingerprint.
- **At a trusted place**, reopening needs no tap while your phone is unlocked and near the machine, and sessions can stay open up to 4 hours. These comforts start as soon as you trust the place.
- **Skipping the two-hour wait.** A trusted place, learned or added by hand, lifts the two-hour wait of [level 3](#levels) two hours after you trust it. Trusting it is announced to every paired computer, which can cancel it until then (`Your phone trusted the place Home. It skips the two-hour wait from 12:04. Not you? Run: sealctl cancel`). A cancel, or removing the place, means it is not trusted. So someone holding your unlocked phone cannot trust "here" unseen to skip that wait.
- **Leaving locks.** When you leave a trusted place, the phone locks every machine you approved there.
- **Location "Allow all the time".** Places need location access set to "Allow all the time" (iPhone: Always), so the phone notices when you leave. Without it, sessions follow the rules for no location: a session stays open up to 1 hour and reopening always takes a tap. The app shows a banner with **Open settings** while you have a trusted place without it.

At most 10 places. Remove or rename them in **Settings**, **Places**.

### Confirmation levels {#levels}

Some steps remove sealctl's protection or are hard to undo. They ask harder.

| Level | What | What the phone asks |
| --- | --- | --- |
| **1 Routine** | Opening a session, an agent's first use, own-approval secrets, a new volume or backup | As above: automatic or one tap |
| **2 Sensitive** | Pairing; `sealctl seal` of something you already have; `sealctl unseal` of one object | Face ID or a fingerprint every time, never the passcode; the exact objects listed; the phone near the machine, or the number match |
| **3 Leaving** | `sealctl unseal --all`; Unseal all machines and leave; Show words; Delete relay data and unpair | Level 2, plus the number match, the plan signed by the phone, a **two-hour wait** away from a trusted place, and a report |

**The number match.** The terminal shows a number:

```text
Waiting for your phone. On your phone, pick 59.
```

The phone offers three numbers. Pick the one on the terminal. A wrong pick refuses the request, and for an hour the phone ignores sensitive requests from that machine (release it early on the machine's page in the app).

**The two-hour wait.** Away from a trusted place, a level 3 approval takes effect two hours later. Every paired machine is told and shows a desktop notification. Anyone can cancel it until then: on the phone, or on any paired machine with `sealctl cancel`. At a trusted place it runs at once, except at a place trusted less than two hours ago (see [Places](#places)). An action on the phone (showing the words, deleting relay data, leaving) is finished on the phone once the two hours are over: you have an hour to do that, after which you start again.

**No Face ID or fingerprint?** Level 2 asks for two words from your card instead. Level 3 is refused on the phone; on a computer, use your card: `sealctl unseal --all --words`.

The design behind the levels: [Cryptographic design](/crypto#levels).

### Machines {#machines}

The **Machines** tab lists every paired machine as Locked, Open or Waiting. A machine's page shows its tag, when it was opened and where, its hard stop, the keys it used and what it holds. From there: **Lock now**, set a nickname, **Unpair**, or **This machine was lost or stolen** (see [Lost phone or machine](#lost)).

### Activity and inventory {#inventory}

- **Activity** logs every use of a key: time, key name, agent, repository, command, machine and how it was answered. At the top, a monthly summary: keys used, requests declined. Uses are kept on the phone for 90 days; at the bottom, a heatmap shows the last year day by day.
- **Inventory** lists every object a key was handed out for (the secret store, own-approval secrets, volumes, backups), by machine, with its words and when it was last used.

On a computer:

```sh
sealctl inventory    # objects this machine knows
```

### Settings {#settings}

| Section | What |
| --- | --- |
| Words | Show words, Check my card now |
| Backups | The iCloud Keychain (Android: Google backup) copy of your words; the encrypted backup on the relay |
| Places, Answers | See [Places](#places) and [Per-agent answers](#answers) |
| Notifications | Send a test request; the phones getting requests |
| Relay | **Delete relay data and unpair**: your machines are unpaired and the relay forgets them. Your words stay on this phone |
| This phone | **Remove from this phone**: your words, machines and history leave this phone. Your computers stay sealed; your card restores everything |
| | **Unseal all machines and leave**: every computer gets its passwords back, then sealctl forgets you. See [Leaving](#leave-phone) |

## Your 24 words {#words}

Every key sealctl hands out comes from your 24 words. With the card you can restore a new phone, or open your files with no phone at all. Lose the words and the phone, and nothing opens them: there is no reset.

### The card {#card}

The app prints a blank card (A4 or Letter): 24 numbered lines with four boxes each. Any paper works; number 24 lines. The first four letters are enough to know each word, but write each word in full. Also copy the **seed fingerprint** (4 characters, like `7Hq3`) and the date the app shows. The fingerprint names the seed your words make: `sealctl status`, `sealctl volume ls` and messages about a sealed object show it as `seed 7Hq3`.

The app never shows the words for printing, copying or screenshots. Write where no camera can see.

Once a year the app asks for two words from the card, to check it is still there and right.

### Backups of the words {#words-backup}

| Copy | Holds | Restores |
| --- | --- | --- |
| Paper card | The words | Everything, on any phone, or with no phone |
| iCloud Keychain, or Google backup on Android | The words, end-to-end encrypted by Apple or Google | A new phone on the same account, without typing the words |
| Encrypted backup on the relay | Your machines, places, answers and inventory, encrypted with a key only your words make. Not the words | Those lists, after a restore |

You can turn off either online copy in **Settings**, **Backups**.

### Restore a phone {#restore}

Install the app on the new phone. If it finds your words in iCloud Keychain or your Google backup, tap **Restore**. Otherwise tap **Restore from paper** and type the 24 words; four letters each are enough. The app shows the seed fingerprint: check it matches your card. Your machines stay paired and reconnect by themselves.

The app then asks where the old phone is. If it was lost or stolen, change the secrets that matter at their providers; changing words is not in the app yet (see [Change words](#change-words)).

### Open files without a phone: `sealctl recover` {#recover}

`sealctl recover` opens an object with the 24 words alone: no phone, no relay, no pairing, no settings. It works on a fresh computer.

```sh
sealctl recover ~/.local/share/sealctl/store/<store-id> --out ~/recovered   # every secret, one file each
sealctl recover ~/.local/share/sealctl/store/<store-id> --name shop/openai-api-key --show
sealctl recover ~/Vaults/clients.sparsebundle                               # unlock and mount
sealctl recover ~/Vaults/safe.luks                                          # Linux: mounted at ~/Vaults/safe
sealctl recover <APFS volume>                                               # macOS: its name, UUID or disk identifier
sealctl recover s3:https://<account>.r2.cloudflarestorage.com/<bucket>/<repo-id> -- snapshots
```

An APFS volume can be given by the name Finder and Disk Utility show, by its UUID or by its disk identifier (`disk3s5`; `diskutil apfs list` shows both). If several volumes share the name, sealctl lists their disk identifiers and UUIDs to choose from.

It asks for the words one at a time, without echo. It checks the seed fingerprint first: words that don't match say so (`These words are seed qHWf; this object was sealed with seed 7Hq3.`) and change nothing. It refuses inside an AI agent and without a terminal.

### Change words {#change-words}

Changing your words is not available yet: the app says so if you try. Until it is:

- Keep your card safe. Your words stay the same, so the card keeps restoring everything.
- If your phone is lost or stolen, restore sealctl on another phone (see [Restore a phone](#restore)), then change the secrets that matter at their providers: API keys, cloud and deploy tokens.

## Bring what you have: `sealctl seal` {#seal}

`sealctl seal` takes over something you already have. After it, sealctl's key opens the object and your old passphrase or password stops working. Each object is opened with the new key before the old way in is removed.

```sh
sealctl seal volume safe <APFS volume>            # its name, UUID or disk identifier; or a sparse bundle path, or a LUKS file
sealctl seal backup safe --repo <restic URL>      # your restic password is removed (--keep-old-password keeps it)
sealctl seal ssh ~/.ssh/id_ed25519
sealctl seal secret shop/openai-api-key --from-clipboard
sealctl seal env .env --prefix shop --delete      # every variable, then a .sealctl.toml
sealctl seal --from ~/sealctl-unsealed-<date>/handback.json
```

An APFS volume is given as for [recover](#recover): by its name, UUID or disk identifier. A name that several volumes share lists them to choose from.

Taking over an existing object is confirmation [level 2](#levels): the terminal says `On your phone, pick 47 if it asks.` A new object, like a secret you just typed, needs nothing extra.

`sealctl seal --from` takes back everything a hand-back list from `sealctl unseal` names. `--skip <kind>/<name>` leaves one out. `--words` uses your card instead of the phone.

## Leaving sealctl {#leaving}

`sealctl unseal` is the reverse of sealing: everything sealctl holds comes back in plain, standard form. Volumes and backups **stay encrypted**, under a new random password saved for you. SSH keys become ordinary key files. Secrets become a plain dotenv file. Leaving never needs the relay or sealctl's company.

```sh
sealctl unseal --all --dry-run     # the plan; changes nothing
sealctl unseal --all               # shows the plan again, then asks you to type: unseal
sealctl unseal --resume            # continue a run that stopped
sealctl unseal volume work         # one object (asks y)
```

One object at a time: `secrets` (the whole store), `secret <name>`, `volume <name>`, `backup <name>`, `ssh <name>`, `git`, `ai [TOOL...]`. One object leaves sealctl installed and paired.

`--all` does everything, in this order: secrets, backups and volumes, SSH keys, git signing, AI integrations and services. Then it unpairs the machine and removes sealctl's local settings. It never removes the program; the last line says how (`brew uninstall sealctl/tap/sealctl`, `sudo apt remove sealctl`, ...).

### The phone's part {#unseal-phone}

`sealctl unseal <object>` is [level 2](#levels). `sealctl unseal --all` is level 3: the terminal shows a number, you pick it on the phone, read the plan and confirm with Face ID or a fingerprint. Away from a trusted place it waits two hours:

```text
Approved on your phone, away from a trusted place: it starts at 11:00.
Your phone and every paired machine can cancel it until then.
Starts in 59 min. Ctrl-C stops waiting; running it again needs a new approval.
Or use your card now: sealctl unseal --all --words
```

With `--words` you type your 24 words instead, and no phone, number or wait is involved.

### The folder {#unsealed-folder}

Everything goes into one new folder, `~/sealctl-unsealed-<date>`, mode 0700, every file 0600. sealctl never deletes it; you delete it once everything works.

| File | Content |
| --- | --- |
| `README.txt` | What is in the folder, and the commands to check each item by hand |
| `passwords.txt` | One line per volume and backup: its new passphrase or restic password |
| `backup-<name>.env` | `RESTIC_REPOSITORY`, `RESTIC_PASSWORD` and the storage credentials |
| `secrets.env` | Every secret of the store, plain |
| `handback.json` | Every object and where its password went; no passwords. `sealctl seal --from` reads it |
| `files/` | A copy of every file sealctl edited |
| `kept/` | sealctl's originals, still encrypted |

On macOS the folder is excluded from Time Machine, and AI agents get rules that keep them out of `~/sealctl-unsealed-*`. Those rules stay after sealctl is gone.

Prefer a password manager? `--to keychain` (macOS Keychain or the Linux Secret Service), `--to op` (1Password), `--to bw` (Bitwarden) or `--to show` (each new password shown once) for new passwords; `--secrets-to keychain|op|bw|env` for secrets. `--type-passwords` lets you type each new password instead of generating it.

### The rules it keeps {#unseal-rules}

- **Plan first.** Nothing changes before you confirm the plan: `y` for one object, the typed word `unseal` for `--all`.
- **A person at a terminal.** It refuses inside AI agents and without a terminal.
- **Write ahead.** Each new password is saved and read back before it is set, and each object is opened with it before sealctl's key is removed.
- **A journal.** Every step is recorded, so a run stopped by Ctrl-C, a crash or a power cut continues with `sealctl unseal --resume`.
- **Nothing deleted that could be needed.** Old store and key files move to `kept/`.
- `--skip <kind>/<name>` leaves an object out, for example a backup whose storage is offline.

### After `unseal --all` {#after-unseal}

- **Volumes:** the passphrase is the line `volume <name>` in `passwords.txt`. Change it to one of your own with Disk Utility, `diskutil apfs changePassphrase`, `hdiutil chpass` or `cryptsetup luksChangeKey`.
- **Backups:** `set -a; . ~/sealctl-unsealed-<date>/backup-<name>.env; set +a; restic snapshots`. `restic key passwd` sets a password of your own. Backups no longer run by themselves.
- **SSH:** the keys work as they are. Add a passphrase with `ssh-keygen -p -f ~/.ssh/<name>`.
- **Secrets:** in `secrets.env`. Move them to your password manager.
- Then delete the folder, and remove the program.
- Keep your paper card until no old copies of your backups or volumes remain. Those still open only with your words.

### Leave from the phone {#leave-phone}

On the phone, **Settings**, **Unseal all machines and leave** walks you through it:

1. It lists every paired computer. On each, run `sealctl unseal --all` and approve it on the phone. A computer that is lost or already wiped can be skipped; what it holds then opens only with your card.
2. You confirm with Face ID or a fingerprint. Away from a trusted place, the next step waits two hours.
3. You type three words from your card, because the card is about to become the only copy.
4. The phone deletes your relay data and the iCloud Keychain or Google backup copy of your words, shows a report, and removes sealctl from itself.

**Without a phone**, leave with your card alone: `sealctl unseal --all --words` on each computer.

## Lost phone or machine {#lost}

### A lost or stolen phone {#lost-phone}

Your words are behind the phone's passcode. To be safe:

1. **Find, lock or erase it** with Apple Find My ([icloud.com/find](https://www.icloud.com/find)) or Google Find My Device ([google.com/android/find](https://www.google.com/android/find)).
2. **Restore sealctl on another phone** from iCloud Keychain, your Google backup or your card. See [Restore a phone](#restore).
3. **Change the secrets that matter** at their providers: API keys, cloud and deploy tokens. Changing your words is not in the app yet; see [Change words](#change-words).

Sensitive steps need Face ID or a fingerprint, never the passcode alone. The most sensitive ones (level 3) wait two hours away from your trusted places and are announced on every paired machine:

```text
Your phone approved leaving sealctl on dev@mbp.example.com away from a trusted place. It takes effect at 11:00. Not you? Run: sealctl cancel
```

```sh
sealctl status     # Pending   leaving sealctl, approved on your phone · takes effect 11:00 · sealctl cancel
sealctl cancel     # asks: Cancel leaving sealctl on dev@mbp.example.com, due at 11:00? [y/N]
```

`sealctl cancel` works on any paired machine. Afterwards it reminds you: if you didn't approve this, someone else may have your phone; find, lock or erase it, then restore on another phone and change the secrets that matter.

### A lost or stolen machine {#lost-machine}

On the phone: **Machines**, the machine, **This machine was lost or stolen**. It walks you through:

1. Unpair it.
2. Change the secrets it used in the last 90 days at their providers; the app lists them.
3. Re-encrypt what it had open: run `sealctl migrate` on another machine that has them.

Your words were never on that machine, so they don't need to change. A machine that is Locked or off holds only its pairing key.

## Paying {#paying}

sealctl is free. If it earns its place, $5.99 once keeps the relay running. See [Pricing](/pricing).

After 30 days with use, `sealctl status`, `pair`, `secret ls` or `migrate`, typed by you at a terminal, may say so in one line, at most once a week. Never in `sealctl run`, pipes, CI or anything an agent reads, and never on the phone. A licence never blocks keys, `recover`, your words or any command.

```text
$ sealctl buy
Who pays?
  1  Me             card, opens checkout
  2  My company     invoice with VAT ID, opens checkout
  3  Someone else   copies a payment link to send
  4  Give feedback instead
Choose 1, 2, 3 or 4:
```

- **Me** opens Paddle's checkout and waits until the licence arrives.
- **My company** opens the same checkout, where Paddle asks for the company and its VAT ID, and copies a short message for your team chat with the link.
- **Someone else** copies a payment link that anyone can pay.
- **Give feedback instead** is there until this phone has given feedback; see [Feedback for a free year](#feedback).

`sealctl buy` needs a paired machine, because the licence belongs to your phone's identity. It refuses inside AI agents, and its menus need you at a terminal: not in a pipe or CI.

### Feedback for a free year {#feedback}

`sealctl buy` also offers feedback instead of paying:

- **Give feedback** asks four short questions: what you use sealctl for, whether $5.99 once is fair, what is missing, and one optional line. It gives this phone a year's licence, once per phone.
- **I'd buy it**, where the menu shows it, records that you would buy. Nothing is charged.

The answers are sent with your phone's id, with no name or email. See [Privacy](/privacy#feedback) for what is kept. While the year lasts, `sealctl status` shows `Licensed until 2027-11-26 (feedback)`. In its last 30 days, the one line that would ask you to pay says once when the year ends instead: `Your free year of sealctl ends on 26 Nov 2027. It's $5.99 once: sealctl buy`. Then sealctl counts as unpaid again, and $5.99 once pays for it as usual.

### Team seats {#seats}

```sh
sealctl buy --seats 10          # one checkout for 10 seats; prints a seat code
sealctl buy --code ACME-7KQ2    # each developer claims a seat
```

A claimed seat stays with that person.

### Moving a licence {#licence-move}

Restoring a phone from your words keeps the licence, or what is left of a free year.

Payments are handled by Paddle, our merchant of record. See [Refunds](/refunds).

## CLI reference {#cli}

Every command, one line each. `sealctl <command> --help` shows the flags. Global flags: `-v` (more logging on stderr, never values; `-vv` for debug), `--relay <origin>`, `--version`, `--help`.

### Session and machine {#cli-session}

- `sealctl status [--json]`: the session and this machine; never asks the phone.
- `sealctl open`: open the session now (store key, volumes, backup keys).
- `sealctl lock [--force] [--no-backup]`: back up, unmount volumes, wipe keys. `--force` unmounts busy volumes.
- `sealctl pair [--name <user@host>] [--force]`: pair this machine with the app.
- `sealctl unpair [--yes]`: unpair this machine; sealed objects stay.
- `sealctl cancel [<id>] [--yes]`: cancel a delayed level 3 action approved on the phone.
- `sealctl doctor [--json]`: check the pairing, relay, clock, daemon, services, file permissions, tools and hooks.

### Secrets {#cli-secrets}

- `sealctl secret set <name> [--from-clipboard] [--own-approval] [--force]`: store a value from the clipboard, stdin or a hidden prompt.
- `sealctl secret get <name> [--clip] [--show]`: print or copy a value; refused inside an agent.
- `sealctl secret ls [--json]`: names; no key needed.
- `sealctl secret rm <name> [--yes]`: remove a secret.
- `sealctl secret mv <old> <new>`: rename a secret.
- `sealctl secret store [--use <folder>] [--json]`: show the store folder, or use another one.
- `sealctl secret import-env [FILE] --prefix <p> [--delete] [--force]`: same as `sealctl seal env`.
- `sealctl run [-e NAME=secret]... [--no-project] -- <command>`: run a command with secrets in its environment.
- `sealctl project trust [PATH]`: trust a `.sealctl.toml` as it is now.
- `sealctl scan [PATH...] [--home] [--dry-run] [--yes] [--json]`: find keys in files and seal them.

### Agents {#cli-agents}

- `sealctl ai install [TOOL...]`: skill, hooks and deny rules for every detected agent, or the named ones (`claude`, `codex`, `gemini`, `qwen`, `copilot`, `cursor`, `antigravity`, `kiro`, `agents`).
- `sealctl ai uninstall [TOOL...]`: remove exactly what install added.
- `sealctl ai status [TOOL...]`: what is installed.
- `sealctl rules [--json]`: remembered agent answers on this machine.

### SSH and git {#cli-ssh}

- `sealctl ssh keygen [<name>] [--comment <c>]`: new Ed25519 key `ssh/<name>` (default `ed25519`).
- `sealctl ssh pubkey [<name>]`: the public key line.
- `sealctl ssh setup`: the `~/.ssh/config` lines for sealctl's agent.
- `sealctl ssh import <file> [--name <n>]`: same as `sealctl seal ssh`.
- `sealctl git setup [--local] [--key <name>] [--undo]`: sign commits and tags through sealctl's agent.
- `sealctl git credentials <host> [--undo]`: git gets the token for `https://<host>` from the secret `git/<host>`.

### Volumes {#cli-volumes}

- `sealctl volume create <name> [--kind apfs|sparsebundle|luks] [--size 50g] [--container diskN] [--path P] [--mountpoint M] [--manual]`: create and mount a volume.
- `sealctl volume ls [--json]`: list volumes.
- `sealctl volume open <name>`: mount one volume.
- `sealctl volume close <name> [--force]`: unmount one volume.
- `sealctl volume import <name> <target> [--kind K] [--mountpoint M]`: register a sealed volume, or take over one of yours.
- `sealctl volume rm <name> [--delete-data]`: forget a volume; `--delete-data` destroys it.

### Backups {#cli-backups}

- `sealctl backup init <name> --from <volume or folder> --repo <URL> [-e VAR=value]...`: a new restic repository.
- `sealctl backup run [<name>...] [--all] [--if-open] [--quiet]`: back up now.
- `sealctl backup snapshots <name> [--json]`: list snapshots.
- `sealctl backup restore <name> --target <dir> [--snapshot latest] [--include P]...`: restore a snapshot.
- `sealctl backup check <name> [--read-data <pct>]`: `restic check`.
- `sealctl backup policy <name> [--on-lock B] [--scheduled B] [--keep-daily N] [--keep-weekly N] [--keep-monthly N]`: when backups run and what they keep.
- `sealctl backup schedule install [--every 60]`, `sealctl backup schedule uninstall`: the hourly schedule.

### Seal, unseal and recover {#cli-seal}

- `sealctl seal volume <name> <APFS volume (name, UUID or disk) | sparse bundle | LUKS file> [--mountpoint M] [--manual] [--words]`: take over a volume.
- `sealctl seal backup <name> --repo <URL> [--from <volume or folder>] [-e VAR=value]... [--keep-old-password] [--words]`: take over a restic repository.
- `sealctl seal ssh <file> [--name <n>]`: take over an SSH key.
- `sealctl seal secret <name> [--from-clipboard] [--force]`: store a secret.
- `sealctl seal env [FILE] --prefix <p> [--delete] [--force]`: move a `.env` file into the store.
- `sealctl seal --from <handback.json> [--skip <kind>/<name>]... [--words]`: take over everything in a hand-back list.
- `sealctl unseal secret <name> | secrets | volume <name> | backup <name> | ssh <name> | git | ai [TOOL...]`: hand one object back.
- `sealctl unseal --all`: hand everything back, then remove sealctl's settings, services, hooks and pairing.
- `sealctl unseal --resume`: continue the newest unfinished run.
- Flags of `unseal`: `--dry-run`, `--words`, `--skip <kind>/<name>`, `--keep-store`, `--to folder|keychain|op|bw|show`, `--secrets-to folder|keychain|op|bw|env`, `--env-file F`, `--op-vault V`, `--bw-folder F`, `--type-passwords`, `--no-ssh-passphrase`, `--json`.
- `sealctl recover <target> [--out <dir> | --name <secret> [--show]] [-- <restic arguments>]`: open an object with the 24 words alone.

### Words and objects {#cli-words}

- `sealctl inventory [--json]`: objects this machine knows.
- `sealctl migrate [--depth rewrap|re-encrypt] [--yes] [--json]`: move objects to new words, or re-encrypt them.
- `sealctl migrate --status | --pause | --resume | --cancel`: the re-encryption job.
- `sealctl migrate --scan [PATH...]`: find sealed objects by their markers.

### Other {#cli-other}

- `sealctl buy [--seats N] [--code CODE]`: $5.99 once.
- `sealctl completions bash|zsh|fish`: shell completions.

### Environment variables {#env}

| Variable | Effect |
| --- | --- |
| `SEALCTL_RELAY` | Relay origin (default `https://relay.sealctl.com`); recorded at pairing |
| `SEALCTL_NO_DAEMON=1` | No daemon: each command asks the phone itself (CI runners, containers) |
| `SEALCTL_AGENT=1` | Treat this process as inside an AI agent |
| `SEALCTL_NO_MASK=1` | No masking in `sealctl run` (ignored inside an agent) |
| `SEALCTL_NO_SERVICE=1` | Don't install login services |
| `SEALCTL_RESTIC` | The restic binary (default `restic` from `PATH`) |
| `SEALCTL_SSH_DIR` | Instead of `~/.ssh` |
| `SEALCTL_LOG` | `warn` (default), `info` or `debug`. Never values |
| `NO_COLOR` | No colour |
| `CI` | Never prompt |

### Files {#files}

| Path | What |
| --- | --- |
| `~/.config/sealctl/config.toml` | Relay, store folder, `notifications = false` |
| `~/.config/sealctl/machine.json` | This machine's pairing key (0600; sealctl refuses a readable one) |
| `~/.config/sealctl/volumes/`, `backups/` | Volume and backup definitions; no keys |
| `~/.local/share/sealctl/store/<store-id>/` | The secret store, encrypted |
| `~/.local/state/sealctl/` | Daemon and SSH agent sockets, session state, logs; no keys or values |
| `~/.ssh/sealctl_<name>.pub` | SSH public keys |

`XDG_CONFIG_HOME`, `XDG_DATA_HOME` and `XDG_STATE_HOME` move these folders.

## Exit codes {#exit-codes}

| Code | Meaning |
| --- | --- |
| 0 | Done |
| 1 | Another error |
| 2 | Usage error: bad arguments, a different relay, another `unseal` run active |
| 3 | Not paired, or this machine was unpaired |
| 4 | Declined on the phone; also a wrong number, held requests, no biometrics, or a delayed action cancelled |
| 5 | No answer from the phone in 5 minutes |
| 6 | Relay unreachable or relay error |
| 7 | Relay limit reached |
| 8 | Refused: inside an AI agent, or needs a terminal |
| 9 | Not found: secret, volume, backup, object, or nothing pending to cancel |
| 10 | Wrong words or wrong key |
| 11 | Volume busy |
| 12 | This computer's clock is off by more than 5 minutes |
| 13 | Stopped part way: run it again with `--resume` |

`sealctl run` exits with the program's own code, or 128 plus the signal number when it was killed. Every error is one line on stderr starting with `sealctl: `, then at most one line saying what to do.

## Troubleshooting and FAQ {#faq}

Start with:

```sh
sealctl doctor
```

It checks the pairing, the relay, the clock, the daemon and its service, file permissions, the tools volumes and backups need, and the agent hooks, and prints one line per check.

### `Waiting for your phone`, and nothing arrives {#faq-waiting}

Check that the phone is online and sealctl's notifications are on. In the app, **Settings**, **Notifications**, **Send a test request**. On Android, a phone that limits sealctl in the background may deliver requests late; the app says so. A request expires after 5 minutes (exit 5); run the command again.

### `This machine is not paired` or `was unpaired on your phone` {#faq-unpaired}

Run `sealctl pair`. Your sealed objects open again once the machine is paired with the same phone or words.

### `Cannot reach the relay` or `The relay failed` {#faq-relay}

Check your connection and the [status page](/status). Network errors are retried three times. `HTTPS_PROXY` and `NO_PROXY` are honoured. Your files still open without the relay: see [recover](#recover).

### `This computer's clock is ... minutes off` {#faq-clock}

Requests are signed with the time. Turn on automatic date and time, then try again.

### `Your phone reached the relay's daily limit` {#faq-limit}

The relay takes up to 5,000 requests a day per phone. It resets at 00:00 UTC.

### `Volume ... is busy` {#faq-busy}

A program has files open on it; sealctl names it. Close it, or use `sealctl volume close <name> --force`. See [Busy volumes](#busy).

### `Sealed with seed 7Hq3; your phone has seed qHWf` {#faq-other-words}

The object was sealed with other words than your phone's. If those are your retired words, the phone asks you to type them. Otherwise open it with the right card: `sealctl recover`.

### `The number picked on your phone was not 59` {#faq-number}

Nothing changed. For an hour the phone ignores sensitive requests from that machine. If it was your mistake, release it on the machine's page in the app and try again. If you didn't run anything there, someone else may be using that machine: see [Lost phone or machine](#lost-machine).

### `Your phone could not tell it is near this machine` {#faq-near}

Run the command at the machine's own terminal, so it shows a number you can pick on the phone.

### `Your phone needs Face ID or a fingerprint for this` {#faq-biometrics}

Set up Face ID or a fingerprint on the phone, or use your card: add `--words` to the command.

### `Not inside an AI agent` {#faq-agent}

The agent tried a command that would show it a secret. Use `sealctl run -- <command>`, or run the command yourself in your own terminal.

### Does sealctl work if the company behind it disappears? {#faq-gone}

Yes. Your 24 words open every object with `sealctl recover`, and `sealctl unseal --all --words` hands everything back, with no phone, relay or company. The command line tool and the app are open source.

### Does sealctl see my secrets? {#faq-privacy}

No. Requests and replies are encrypted between your computer and your phone. The relay sees ids, sizes and timing. Places leave the phone only inside its encrypted backup, which the relay cannot open. See [Privacy](/privacy) and [Security](/security).

### Is it free? {#faq-free}

Yes. Everything works without paying. See [Paying](#paying).

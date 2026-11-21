---
title: Paying for sealctl
description: What sealctl buy does, who can pay, team seats, and moving a licence.
---
# Paying for sealctl

> **Status.** Paying arrives with the phone version ({{release.phoneVersion}}). Today there is nothing to buy and nothing asks you to.

sealctl is free. After 30 days with use, your terminal asks once a week whether it has earned $5.99, once. See [Pricing](/pricing).

## `sealctl buy`

```text
$ sealctl buy
Who pays?
  1  Me             card, opens checkout
  2  My company     invoice with VAT ID, opens checkout
  3  Someone else   copies a payment link to send
Choose 1, 2 or 3:
```

- **Me** opens Paddle's checkout and waits until the licence arrives.
- **My company** opens the same checkout, where Paddle asks for the company and its VAT ID, and copies a short message for your team chat with the link.
- **Someone else** copies a payment link that anyone can pay.

`sealctl buy` is refused inside AI agents.

## Team seats

`sealctl buy --seats 10` buys ten seats and gives one code. Each developer runs `sealctl buy --code XXXX-XXXX`. A claimed seat stays with that person.

## Moving a licence

The licence belongs to your phone's identity. Restoring from your words keeps it; changing your words moves it to the new identity.

Payments are handled by Paddle, our merchant of record. [Refunds](/refunds).

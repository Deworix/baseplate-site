# Your checkpoint test needs a backward step

Touch checkpoint 3. Go back and touch checkpoint 1. Reset your character.

If your obby keeps the highest checkpoint reached **during this server session**, the player should still respawn at 3. A forward-only test can miss a regression to 1.

[Try the three-move browser challenge first](https://baseplatedev.com/break-the-checkpoint.html). It illustrates this rule; the Studio instructions below test an actual game.

## Run this on a disposable copy of your own game

1. Start a normal Studio Play session with a real player.
2. Touch checkpoint 3, reset, and confirm the respawn is near 3. This is the baseline.
3. With the same player in the same session, touch the earlier checkpoint 1.
4. Reset again. Assert that the respawn is still near 3, not merely that the character exists or Output is quiet.
5. After a change, start a fresh Play session and repeat the **same actions and assertions**.

Choose a distance tolerance that fits your own checkpoint geometry and spawn offset. Our fixture used 8 studs; that is not a universal threshold.

## The guard in our own example

The demonstration kept session progress in a server-owned `lastStageByUserId` table. Its existing handler had already checked that `stage` was an integer and the touching character belonged to a living player.

Before: it unconditionally assigned the touched stage, so touching 1 overwrote 3.

After: the handler added this guard immediately before the assignment:

```luau
local current = lastStageByUserId[player.UserId]
if current ~= nil and stage <= current then
    return
end

lastStageByUserId[player.UserId] = stage
```

This is a fragment of that handler, **not a complete checkpoint or save system**. It implements monotonic progress; games with intentional checkpoint selection need a different rule. It also does not enforce adjacent-stage progression or prevent a player from skipping ahead.

## What we actually measured

Released Baseplate 0.23 Free, Regression Lab, a private local Studio fixture, and the identical player journey before/after a **manual** guard change:

| After touching 1 and resetting | Distance from checkpoint 3 | Result |
|---|---:|---|
| Original handler | 44.03 studs | FAIL |
| Handler with guard | 4.71 studs | PASS |

The nonzero passing distance includes the fixture's spawn offset above the part. A PASS covers these assertions, not the whole game.

[Watch the 14-second edited example with actual Studio and Baseplate captures](https://baseplatedev.com/media/2026-10/baseplate-checkpoint023-20261016-9eeba114.mp4).

This example is **session-only**. It does not test DataStore persistence, leaving/rejoining, multi-server saving, forward-skip protection or every player's state isolation. Those are separate checks. No agent autonomously fixed this example.

## Want help with one useful result?

Baseplate's [Founding 10](https://baseplatedev.com/founding-10.html?utm_source=checkpoint_checklist&utm_medium=owned_resource&utm_campaign=023_first_win) offers free hands-on setup for Map, Verify or one gameplay test. No purchase or public review required. Map/Verify reads need no AI account; gameplay replay needs Studio integration. Open Cloud is optional.

Written and published by Baseplate. Own demonstration, not a customer testimonial.

---
title: SSD buying guide: NVMe vs SATA, Gen4 vs Gen5, how much you need
description: Which SSD to put in a gaming PC in 2026 - NVMe vs SATA, PCIe Gen4 vs Gen5, what today's big games take up, and why 1TB is the floor and 2TB is comfortable.
date: 2026-11-11
tags: storage, ssd, upgrades, buying guide
---
Short answer: buy an NVMe SSD (solid state drive) on PCIe Gen4, and buy at least 1TB. Gen5 costs more, needs cooling, and no game we checked asks for it. 2TB is the comfortable size if you keep more than a handful of big games installed. That is exactly what goes into [our builds](builds.html): a Kingston NV3 1TB in the Mainstream and Performance, and a WD_BLACK SN7100 2TB in the Quiet Creator.

## NVMe or SATA

Two kinds of SSD fit a desktop PC:

- **SATA** - the older 2.5 inch drive that connects with a cable, the same plug a hard drive uses. Samsung's own figures for its 870 EVO, the best known SATA SSD, are up to 560 MB/s read and 530 MB/s write, because the SATA 6Gbps connection tops out there.
- **NVMe** - a small stick that plugs straight into the motherboard's M.2 slot and talks over PCIe (PCI Express), the same bus the graphics card uses. No cables, and roughly ten times the sequential speed of SATA.

For a new build the answer is NVMe. SATA still makes sense as a second drive for photos, video and old games, or when you are reusing one you already own. The motherboard in all three of our builds, the MSI PRO B850-S WIFI6E, has two M.2 slots and four SATA ports, and each build ships with one NVMe drive, so there is a free M.2 slot and four SATA ports waiting for whatever you add later.

## Gen4 or Gen5

PCIe comes in generations, and each one doubles the bandwidth of the slot. The current mainstream is Gen4; Gen5 drives are the new, expensive tier.

| Drive | Interface | Rated read / write | Endurance | Warranty |
|---|---|---|---|---|
| Kingston NV3 1TB (our Mainstream and Performance) | PCIe 4.0 x4 | 6,000 / 4,000 MB/s | 320 TBW | 5 years |
| WD_BLACK SN7100 2TB (our Quiet Creator) | PCIe 4.0 x4 | 7,250 / 6,900 MB/s | 1,200 TBW | 5 years |
| Samsung 9100 PRO 2TB (a Gen5 example) | PCIe 5.0 x4 | 14,700 / 13,400 MB/s | 1,200 TBW | 5 years |

Figures are from each maker's spec page or datasheet. TBW (terabytes written) is how much data the maker guarantees you can write before the warranty ends. Installing a game writes roughly its install size and day-to-day play writes very little, so even 320 TBW is years of normal use.

Gen5 is rated at about twice the sequential speed of Gen4; Samsung's own line for the 9100 PRO is "moving data twice as fast as the previous generation". For games it mostly does not show, because much of a loading screen is spent unpacking data rather than reading it. The requirements pages for the three big games below all say "SSD required", and none of them names a PCIe generation.

Gen5 drives also need cooling. Crucial's page for its T705 Gen5 drive says the non-heatsink version "must be installed with a motherboard or alternate heatsink to achieve optimal performance". Our board's M.2_1 slot does support Gen5 with the Ryzen 9000 chips we use, so a Gen5 drive can be fitted, or added later, if your work really needs it. For gaming we spend the money elsewhere.

## How much space games take now

Three current numbers, from each game's own requirements page:

| Game | Space listed | SSD required? |
|---|---|---|
| Call of Duty: Black Ops 7 (Activision support page) | SSD with 116 GB available space at launch, more for updates | Yes |
| Baldur's Gate 3 (Steam page) | 150 GB available space | Yes |
| Cyberpunk 2077 (Steam page) | 70 GB available space | Yes |

Windows 11 itself needs a "64 GB or larger storage device" by Microsoft's minimum spec, and in practice the operating system, updates and a few apps take more. Add the three games above to Windows and you have used about 400 GB.

Two more things shrink the number on the box. A "1TB" drive is one trillion bytes, and Windows counts in 1,024-based units, so it shows as about 931 GB. And keep some space free - a drive run to the brim makes installs and updates a chore.

So:

- **1TB** - Windows, one or two of the biggest games and a few smaller ones. Fine if you play a couple of games at a time and uninstall what you are done with. This is the drive in our Mainstream and Performance builds.
- **2TB** - the comfortable size. A full library of current games with room for updates, recordings and photos. This is the drive in our Quiet Creator, and a swap we offer on the other two.
- **4TB** - for people who record gameplay, edit video, or never uninstall anything.

## What it costs right now

From our [price log](price-report.html) on Nov 7: the Kingston NV3 1TB was $159.00 and the WD_BLACK SN7100 2TB was $338.99. Both have drifted up since the log started on Oct 14, when they were $149.99 and $319.00. Storage has not jumped the way memory and graphics cards have this fall, but it is not falling either.

On any of our builds the 2TB drive can replace the 1TB, and like every part it shows up as its own line on the quote at cost plus 5%.

## Upgrading the PC you already have

If your current PC boots from a hard drive or a small SATA SSD, a drive swap is a cheap upgrade you feel every day. Storage swaps are on our [services page](services.html): labor is quoted up front before any work starts, and the drive is at cost plus 5%. Back up what matters first - we take care with your data, but as our terms say, we cannot be responsible for it. If you are weighing a drive swap against a whole new machine, our [upgrade or buy new](blog-upgrade-or-buy-new-pc.html) post walks through that decision.

Tell us how many games you keep installed on the [quote form](quote.html), or start from the [current builds](builds.html) and ask for the 2TB drive if you want the room.

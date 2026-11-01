---
title: Five settings to check on a new gaming PC
description: Memory profile, monitor refresh rate, graphics driver, Windows power mode and updates - what each does, where to find it, and which we set before delivery.
date: 2026-11-05
tags: setup, memory, drivers, monitors
---
Short answer: before you judge how a new gaming PC runs, check five things. The memory profile (EXPO or XMP) in the BIOS, the refresh rate your monitor is actually using, the graphics driver, the Windows power mode, and Windows Update. None of them costs anything, and with all five wrong a PC feels like one from a tier below. On a PC we build, the first three are done before it leaves the workshop: [Standard assembly](services.html) includes a BIOS (Basic Input/Output System) update, the memory profile set, and Windows 11 with current drivers, and the Premium setup tunes the monitor's refresh rate at your desk. This post is for everyone else.

## 1. The memory profile: the one most often missed

Memory kits have a rated speed, and the memory in our builds is DDR5-6000: a Kingston FURY Beast RGB 16GB kit in the Mainstream, a Corsair Vengeance 32GB kit in the Performance and Quiet Creator. The catch is that the processor's default is lower. AMD's spec page for the Ryzen 5 9600X lists its maximum memory speed as DDR5-5600 with two sticks, and that is what the board uses out of the box. The extra speed you paid for sits unused until someone turns on the kit's profile.

On an AMD board that profile is called EXPO (Extended Profiles for Overclocking). AMD describes it as user-friendly memory overclocking for Ryzen processors on socket AM5, with Ryzen-optimized profiles so the kit runs at its rated speed in one step. Kingston's FURY Beast is on AMD's list of EXPO partners. XMP (Extreme Memory Profile) is the Intel version of the same idea, and most AM5 boards read both.

To check it: open Task Manager, go to Performance, then Memory, and read the speed. If a 6000 kit reports 5600 or 4800, the profile is off. Turning it on means restarting into the BIOS, finding the EXPO or XMP switch, and picking the kit's own profile - the rated one, nothing beyond it. Our [16GB memory post](blog-is-16gb-ram-enough-for-gaming-2026.html) covers how much memory you need; this is about making the memory you have run at full speed.

## 2. The refresh rate your monitor is really using

A 144 Hz or 165 Hz monitor only shows that many frames if Windows is set to it. Microsoft's help page gives the steps: Start, then Settings, System, Display, Advanced display settings, choose the monitor if you have more than one, and pick the rate under Refresh rate. Microsoft's own description of the gain is less motion blur and screen tearing, lower input lag and better responsiveness in games. One detail from the same page: rates marked with an asterisk are not supported at your current resolution, so choosing one changes the resolution too.

Check it after every new monitor or cable. Our [monitor post](blog-monitor-resolution-1080p-1440p-4k.html) explains which resolution fits which build; this setting turns the monitor's headline number into frames you can see.

## 3. The graphics driver

The driver sits between Windows and the graphics card, and the makers update it often with fixes for new games. Each brand has its own installer:

- **Radeon cards** (the RX 9060 XT in the Mainstream, the RX 9070 XT in the Performance) use AMD Software: Adrenalin Edition. AMD's support site has an Auto-Detect and Install tool that finds your card and downloads the right package. The RX 9070 XT driver page lists a Recommended release, the tested one for most people, and an Optional release with the newest game fixes; the two most recent are dated Oct 20 and Oct 30, 2026.
- **GeForce cards** (the RTX 5070 Ti in the Quiet Creator) use the NVIDIA app, which NVIDIA describes as the place to keep drivers up to date, optimize games and tune the card.

Install the maker's package rather than relying on whatever Windows picked. We install the current driver on every build, and a yearly [tune-up](services.html) includes BIOS, driver and Windows updates for any desktop, not only ours.

## 4. The Windows power mode

Windows 11 has three power modes: Best power efficiency, Balanced and Best performance. Microsoft's page puts them under Start, Settings, System, Power & battery. Balanced is the default and is fine for a gaming desktop. Best performance maximizes speed at the cost of more electricity, a small price on a desktop with no battery. The one to avoid on a gaming PC is Best power efficiency. If the setting is greyed out, Microsoft says a custom power plan is selected: open Control Panel, System and Security, Power Options, and choose Balanced to get the modes back.

## 5. Windows Update and the BIOS

Run Windows Update until it finds nothing more, then restart. A fresh install can be months behind, and game launchers and anti-cheat expect a current Windows. The BIOS is the same idea one level down: board makers release updates for memory compatibility and newer processors. A bad flash can leave a board dead, so if you are not comfortable with it, leave it to someone who does it every week. We update the BIOS on every build before the memory profile goes on.

## What we set before delivery

| Setting | Where it lives | On a Frame Foundry build |
|---|---|---|
| Memory profile (EXPO or XMP) | BIOS | Set in Standard assembly |
| BIOS update | BIOS | Done in Standard assembly |
| Graphics driver | AMD Adrenalin or NVIDIA app | Current driver installed |
| Monitor refresh rate | Windows display settings | Tuned in Premium setup, or do it yourself in a minute |
| Windows Update | Windows settings | Run in Standard setup |

The [builds page](builds.html) lists every part in the Mainstream ($2,099), Performance ($2,699) and Quiet Creator ($3,899), prices before sales tax. Already have a PC and not sure its memory or driver are where they should be? Say so on the [quote form](quote.html) and we will tell you what to check, or come and do it.

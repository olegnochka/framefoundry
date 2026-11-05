---
title: Wi-Fi or a cable for online games: what to use and when
description: A network cable beats Wi-Fi for online games. When Wi-Fi is good enough, when powerline or mesh helps, and what the network ports on our builds can do.
date: 2026-11-09
tags: networking, wi-fi, setup, online games
---
Short answer: if a network cable can reach the PC, use it. A cable does not make your internet plan faster, but it keeps the connection steady, and steady is what online games need. If a cable cannot reach, good Wi-Fi on the 5 GHz or 6 GHz band is fine for most players, a powerline kit is worth a try when the router is several walls away, and a mesh system fixes weak coverage around the house rather than lag at one desk. Every one of [our builds](builds.html) has both a wired network port and Wi-Fi built in, so you can use either one, or switch later.

## Why a cable wins for games

Online games care about three numbers, and download speed is not one of them. Epic Games' own Fortnite latency guide lists them: average ping (the round trip to the game server, in milliseconds), packet loss and jitter. Epic says packet loss should be 0% and that anything consistently above about 1% causes problems in game, and that jitter matters as much as the average. Its first two fixes are to restart the modem and router, and to use a wired Ethernet connection, because wireless can add delay due to signal loss.

Wi-Fi shares the air with every phone, TV and neighboring network, so its delay moves around. A cable's does not.

## What is on the back of our builds

All three builds use the same motherboard, the MSI PRO B850-S WIFI6E ($139.99 in our [price log](price-report.html) on Nov 5). MSI's specification page lists:

- **Wired:** a Realtek 2.5G LAN (local area network) port - 2.5 gigabits per second, more than a gigabit internet plan can fill.
- **Wireless:** Wi-Fi 6E on the 2.4 GHz, 5 GHz and 6 GHz bands, up to 2.4 Gbps. MSI notes that the 6 GHz band needs Windows 11, which every build ships with.
So the PC is not the weak link. The router and what sits between it and the desk decide the rest.

## Staying on Wi-Fi: pick the right band

Microsoft's help page on Wi-Fi and your home layout compares the three bands:

| Band | Good at | Weak at |
|---|---|---|
| 2.4 GHz | Longest range, best through walls | Slowest, and congested - microwaves, cordless phones and Bluetooth share it |
| 5 GHz | Faster, more channels, less congested | Shorter range, weaker through walls |
| 6 GHz | Low congestion and lower latency; Microsoft calls a strong 6 GHz connection the best for gaming | Shortest range; needs a Wi-Fi 6E router |

For games that means 5 GHz or 6 GHz. The same page suggests giving each band its own network name so you can see which one the PC is on, and moving the router toward the middle of the home and higher up, not into a corner or under a desk.

## Test before you spend anything

Epic's guide includes a free test. In Windows 11, click Start, type cmd, press Enter, then run:

`ping ping-ncal.ds.on.epicgames.com -n 50`

That sends 50 packets to Northern California, one of the North America endpoints on Epic's list. Read the average, the packet loss, and how far apart the minimum and maximum are. Epic's warning: an idle connection can look perfect, so test again while someone else at home is streaming or downloading.

If the numbers are clean on Wi-Fi, buy nothing. If not, two more of Epic's tips are free: avoid big uploads on the same network while you play (our [streaming post](blog-gaming-pc-for-streaming.html) explains why upload is the tight side of most plans), and turn on QoS (Quality of Service) or gaming mode if your router has one.

## When a powerline kit helps

A powerline kit is two adapters that send the network through your home's electrical wiring: one by the router, one by the PC. It suits a room where Wi-Fi is weak and a long cable is not practical. It depends on the wiring, so follow TP-Link's advice for its adapters:

- Plug each adapter straight into a wall outlet. A power strip or surge protector can filter or block the signal.
- Keep them away from anything with a motor - air conditioners, washing machines, fans, kitchen appliances.
- Keep phone and laptop chargers away from them; they add noise to the line.

Results vary from house to house, so buy from a store with an easy return window and run the ping test before and after.

## When mesh helps

Mesh replaces one router with several nodes spread around the home. It fixes dead zones, not necessarily lag, because a node that reaches the router over Wi-Fi is still on Wi-Fi.

The version that helps games is wired backhaul. eero, one of the mesh makers, puts it this way on its blog: plugging the nodes into the router with Ethernet cables, rather than relying on a wireless link, frees up bandwidth and improves speed, stability and latency. If you can run that cable, though, you can usually run one to the PC as well.

## Which one for your room

| Your situation | What to do |
|---|---|
| Router in the same room, or a cable can reach | Plug in the cable |
| One or two walls away, ping test is clean | Stay on 5 GHz or 6 GHz Wi-Fi |
| Far room, Wi-Fi drops packets, no way to run a cable | Try a powerline kit, test, return it if it does not help |
| Weak Wi-Fi all over the house | Mesh, wired between nodes if you can |

Our [in-home setup](services.html) includes getting the PC onto your Wi-Fi or wired network, and our [new PC settings post](blog-new-gaming-pc-settings-to-check.html) covers the rest of the first-day checklist. Tell us where the router is and which room the PC is going in on the [quote form](quote.html), or start from the [current builds](builds.html).

# IP location for Lizun

Where the internet sees this computer right now, in the [Lizun](https://github.com/StreetYo/Lizun)
island: the public IP address, the country with its flag, the city and region, and the provider.
Handy for checking a VPN at a glance: turn it on or off, open the island, and the new place is
there.

## Install

In Lizun, open Settings > Widgets > Add a widget, paste this link and press Install:

```
https://github.com/StreetYo/lizun-ip-location
```

To install a fixed version, use the link of a release instead, for example
`https://github.com/StreetYo/lizun-ip-location/releases/tag/v1.0.0`.

The widget needs a Lizun build with `network.request` and `clipboard.writeText`.

## Using it

- The widget checks when it starts, every few minutes (5 by default), when you press the
  arrows in its corner, and when you open the island and the last check is older than 20
  seconds. "checked 12 s ago" at the bottom says how fresh it is.
- Click the IP address to copy it. The IPv6 address, shown under it when this computer has
  one, copies the same way.
- When the IP address or the country changes, the name and address light up and the bottom line
  says where the computer was seen before, such as "Changed from 🇷🇺 Moscow", for ten minutes.
  The last place is remembered, so a change while Lizun was closed shows up too.
- The closed island shows the place, such as `Amsterdam · M247` and `🇳🇱 NL`: always, only for
  30 seconds after a change (the pin turns orange then), or never.
- When no service can be reached, the last place stays on screen, dimmed, with the time it was
  found and a Try again button; the closed island shows nothing until the next good check.

Windows has no flag emoji in its emoji font, so there the widget shows the country code (`NL`)
in place of the flag. Computers that draw flags get the flag.

Settings (Settings > Widgets > IP location): how often to check (1–60 minutes), whether to show
the IPv6 address, and what the closed island shows.

## Where the data comes from

Lizun sends the requests itself, so they go through the VPN like any other app's. The widget
asks [ipwho.is](https://ipwho.is) first. When it fails or says there were too many requests, it
asks [ipapi.co](https://ipapi.co), then [ipinfo.io](https://ipinfo.io); a service that refused
for too many requests is left alone for 15 minutes. The IPv6 address comes from
[ipify](https://www.ipify.org) (`api6.ipify.org`), which cannot be reached without IPv6. These
free services have daily or monthly limits; checking every few minutes stays well inside them.
The location is the one the services have on record for the address, usually right about the
country and often only roughly right about the city.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Keeps the last place found and the last change, to spot a change after a restart. They stay on this computer, in Lizun's own storage. |
| `activity` | Shows the place in the closed island. |
| `clipboard:write` | Copies the IP address when you click it. |
| Network `https://ipwho.is`, `https://ipapi.co`, `https://ipinfo.io` | Find the public IP address and its place. Each is asked only for this computer's own address; nothing else is sent. |
| Network `https://api6.ipify.org` | Finds the IPv6 address. |

## Development

The widget is plain HTML, CSS and JavaScript with no build step:

| File | What it is |
|---|---|
| `manifest.json` | Id, size, permissions, network, settings and their Russian translation |
| `index.html`, `style.css` | Page shown in the island, built on the island theme (`--lz-*` variables) |
| `main.js` | Checks and when to check, drawing, copying, settings and language |
| `lookup.js` | Asks the services in turn and turns their answers into one shape |
| `place.js` | Flags, country names, short provider names, what counts as a change |
| `island.js` | What the closed island shows |
| `texts.js` | The widget's texts in English and Russian, times |

To try changes, choose this folder in Settings > Widgets > Add a widget, or copy it to
`%APPDATA%\app.lizun.desktop\widgets\lizun.ip-location\` and press Reload. How widgets work:
[Writing a Lizun widget](https://github.com/StreetYo/Lizun/blob/master/docs/widgets.md).

To release a version, raise `version` in `manifest.json`, then tag and publish a GitHub release
(`v1.0.1`).

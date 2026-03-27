# Hardware Middleware Connection Notes

Updated: March 27, 2026

These notes are for connecting this app PC to the hardware PC middleware described in:

- `C:\Users\Mahir Kachwala\Downloads\MIDDLEWARE_DEPLOYMENT_GUIDE.md`
- `C:\Users\Mahir Kachwala\Downloads\OTHER_LAPTOP_APP_INTEGRATION_README.md`

## What is already true from those docs

- Public hosting is not required just to connect the two machines.
- The app PC should call only the middleware contract:
  - `GET /api/middleware/v1/info`
  - `GET /api/middleware/v1/pins/:containerPin`
- The current documented hardware-PC local base URL is:
  - `http://172.20.10.14:3101`

## What this repo now supports

This repo now exposes local proxy endpoints on the app PC:

- `GET /api/hardware/middleware/info`
- `GET /api/hardware/middleware/pins/:containerPin`

Those routes forward to the hardware PC middleware when this environment variable is set:

- `HARDWARE_MIDDLEWARE_BASE_URL`

Optional:

- `MIDDLEWARE_INTEGRATION_KEY`
- `HARDWARE_MIDDLEWARE_TIMEOUT_MS`

## App-PC setup

For the current parent app dev server:

1. Open:
   - `C:\Users\Mahir Kachwala\Downloads\Swasthya Setu Child\swasthya app\app\artifacts\swasthya-setu`
2. Create `.env` from `.env.example`
3. Set:
   - `HARDWARE_MIDDLEWARE_BASE_URL=http://<reachable-hardware-ip>:3101`
4. If the hardware PC later enables the shared key, also set:
   - `MIDDLEWARE_INTEGRATION_KEY=<same key>`

## What still must be true on the hardware PC

The hardware PC must be reachable from this app PC.

That means one of these must work:

- same reachable Wi-Fi/LAN IP
- Tailscale / ZeroTier / overlay DNS name
- another private network path between the machines

The middleware backend on the hardware PC must also be running and listening on port `3101`.

## Current observation from this app PC

When tested on March 27, 2026 from this machine, the documented endpoints timed out:

- `http://172.20.10.14:3101/api/middleware/v1/info`
- `http://172.20.10.14:3101/api/middleware/v1/pins/472901`

So the remaining blocker is network reachability or the current hardware-PC runtime state, not public hosting.

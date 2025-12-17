# Notoko Web UI

Start the application with: `pnpm dev`. (currently, the build process is broken.
And since the plugin system utilzes dynamic imports, even if we fixed the build
process, I doubt the production build that gets rid of Vite's dev server will
work without further modifications.)

> [!CAUTION]
>
> Despite being built on top of the web stack, this application is ONLY intended
> to be used locally.
>
> DO NOT EXPOSE IT TO THE PUBLIC, since I have not considered the security
> implications of such scenario at all.

## FIXME

- [ ] Plugins are unrestricted.
  - Solution: sandboxing with `rusty_v8`.
  - Why not fixing it now: plugins are all written by myself for now.
- [ ] Plugin UI components are unrestricted.
  - Solution: sandboxing with `iframe`s.
  - Why not fixing it now: ditto.
- [ ] The initial request to the server is slow.
  - The current architecture only do initialization after the first request, and
    the way to detect whether initialization has been done is very hacky.
  - Solution: Get rid of SolidStart, turn the frontend into a pure SPA, and
    rewrite the backend in Rust (seriously: so I can use `rusty_v8` for
    plugins).
  - Why not fixing it now: no time.
- [ ] The build product of plugins are unnecessarily large.
  - Solution: externalize common dependencies for plugins (maybe with
    `importmap`).
  - Why not fixing it now: laziness. It is not a too big deal for now anyways.

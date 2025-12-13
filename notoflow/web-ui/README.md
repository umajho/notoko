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

# Page block

A simple extension that allows you to set a list of websites which you can only visit x times in an interval.
You can chose a hourly or daily interval, when the limit is reached within that interval the tab will automatically close.

## How to build a new version

Install  dependencies (npm)

> npm install

To build the extension output files.

> npm run build

Build the final package

> cd dist && web-ext build

Upload the zip from dist/web-ext-artifacts

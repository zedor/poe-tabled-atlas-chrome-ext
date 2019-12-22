# poe-tabled-atlas-chrome-ext
Companion extension for poe-tabled-atlas

PoE Tabled Atlas: https://zedor.github.io/poe-tabled-atlas/

Alternative AHK script for data grabbing: https://github.com/zedor/poe-map-grabber

## How to use

1. Grab the unpacked (.zip) extension and load it in your chrome with [developer mode enabled](https://developers.chrome.com/extensions/faq#faq-dev-01), or grab the .crx file and drag it to chrome.
2. Navigate to [PoE Tabled Atlas](https://zedor.github.io/poe-tabled-atlas/), input account name, select desired tiers and finally click *Query* to start the grabbing process.
3. Data is shown on the site, along with an export action (JSON stringified object) for any other possible uses of the data.

## Want to utilize the extension in your own project?

I wouldn't necessarily recommend it, it's a pretty hackish solution that exists only until [GGG](http://www.grindinggear.com/) get their shit together and start paying all the technical and design debt they incurred. Consider the alternative [AHK script](https://github.com/zedor/poe-map-grabber), or querying the trade api directly with the river. However, if you're still hell bent on it, here's how:

* Study the extension_example.js on how to implement extension requests (one-way communication because I wasted 5 hours of my life since even google doesn't have their shit together)
* Look at the examplequery.json for the object construction of the query data
* Add your deployment server (localhost or otherwise) to the ```"matches"``` prop of ```manifest.json``` for development purposes
* Contact the developer on [reddit](https://www.reddit.com/user/SelenaGomez_/) or [PoE Discord](https://discord.gg/pathofexile) (@saltylena gomez) to release new ```manifest.json```


## DISCLAIMER

* This extension exists for the sole reason of being unable to grab map stash data via poesession login, because as always something related to poe is fucked sideways but at least we can buy new definitely not overpriced mtx

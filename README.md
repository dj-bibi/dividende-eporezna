# dividende-eporezna

A small browser tool that turns a broker's dividend export into rows for the
Croatian **INO-DOH** form on ePorezna.

You upload your CSV statement; the app lists each dividend and the foreign tax
withheld, converts non-EUR amounts to EUR using HNB middle rates, and writes the
rows into an INO-DOH XML you generated in ePorezna, ready to load back and submit.

Supported brokers: **Trading 212** and **Interactive Brokers**.

## How it works

1. Open a new INO-DOH in ePorezna, fill in your details and the tax year, and
   download it (`Izvezi -> Preuzmi XML`), no rows needed.
2. Export your dividends from your broker as CSV.
3. In this app, drop the CSV in, then import the INO-DOH XML.
4. Export the filled XML, load it back into ePorezna, you can edit it, and submit.

Your statement is parsed locally in the browser. Only currency/date pairs are
sent to the HNB API to look up exchange rates.

## Run locally

Requires Node 22.

```sh
npm install
npm run dev      # start the dev server
npm run build    # type-check and build for production
npm run lint     # run ESLint
```

The dev server proxies HNB exchange-rate requests to `api.hnb.hr`. **This proxy
only exists in development** — a production/GitHub Pages build has no proxy, so
currency conversion will not work as-is when deployed. If you deploy this, you'll
need to call the HNB API directly (verify it allows cross-origin requests) or put
a proxy in front of it.

## ⚠️ Disclaimer

This tool is provided as-is, with no warranty, and is **not tax advice**. Some of
the per-row INO-DOH field names and codes have not been fully verified against the
official Šifarnik and a real filled export. **Always check every generated row and
run `Puna provjera` in ePorezna before submitting.** You are responsible for the
correctness of anything you file.

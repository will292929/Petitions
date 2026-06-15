# Petition Workstation

A local browser app for working through photographed petition sheets and linking each signature line to a voter directory.

## Workflow

1. Open `index.html` in Chrome or Edge.
2. Use **Image Folder** to choose the folder with petition sheet photos.
3. Open **Settings** and load the voter directory CSV.
4. Confirm or adjust the column mapping for first, middle, last, house number, street, city, zip, VoterID Doc, and RNC voter ID.
5. Set the default city, logged-by person, collected-by person, and appended export columns.
6. Return to **Work**, type the line details from the image, and click **Link** on the correct voter result.
7. Use **Saved Links** to load or unlink prior entries.
8. Export saved links as CSV.

## Current Notes

- Petition images can be loaded from a local folder; the app sorts image files and steps through them one at a time with Prev/Next.
- Google Drive shared sources can be loaded from Settings by pasting a Drive image folder link/ID and a Drive voter CSV or Google Sheet link/ID.
- Drive folder image loading requires a Google API key. Restrict that key to the app's domain before using it online.
- The image viewer supports previous/next, rotate, zoom, mouse wheel zoom, and drag-to-pan.
- Rotation and zoom are saved and carry to the next sheet.
- Layout settings let each browser adjust image width, voter match height, saved-link height, and the current-line form width/column wrapping.
- Search results update as you type and are capped at 25.
- Large voter directories are not saved to browser local storage; reload the CSV after refreshing or reopening the app.
- Petition line status defaults to `Signed`, with `Not Qualified` and `Needs Review` available for signatures that should be categorized but did not count.
- Exported CSV rows start with the matched voter's original directory row, then append up to six configurable campaign columns.
- Saved settings include image settings, logged-by, collected-by, source names, and appended export column definitions.
- CSV voter directories are supported now.
- Excel file selection is visible, but true `.xlsx` parsing still needs a bundled parser in the next pass.

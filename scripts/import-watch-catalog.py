"""Import the supplied watch catalog with Python's standard library only.

Usage: python scripts/import-watch-catalog.py path/to/catalog.xlsx [output.json]
The importer preserves source wording and worksheet row numbers. It never edits
the workbook and does not execute formulas or follow links embedded in its cells.
"""

import argparse
import hashlib
import json
from pathlib import Path
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile


MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE = "http://schemas.openxmlformats.org/package/2006/relationships"
NS = {"s": MAIN}


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            strings = ["".join(item.itertext()) if not list(item) else "".join(node.text or "" for node in item.iter(f"{{{MAIN}}}t")) for item in root]
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships.findall(f"{{{PACKAGE}}}Relationship") if item.attrib.get("TargetMode") != "External"}
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        sheets = {}
        for sheet in workbook.findall("s:sheets/s:sheet", NS):
            target = targets[sheet.attrib[f"{{{REL}}}id"]]
            member = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
            root = ET.fromstring(archive.read(member))
            rows = {}
            for row in root.findall("s:sheetData/s:row", NS):
                cells = {}
                for cell in row.findall("s:c", NS):
                    address = cell.attrib["r"]
                    column = re.sub(r"\d+", "", address)
                    kind = cell.attrib.get("t")
                    value = cell.find("s:v", NS)
                    if kind == "inlineStr":
                        text = "".join(node.text or "" for node in cell.findall(".//s:t", NS))
                    elif kind == "s" and value is not None:
                        text = strings[int(value.text)]
                    else:
                        text = value.text if value is not None and value.text is not None else ""
                    if text:
                        cells[column] = text
                if cells:
                    rows[int(row.attrib["r"])] = cells
            sheets[sheet.attrib["name"]] = rows
        return sheets


def import_catalog(source):
    sheets = read_workbook(source)
    catalog = sheets["Catalog"]
    terms_sheet = sheets["Terms and compatibility"]
    header = next(row for row, cells in catalog.items() if cells.get("A") == "Category" and cells.get("C") == "Option")
    entries = []
    for row, cells in catalog.items():
        if row <= header:
            continue
        if not all(cells.get(column) for column in "ABCDE"):
            raise ValueError(f"Catalog row {row} is missing a required field")
        entry = dict(id=f"catalog-{row}", category=cells["A"], subcategory=cells["B"], option=cells["C"], description=cells["D"], availability=cells["E"], sourceRow=row)
        if cells.get("F"):
            entry["notes"] = cells["F"]
        if cells.get("G"):
            entry["sourceUrl"] = cells["G"]
        entries.append(entry)
    terms_header = next(row for row, cells in terms_sheet.items() if cells.get("A") == "Term / relationship")
    terms = [dict(term=cells["A"], meaning=cells["B"], sourceRow=row) for row, cells in terms_sheet.items() if row > terms_header and cells.get("A") and cells.get("B")]
    expected_count = next(int(cells["B"]) for cells in catalog.values() if cells.get("A") == "Catalog entries")
    if len(entries) != expected_count:
        raise ValueError(f"Expected {expected_count} entries, found {len(entries)}")
    return {
        "version": 1,
        "source": {
            "filename": source.name,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "catalogSheet": "Catalog",
            "termsSheet": "Terms and compatibility",
            "headerRow": header,
            "firstRow": entries[0]["sourceRow"],
            "lastRow": entries[-1]["sourceRow"],
            "entryCount": len(entries),
            "categoryCount": len({entry["category"] for entry in entries}),
            "termCount": len(terms),
        },
        "entries": entries,
        "terms": terms,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", nargs="?", type=Path, default=Path(__file__).resolve().parents[1] / "src/lib/watch-catalog-data.json")
    args = parser.parse_args()
    data = import_catalog(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Imported {data['source']['entryCount']} entries and {data['source']['termCount']} terms.")

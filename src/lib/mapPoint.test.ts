import { describe, expect, it } from "vitest";
import { isShortMapLink, mapsLink, osmEmbedUrl, parseMapPoint } from "./mapPoint";

const KULSARY = { lat: 46.9621483, lng: 54.0129176 };

describe("reading the map point staff paste", () => {
  it("takes coordinates typed as text, latitude first", () => {
    expect(parseMapPoint("46.9621483, 54.0129176")).toEqual(KULSARY);
    expect(parseMapPoint(" 46.9621483 54.0129176 ")).toEqual(KULSARY);
  });

  it("takes the pin of a Google Maps place, not the view centre", () => {
    expect(
      parseMapPoint(
        "https://www.google.com/maps/place/Dom+Kul'tury/@46.95,54.00,15z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d46.9621483!4d54.0129176"
      )
    ).toEqual(KULSARY);
    expect(parseMapPoint("https://www.google.com/maps/@46.9621483,54.0129176,17z")).toEqual(KULSARY);
    expect(parseMapPoint("https://maps.google.com/?q=46.9621483,54.0129176")).toEqual(KULSARY);
  });

  it("reads 2GIS and Yandex links, which put longitude first", () => {
    expect(parseMapPoint("https://2gis.kz/atyrau/geo/70000001234567/54.0129176,46.9621483")).toEqual(KULSARY);
    expect(parseMapPoint("https://2gis.kz/atyrau?m=54.0129176%2C46.9621483%2F17")).toEqual(KULSARY);
    expect(parseMapPoint("https://yandex.kz/maps/?ll=54.0129176%2C46.9621483&z=17")).toEqual(KULSARY);
    expect(parseMapPoint("https://yandex.kz/maps/?ll=1%2C1&pt=54.0129176,46.9621483&z=17")).toEqual(KULSARY);
  });

  it("reads OpenStreetMap links", () => {
    expect(parseMapPoint("https://www.openstreetmap.org/?mlat=46.9621483&mlon=54.0129176#map=17/46.9/54.0")).toEqual(KULSARY);
    expect(parseMapPoint("https://www.openstreetmap.org/#map=17/46.9621483/54.0129176")).toEqual(KULSARY);
  });

  it("refuses what holds no point", () => {
    expect(parseMapPoint("")).toBeNull();
    expect(parseMapPoint("Кульсары, Махамбет 37")).toBeNull();
    expect(parseMapPoint("https://example.com/?q=46.9,54.0")).toBeNull();
    expect(parseMapPoint("146.9, 54.0")).toBeNull();
    expect(parseMapPoint("https://maps.app.goo.gl/AbCdEf123")).toBeNull();
  });

  it("knows which short links must be opened first", () => {
    expect(isShortMapLink("https://maps.app.goo.gl/AbCdEf123")).toBe(true);
    expect(isShortMapLink("https://go.2gis.com/abcd")).toBe(true);
    expect(isShortMapLink("https://yandex.kz/maps/-/CDuXyZ")).toBe(true);
    expect(isShortMapLink("https://www.google.com/maps/@46.96,54.01,17z")).toBe(false);
    expect(isShortMapLink("https://example.com/x")).toBe(false);
  });
});

describe("showing the point", () => {
  it("frames the OpenStreetMap embed around it", () => {
    expect(osmEmbedUrl(KULSARY)).toBe(
      "https://www.openstreetmap.org/export/embed.html?bbox=53.9929,46.9501,54.0329,46.9741&layer=mapnik&marker=46.9621483,54.0129176"
    );
  });

  it("links to Google Maps on the point, or on the address without one", () => {
    expect(mapsLink(KULSARY, "x")).toBe("https://www.google.com/maps/search/?api=1&query=46.9621483,54.0129176");
    expect(mapsLink(null, "Кульсары")).toBe(
      "https://www.google.com/maps/search/?api=1&query=%D0%9A%D1%83%D0%BB%D1%8C%D1%81%D0%B0%D1%80%D1%8B"
    );
    expect(mapsLink(null, null)).toBeNull();
  });
});

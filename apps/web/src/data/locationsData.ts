import type { LocationHierarchy } from "../domain/types";

export const LOCATIONS: LocationHierarchy = {
  nationalCommunity: "National Community",
  cities: [
    {
      id: "city-london",
      name: "London",
      areas: [
        { id: "area-westminster", name: "Westminster" },
        { id: "area-camden", name: "Camden" },
        { id: "area-hackney", name: "Hackney" },
      ],
    },
    {
      id: "city-birmingham",
      name: "Birmingham",
      areas: [
        { id: "area-city-centre", name: "Birmingham City Centre" },
        { id: "area-edgbaston", name: "Edgbaston" },
        { id: "area-selly-oak", name: "Selly Oak" },
      ],
    },
    {
      id: "city-manchester",
      name: "Manchester",
      areas: [
        { id: "area-mcr-centre", name: "City Centre" },
        { id: "area-salford", name: "Salford" },
        { id: "area-didsbury", name: "Didsbury" },
      ],
    },
  ],
};

export const CITY_NAMES = LOCATIONS.cities.map((city) => city.name);

export function areasOf(cityName: string): string[] {
  return LOCATIONS.cities.find((city) => city.name === cityName)?.areas.map((area) => area.name) ?? [];
}

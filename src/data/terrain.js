const TERRAIN = Object.freeze({
  grass: {
    id: 0,
    name: "Grass",
    buildable: true,
    passable: true,
    color: "#557748",
  },
  sand: {
    id: 1,
    name: "Sand",
    buildable: true,
    passable: true,
    color: "#d7bd7c",
  },
  gravel: {
    id: 2,
    name: "Gravel",
    buildable: true,
    passable: true,
    color: "#8c8174",
  },
  stone: {
    id: 3,
    name: "Stone",
    buildable: true,
    passable: true,
    color: "#626975",
  },
  hill: {
    id: 4,
    name: "Hills",
    buildable: false,
    passable: false,
    color: "#8b806f",
  },
  mountain: {
    id: 5,
    name: "Mountains",
    buildable: false,
    passable: false,
    color: "#424956",
  },
  water: {
    id: 6,
    name: "Water",
    buildable: false,
    passable: false,
    color: "#3979b4",
  },
  road: {
    id: 7,
    name: "Road",
    buildable: false,
    passable: true,
    color: "#303537",
  },
});
const TERRAIN_NAMES = Object.keys(TERRAIN),
  CARDINAL = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
export { TERRAIN, TERRAIN_NAMES, CARDINAL };
